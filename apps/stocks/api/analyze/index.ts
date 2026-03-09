/**
 * Stock Analysis Endpoint
 *
 * Main serverless function that orchestrates the complete stock analysis workflow:
 * 1. Fetch data from FMP (technical + fundamental)
 * 2. Fetch data from FRED (macroeconomic)
 * 3. Calculate scores (composite, technical, fundamental, macro, risk, sentiment)
 * 4. Sync results to Notion Stock Analyses database
 * 5. Query historical analyses and compute deltas
 * 6. Generate AI analysis using LLM (Gemini/Claude/OpenAI)
 * 7. Write analysis to 3 Notion locations:
 *    - Stock Analyses database row
 *    - Child analysis page (dated)
 *    - Stock History database (archived)
 *
 * v1.0.3 - Timezone Support (Multi-timezone rate limiting and timestamp formatting)
 * v1.0.2 - LLM Integration (Gemini Flash 2.5)
 * v1.0 - Vercel Serverless + TypeScript
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';
import { createStockScorer } from '../../lib/domain/analysis/scoring';
import { createNotionClient, AnalysisData } from '../../lib/integrations/notion/client';
import { requireAuth as requireAuthSession, getUserByEmail, safeDecryptToken, incrementUserAnalyses, updateSetupProgress, getSetupProgress } from '../../lib/core/auth';
import { validateStockData, validateTicker } from '../../lib/core/validators';
import { createTimer, logAnalysisStart, logAnalysisComplete, logAnalysisFailed } from '../../lib/core/logger';
import { formatErrorResponse, formatErrorForNotion, withRetry } from '../../lib/core/utils';
import { getErrorCode, getStatusCode, RateLimitError } from '../../lib/core/errors';
import { RateLimiter } from '../../lib/core/rate-limiter';
import { LLMFactory } from '../../lib/integrations/llm/factory';
import { AnalysisContext, StockEvent } from '../../lib/integrations/llm/types';
import { validateTimezone, getTimezoneFromEnv, getSecondsUntilMidnight } from '../../lib/shared/timezone';
import { assertDatabasesValid } from '../../lib/shared/database-validator';
import { reportAPIError } from '../../lib/shared/bug-reporter';
import { getMarketContext, MarketContext } from '../../lib/domain/market/index'; // v1.1.0: Market context
import { calculateDeltas } from '../../lib/domain/analysis/deltas'; // v1.0.8: Delta-first analysis

interface AnalyzeRequest {
  ticker: string;
  userId?: string; // User ID for rate limiting (required for rate limiting)
  timezone?: string; // User's IANA timezone (e.g., "America/Los_Angeles") - v1.0.3
  usePollingWorkflow?: boolean; // Default: true (v0.3.0 workflow)
  timeout?: number; // Polling timeout in seconds (default: 600 = 10 minutes)
  pollInterval?: number; // Poll interval in seconds (default: 10)
  skipPolling?: boolean; // Skip polling entirely (default: false)
}

interface AnalyzeResponse {
  success: boolean;
  ticker: string;
  analysesPageId: string | null;
  historyPageId: string | null;
  childAnalysisPageId?: string | null;
  sageStocksPageId?: string | null; // v1.2.4: User's Sage Stocks workspace page
  scores?: {
    composite: number;
    technical: number;
    fundamental: number;
    macro: number;
    risk: number;
    sentiment: number;
    marketAlignment: number; // v1.1.0: Market alignment scoring
    recommendation: string;
  };
  dataQuality?: {
    completeness: number;
    grade: string;
    confidence: string;
  };
  performance?: {
    duration: number;
    fmpCalls: number;
    fredCalls: number;
    notionCalls: number;
  };
  llmMetadata?: {
    provider: string;
    model: string;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    latencyMs: number;
  };
  workflow?: {
    pollingCompleted: boolean;
    archived: boolean;
    status: string;
  };
  rateLimit?: {
    remaining: number;
    total: number;
    resetAt: string;
    bypassed?: boolean;
  };
  analysisContent?: string; // v1.2.18: Return generated analysis text for preview
  error?: string;
  details?: string;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Data source cache for Notion API v2025-09-03
 */
const dataSourceCache = new Map<string, string>();

/**
 * Get data source ID from database ID (cached)
 */
async function getDataSourceId(notion: Client, databaseId: string): Promise<string> {
  if (dataSourceCache.has(databaseId)) {
    return dataSourceCache.get(databaseId)!;
  }

  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = (db as any).data_sources?.[0]?.id;

  if (!dataSourceId) {
    throw new Error(`No data source found for database ${databaseId}`);
  }

  dataSourceCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

/**
 * Query upcoming stock events for event-aware analysis (v1.2.17)
 *
 * @param accessToken User's OAuth access token
 * @param stockEventsDbId Stock Events database ID
 * @param stockAnalysisPageId Stock Analyses page ID (for relation filter)
 * @param daysAhead Number of days to look ahead (default 30)
 * @returns Array of upcoming events, or empty array if none found
 */
async function queryUpcomingEvents(
  accessToken: string,
  stockEventsDbId: string | undefined,
  stockAnalysisPageId: string,
  daysAhead: number = 30
): Promise<StockEvent[]> {
  // Graceful degradation if Stock Events DB not configured
  if (!stockEventsDbId) {
    console.log('ℹ️  Stock Events DB not configured - skipping event query');
    return [];
  }

  try {
    const notion = new Client({ auth: accessToken, notionVersion: '2025-09-03' });
    const dataSourceId = await getDataSourceId(notion, stockEventsDbId);

    // Calculate date range
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        and: [
          {
            property: 'Stock',
            relation: {
              contains: stockAnalysisPageId,
            },
          },
          {
            property: 'Event Date',
            date: {
              on_or_after: today.toISOString().split('T')[0],
            },
          },
          {
            property: 'Event Date',
            date: {
              on_or_before: endDate.toISOString().split('T')[0],
            },
          },
        ],
      },
      sorts: [
        {
          property: 'Event Date',
          direction: 'ascending',
        },
      ],
    });

    // Transform Notion results to StockEvent[]
    const events: StockEvent[] = response.results.map((page: any) => {
      const props = page.properties;
      return {
        eventType: props['Event Type']?.select?.name || 'Unknown',
        eventDate: props['Event Date']?.date?.start || '',
        description: props.Description?.rich_text?.[0]?.plain_text || '',
        confidence: props.Confidence?.select?.name || 'Medium',
        impactPotential: props['Impact Potential']?.select?.name,
        epsEstimate: props['EPS Estimate']?.number,
        dividendAmount: props['Dividend Amount']?.number,
        fiscalQuarter: props['Fiscal Quarter']?.rich_text?.[0]?.plain_text,
        fiscalYear: props['Fiscal Year']?.number,
      };
    });

    console.log(`✅ Found ${events.length} upcoming events (next ${daysAhead} days)`);
    return events;
  } catch (error) {
    console.warn('⚠️  Failed to query upcoming events:', error);
    return []; // Graceful degradation - analysis continues without events
  }
}

/**
 * Main analysis handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      details: 'Only POST requests are accepted',
    });
    return;
  }

  // Check authentication - require valid session
  const session = await requireAuthSession(req, res);
  if (!session) {
    return; // requireAuthSession already sent error response
  }

  const timer = createTimer('Stock Analysis');
  let ticker: string | undefined;
  let analysesPageId: string | null = null;
  let rateLimitResult: any = null;
  let user: any = null; // User data from database
  let userAccessToken: string | null = null; // User's decrypted OAuth token

  try {
    // Get user data and decrypt their OAuth token (with retry logic for Notion API outages)
    user = await withRetry(
      async () => {
        const userData = await getUserByEmail(session.email);
        if (!userData) {
          throw new Error('USER_NOT_FOUND_IN_DATABASE');
        }
        return userData;
      },
      'getUserByEmail for analysis',
      { maxAttempts: 3, initialDelayMs: 2000, maxDelayMs: 10000 }
    );

    // Check if user is approved
    if (user.status !== 'approved') {
      res.status(403).json({
        success: false,
        error: 'Account not approved',
        details: 'Your account is pending approval or has been denied. Please contact support.',
      });
      return;
    }

    // Decrypt user's OAuth access token
    try {
      userAccessToken = await safeDecryptToken(user.accessToken, {
        userId: user.id,
        email: user.email,
      });
    } catch (decryptError) {
      res.status(401).json({
        success: false,
        error: 'Authentication token invalid',
        details: 'Your authentication token could not be decrypted. Please log out and log back in to re-authenticate with Notion.',
        code: 'TOKEN_DECRYPTION_FAILED',
      });
      return;
    }

    // Parse request body
    const body: AnalyzeRequest =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const {
      ticker: rawTicker,
      timezone: requestTimezone,
      usePollingWorkflow = true,
      timeout = 600,
      pollInterval = 10,
      skipPolling = false,
    } = body;

    // Validate and normalize timezone (v1.0.3)
    // Priority: request timezone > env default
    const userTimezone = validateTimezone(requestTimezone, getTimezoneFromEnv());

    // Use user's Notion page ID for rate limiting
    const extractedUserId = user.id;

    // Check rate limit BEFORE processing analysis (timezone-aware in v1.0.3)
    const rateLimiter = new RateLimiter();
    rateLimitResult = await rateLimiter.checkAndIncrement(extractedUserId, userTimezone);

    if (!rateLimitResult.allowed) {
      throw new RateLimitError(rateLimitResult.resetAt, userTimezone);
    }

    // Validate ticker with custom validator
    if (!rawTicker || typeof rawTicker !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid ticker',
        details: 'Ticker is required and must be a string',
      });
      return;
    }

    ticker = validateTicker(rawTicker); // Throws InvalidTickerError if invalid
    const tickerUpper = ticker.toUpperCase().trim();

    // Log analysis start with structured logging
    logAnalysisStart(tickerUpper, {
      workflow: usePollingWorkflow ? 'v0.3.0 (polling)' : 'v0.2.9 (immediate)',
      timeout,
      pollInterval,
      skipPolling,
    });

    console.log('='.repeat(60));
    console.log(`Starting analysis for ${tickerUpper}`);
    console.log(`Workflow: ${usePollingWorkflow ? 'v0.3.0 (polling)' : 'v0.2.9 (immediate)'}`);
    console.log('='.repeat(60));

    // Initialize API clients
    const fmpApiKey = process.env.FMP_API_KEY;
    const fredApiKey = process.env.FRED_API_KEY;

    // Use user-specific database IDs from their setup (v1.2.0+)
    const stockAnalysesDbId = user.stockAnalysesDbId;
    const stockHistoryDbId = user.stockHistoryDbId;

    // Validate environment variables
    if (!fmpApiKey) {
      throw new Error('FMP_API_KEY environment variable is not set');
    }
    if (!fredApiKey) {
      throw new Error('FRED_API_KEY environment variable is not set');
    }

    // Validate user-specific database IDs (CRITICAL: blocks analysis if setup incomplete)
    const missingDatabases = [];
    if (!stockAnalysesDbId) missingDatabases.push('Stock Analyses');
    if (!stockHistoryDbId) missingDatabases.push('Stock History');

    if (missingDatabases.length > 0) {
      const errorMessage = `Setup incomplete: ${missingDatabases.join(', ')} database${missingDatabases.length > 1 ? 's' : ''} not configured. Please complete setup at https://stocks.shalomormsby.com/`;

      console.error('❌ Database configuration validation failed:', {
        userId: user.id,
        email: session.email,
        missingDatabases,
        stockAnalysesDbId: stockAnalysesDbId || 'MISSING',
        stockHistoryDbId: stockHistoryDbId || 'MISSING',
        sageStocksPageId: user.sageStocksPageId || 'MISSING',
      });

      // Return structured error response
      res.status(400).json({
        success: false,
        error: 'SETUP_INCOMPLETE',
        message: errorMessage,
        details: {
          missingDatabases,
          setupRequired: true,
          setupUrl: 'https://stocks.shalomormsby.com/',
        }
      });
      return;
    }

    // CRITICAL: Validate database access before starting analysis (v1.2.1)
    // This catches database ID mismatches and reports them to Bug Reports database
    console.log('🔍 Validating database configuration...');
    try {
      await assertDatabasesValid(userAccessToken, {
        stockAnalysesDbId,
        stockHistoryDbId,
        marketContextDbId: user.marketContextDbId || '',
        stockEventsDbId: user.stockEventsDbId || '',
        sageStocksPageId: user.sageStocksPageId || '',
        userEmail: session.email,
        userId: user.id,
      });
      console.log('✅ Database validation passed');
    } catch (validationError: any) {
      console.error('❌ Database validation failed:', validationError.message);

      // Report to Bug Reports database
      await reportAPIError(
        validationError,
        '/api/analyze',
        session.email
      );

      throw validationError; // Re-throw to trigger error response
    }

    const fmpClient = createFMPClient(fmpApiKey);
    const fredClient = createFREDClient(fredApiKey);
    const scorer = createStockScorer();

    // Fetch market context (v1.1.0 - Market Context Integration)
    console.log('\n📊 Step 0: Fetching market context...');
    let marketContext: MarketContext | null = null;
    try {
      marketContext = await getMarketContext(fmpClient, fredClient);

      if (marketContext && marketContext.regime) {
        console.log('✅ Market context fetched');
        console.log(`   Regime: ${marketContext.regime} (${Math.round(marketContext.regimeConfidence * 100)}% confidence)`);
        console.log(`   Risk: ${marketContext.riskAssessment} | VIX: ${marketContext.vix.toFixed(1)}`);
        console.log(`   SPY: ${marketContext.spy.change1D > 0 ? '+' : ''}${marketContext.spy.change1D.toFixed(2)}% (1D)`);
      } else {
        console.warn('⚠️  Market context unavailable - continuing without market context');
        marketContext = null;
      }
    } catch (error) {
      console.error('❌ Failed to fetch market context:', error);
      console.warn('   Continuing with null market context (graceful degradation)');
      marketContext = null;
    }

    // Use user's OAuth token, Notion User ID, and timezone (v1.0.3)
    const notionClient = createNotionClient({
      apiKey: userAccessToken, // User's OAuth token
      stockAnalysesDbId,
      stockHistoryDbId,
      userId: user.notionUserId, // User's Notion User ID
      timezone: userTimezone, // User's timezone for timestamp formatting
    });

    // Track API calls
    let fmpCalls = 0;
    let fredCalls = 0;
    let notionCalls = 0;

    console.log('\n📊 Step 1/5: Fetching stock data...');

    // Fetch data in parallel (FMP + FRED)
    const [fmpData, macroData] = await Promise.all([
      (async () => {
        const data = await fmpClient.getAnalysisData(tickerUpper);
        fmpCalls = 11; // getAnalysisData makes 11 calls
        return data;
      })(),
      (async () => {
        const data = await fredClient.getMacroData();
        fredCalls = 6; // getMacroData makes 6 calls
        return data;
      })(),
    ]);

    console.log('✅ Data fetched successfully');
    console.log(
      `   FMP: ${fmpCalls} calls | FRED: ${fredCalls} calls | Total: ${fmpCalls + fredCalls} calls`
    );

    // Calculate historical price changes and volatility from fetched data
    let price_change_1m: number | undefined = undefined;
    let price_change_5d: number | undefined = undefined;
    let volatility_30d: number | undefined = undefined;

    if (fmpData.historical && fmpData.historical.length > 0) {
      const currentPrice = fmpData.quote.price;

      // Calculate 1-month (30-day) price change
      // Look for data point closest to 30 days ago (index 29, or last available)
      const targetIndex1m = Math.min(29, fmpData.historical.length - 1);
      const price30dAgo = fmpData.historical[targetIndex1m]?.close;

      if (price30dAgo && price30dAgo > 0) {
        price_change_1m = (currentPrice - price30dAgo) / price30dAgo;
        console.log(
          `   📊 1M Price Change: ${price_change_1m > 0 ? '+' : ''}${(price_change_1m * 100).toFixed(2)}% (${price30dAgo.toFixed(2)} → ${currentPrice.toFixed(2)})`
        );
      }

      // Calculate 5-day price change
      const targetIndex5d = Math.min(4, fmpData.historical.length - 1);
      const price5dAgo = fmpData.historical[targetIndex5d]?.close;

      if (price5dAgo && price5dAgo > 0) {
        price_change_5d = (currentPrice - price5dAgo) / price5dAgo;
        console.log(
          `   📊 5D Price Change: ${price_change_5d > 0 ? '+' : ''}${(price_change_5d * 100).toFixed(2)}% (${price5dAgo.toFixed(2)} → ${currentPrice.toFixed(2)})`
        );
      }

      // Calculate 30-day volatility (standard deviation of daily returns)
      // Requires at least 30 days of data for accurate calculation
      if (fmpData.historical.length >= 30) {
        const dailyReturns: number[] = [];

        // Calculate daily returns for the past 30 days
        for (let i = 0; i < 29; i++) {
          const currentClose = fmpData.historical[i].close;
          const previousClose = fmpData.historical[i + 1].close;

          if (currentClose > 0 && previousClose > 0) {
            const dailyReturn = (currentClose - previousClose) / previousClose;
            dailyReturns.push(dailyReturn);
          }
        }

        // Calculate standard deviation (volatility)
        if (dailyReturns.length >= 20) {
          // Need at least 20 valid returns for meaningful calculation
          const mean = dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
          const squaredDiffs = dailyReturns.map(val => Math.pow(val - mean, 2));
          const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
          volatility_30d = Math.sqrt(variance);

          console.log(
            `   📊 30D Volatility: ${(volatility_30d * 100).toFixed(2)}% std dev (${dailyReturns.length} days)`
          );
        } else {
          console.warn(`⚠️  Insufficient valid returns for volatility calculation (${dailyReturns.length} < 20)`);
        }
      } else {
        console.warn(`⚠️  Insufficient historical data for volatility calculation (${fmpData.historical.length} < 30 days)`);
      }
    } else {
      console.warn('⚠️  No historical data available for price change and volatility calculations');
    }

    // Extract data for scoring
    const technical = {
      current_price: fmpData.quote.price,
      ma_50: fmpData.technicalIndicators.sma50[0]?.sma,
      ma_200: fmpData.technicalIndicators.sma200[0]?.sma,
      rsi: fmpData.technicalIndicators.rsi[0]?.rsi,
      macd: fmpData.technicalIndicators.ema12[0]?.ema, // Simplified - real MACD needs calculation
      macd_signal: fmpData.technicalIndicators.ema26[0]?.ema,
      volume: fmpData.quote.volume,
      avg_volume_20d: fmpData.quote.avgVolume,
      volatility_30d, // Calculated from historical data
      price_change_1d: fmpData.quote.change / fmpData.quote.previousClose,
      price_change_5d, // Calculated from historical data
      price_change_1m, // Calculated from historical data
      week_52_high: fmpData.quote.yearHigh,
      week_52_low: fmpData.quote.yearLow,
    };

    const fundamental = {
      company_name: fmpData.profile.companyName,
      market_cap: fmpData.quote.marketCap || fmpData.profile.marketCap,
      pe_ratio: fmpData.fundamentals.ratios[0]?.priceEarningsRatio || fmpData.fundamentals.ratios[0]?.priceToEarningsRatio,
      eps: fmpData.fundamentals.incomeStatements[0]?.eps,
      revenue_ttm: fmpData.fundamentals.incomeStatements[0]?.revenue,
      debt_to_equity: fmpData.fundamentals.ratios[0]?.debtEquityRatio || fmpData.fundamentals.ratios[0]?.debtToEquity,
      beta: fmpData.profile.beta,
    };

    const macro = {
      fed_funds_rate: macroData.fedFundsRate || undefined,
      unemployment: macroData.unemploymentRate || undefined,
      consumer_sentiment: macroData.consumerSentiment || undefined,
      yield_curve_spread: macroData.yieldCurveSpread || undefined,
      vix: macroData.vix || undefined,
      gdp: macroData.gdp || undefined,
    };

    // Validate data quality before scoring
    const qualityReport = validateStockData({
      technical,
      fundamental,
      macro,
    });

    console.log('\n📊 Data Quality Report:');
    console.log(`   Completeness: ${Math.round(qualityReport.dataCompleteness * 100)}%`);
    console.log(`   Grade: ${qualityReport.grade}`);
    console.log(`   Confidence: ${qualityReport.confidence}`);
    console.log(`   Can Proceed: ${qualityReport.canProceed ? 'Yes' : 'No'}`);
    if (qualityReport.missingFields.length > 0) {
      console.log(`   Missing Fields: ${qualityReport.missingFields.join(', ')}`);
    }

    // Log data quality issues (don't fail, just warn)
    if (!qualityReport.canProceed) {
      console.warn(
        `⚠️  Data quality below minimum threshold (${Math.round(qualityReport.dataCompleteness * 100)}% < 40%)`
      );
      console.warn('   Proceeding with analysis but scores may be unreliable');
    }

    console.log('\n📊 Step 2/5: Calculating scores...');

    // Calculate scores with market context (v1.1.0)
    const stockSector = fmpData.profile?.sector;
    const scores = scorer.calculateScores(
      {
        technical,
        fundamental,
        macro,
      },
      marketContext,
      stockSector
    );

    console.log('✅ Scores calculated');
    console.log(`   Composite: ${scores.composite} | ${scores.recommendation}`);
    console.log(
      `   Technical: ${scores.technical} | Fundamental: ${scores.fundamental} | Macro: ${scores.macro}`
    );
    console.log(`   Risk: ${scores.risk} | Sentiment: ${scores.sentiment}`);

    console.log('\n📊 Step 3/5: Syncing to Notion...');

    // Prepare analysis data for Notion
    const analysisData: AnalysisData = {
      ticker: tickerUpper,
      companyName: fmpData.profile.companyName,
      timestamp: new Date(),
      technical,
      fundamental,
      macro,
      scores,
      apiCalls: {
        fmp: fmpCalls,
        fred: fredCalls,
        total: fmpCalls + fredCalls,
      },
    };

    // Sync to Notion
    const syncResult = await notionClient.syncToNotion(
      analysisData,
      usePollingWorkflow
    );

    analysesPageId = syncResult.analysesPageId; // Store for error handling
    const historyPageId = syncResult.historyPageId;

    notionCalls += 2; // syncToNotion makes at least 2 calls (find + upsert)

    if (!analysesPageId) {
      throw new Error('Failed to sync to Notion Stock Analyses database');
    }

    console.log('✅ Synced to Notion');
    console.log(`   Stock Analyses page ID: ${analysesPageId}`);
    if (historyPageId) {
      console.log(`   Stock History page ID: ${historyPageId}`);
    }

    // Set Content Status to "Analyzing" (triggers Notion automation)
    console.log('\n📊 Setting Content Status: Analyzing...');
    await notionClient.updateContentStatus(analysesPageId, 'Analyzing');
    notionCalls += 1;

    // LLM Analysis Workflow (v1.0.2)
    console.log('\n📊 Step 4/7: Querying historical analyses...');

    let historicalAnalyses: any[] = [];
    let previousAnalysis: any = null;
    let deltas: any = null;

    try {
      // v1.0.8: Query 90 days of history (was 5 analyses)
      historicalAnalyses = await notionClient.queryHistoricalAnalyses(tickerUpper, 90);
      notionCalls += 1;

      if (historicalAnalyses.length > 0) {
        previousAnalysis = historicalAnalyses[0];

        // v1.0.8: Use unified delta module instead of inline calculation
        const currentMetrics = {
          compositeScore: scores.composite,
          recommendation: scores.recommendation,
          technicalScore: scores.technical,
          fundamentalScore: scores.fundamental,
          macroScore: scores.macro,
          riskScore: scores.risk,
          sentimentScore: scores.sentiment,
          marketAlignment: scores.marketAlignment || 3.0,
          price: fmpData.quote.price,
          volume: fmpData.quote.volume,
        };

        deltas = calculateDeltas(
          currentMetrics,
          previousAnalysis,
          marketContext, // Current market context
          previousAnalysis.marketRegime // Previous regime for transition detection
        );

        console.log(`✅ Found ${historicalAnalyses.length} historical analyses (90 days)`);
        console.log(`   Previous: ${previousAnalysis.compositeScore}/5.0 (${previousAnalysis.date})`);
        console.log(`   Score Change: ${deltas.trendEmoji} ${deltas.scoreChange > 0 ? '+' : ''}${deltas.scoreChange.toFixed(2)} (${deltas.significance}, ${deltas.trendDirection})`);
        console.log(`   Price Change: ${deltas.priceDeltas.priceChangePercent > 0 ? '+' : ''}${deltas.priceDeltas.priceChangePercent.toFixed(2)}% over ${deltas.daysElapsed} days`);
        if (deltas.regimeTransition?.occurred) {
          console.log(`   🔥 Regime Transition: ${deltas.regimeTransition.from} → ${deltas.regimeTransition.to}`);
        }
        if (deltas.categoryDeltas) {
          console.log(`   Category Deltas: Tech ${deltas.categoryDeltas.technical > 0 ? '+' : ''}${deltas.categoryDeltas.technical.toFixed(2)} | Fund ${deltas.categoryDeltas.fundamental > 0 ? '+' : ''}${deltas.categoryDeltas.fundamental.toFixed(2)} | Macro ${deltas.categoryDeltas.macro > 0 ? '+' : ''}${deltas.categoryDeltas.macro.toFixed(2)}`);
        }
      } else {
        console.log('ℹ️  No historical analyses found (first analysis for this ticker)');
      }
    } catch (error) {
      console.warn('⚠️  Failed to query historical analyses:', error);
      // Continue without historical context
    }

    // v1.2.17: Query upcoming events for event-aware analysis
    console.log('\n📊 Step 4.5/7: Querying upcoming events...');
    const upcomingEvents = await queryUpcomingEvents(
      userAccessToken,
      user.stockEventsDbId,
      analysesPageId,
      30 // Next 30 days
    );

    if (upcomingEvents.length > 0) {
      console.log(`   Found ${upcomingEvents.length} upcoming event(s):`);
      upcomingEvents.forEach(event => {
        const daysUntil = Math.round(
          (new Date(event.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   - ${event.eventType}: ${event.eventDate} (in ${daysUntil} days)`);
      });
    } else {
      console.log('   No upcoming events in next 30 days');
    }

    console.log('\n📊 Step 5/7: Generating LLM analysis...');

    // Build AnalysisContext for LLM (v1.0.6 - Expanded to include ALL API data)
    const analysisContext: AnalysisContext = {
      ticker: tickerUpper,
      currentDate: new Date().toISOString().split('T')[0], // e.g., "2025-11-16"
      // Only include marketContext if it has valid regime data (v1.1.0)
      marketContext: (marketContext && marketContext.regime) ? marketContext : undefined,
      currentMetrics: {
        // Scores
        compositeScore: scores.composite,
        technicalScore: scores.technical,
        fundamentalScore: scores.fundamental,
        macroScore: scores.macro,
        riskScore: scores.risk,
        sentimentScore: scores.sentiment,
        sectorScore: 0, // TODO: Add sector scoring in future
        recommendation: scores.recommendation,
        pattern: 'Unknown', // TODO: Add pattern detection in future
        confidence: qualityReport.dataCompleteness * 5, // Convert 0-1 to 0-5 scale
        dataQualityGrade: qualityReport.grade,

        // Company Profile
        companyName: fundamental.company_name,
        sector: fmpData.profile.sector,
        industry: fmpData.profile.industry,

        // Technical Data (ALL from API)
        currentPrice: technical.current_price,
        ma50: technical.ma_50,
        ma200: technical.ma_200,
        rsi: technical.rsi,
        volume: technical.volume,
        avgVolume: technical.avg_volume_20d,
        volatility30d: technical.volatility_30d,
        priceChange1d: technical.price_change_1d,
        priceChange5d: technical.price_change_5d,
        priceChange1m: technical.price_change_1m,
        week52High: technical.week_52_high,
        week52Low: technical.week_52_low,

        // Fundamental Data (ALL from API)
        marketCap: fundamental.market_cap,
        peRatio: fundamental.pe_ratio,
        eps: fundamental.eps,
        revenueTTM: fundamental.revenue_ttm,
        debtToEquity: fundamental.debt_to_equity,
        beta: fundamental.beta,

        // Macro Data (ALL from API)
        fedFundsRate: macro.fed_funds_rate,
        unemployment: macro.unemployment,
        consumerSentiment: macro.consumer_sentiment,
        yieldCurveSpread: macro.yield_curve_spread,
        vix: macro.vix,
        gdp: macro.gdp,
      },
      previousAnalysis: previousAnalysis ? {
        date: previousAnalysis.date,
        compositeScore: previousAnalysis.compositeScore,
        recommendation: previousAnalysis.recommendation,
        metrics: {
          technicalScore: previousAnalysis.technicalScore,
          fundamentalScore: previousAnalysis.fundamentalScore,
          macroScore: previousAnalysis.macroScore,
        },
      } : undefined,
      historicalAnalyses: historicalAnalyses.map(h => ({
        date: h.date,
        compositeScore: h.compositeScore,
        recommendation: h.recommendation,
      })),
      deltas,
      upcomingEvents: upcomingEvents.length > 0 ? upcomingEvents : undefined, // v1.2.17: Event-aware analysis
    };

    // Generate analysis using LLM
    let llmResult: any;
    let childAnalysisPageId: string | null = null;

    try {
      const llmProvider = LLMFactory.getProviderFromEnv();
      llmResult = await llmProvider.generateAnalysis(analysisContext);

      console.log('✅ LLM analysis generated');
      console.log(`   Provider: ${llmResult.modelUsed}`);
      console.log(`   Tokens: ${llmResult.tokensUsed.input} input + ${llmResult.tokensUsed.output} output = ${llmResult.tokensUsed.input + llmResult.tokensUsed.output} total`);
      console.log(`   Cost: $${llmResult.cost.toFixed(4)}`);
      console.log(`   Latency: ${llmResult.latencyMs}ms`);
    } catch (error) {
      console.error('❌ LLM analysis generation failed:', error);
      throw new Error(`LLM analysis generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('\n📊 Step 6/7: Writing analysis to Notion...');

    const notionWriteStartTime = Date.now();
    let notionWriteDuration = 0;

    try {
      // 1. Write to Stock Analyses page (main database row)
      const writeStartTime = Date.now();
      await notionClient.writeAnalysisContent(analysesPageId, llmResult.content);
      const writeDuration = Date.now() - writeStartTime;
      notionCalls += 1;
      console.log(`✅ Written to Stock Analyses page: ${analysesPageId} (${writeDuration}ms)`);

      // Wait for Notion's backend to settle after modifying parent page structure
      // This prevents conflict_error when creating child pages under the same parent
      // 3 seconds needed for large pages (93+ blocks), scales with block count
      console.log('[Notion] Waiting 3 seconds for backend to settle...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 2. Create child analysis page with dated title (timezone-aware in v1.0.3)
      const now = new Date();
      const analysisDate = now.toLocaleDateString('en-US', {
        timeZone: userTimezone,
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const childStartTime = Date.now();
      childAnalysisPageId = await notionClient.createChildAnalysisPage(
        analysesPageId,
        tickerUpper,
        analysisDate,
        llmResult.content,
        {
          // Additional properties for child page (if needed)
        }
      );
      const childDuration = Date.now() - childStartTime;
      notionCalls += 2; // create page + write content
      console.log(`✅ Created child analysis page: ${childAnalysisPageId} (${childDuration}ms)`);

      notionWriteDuration = Date.now() - notionWriteStartTime;
      console.log(`⏱️  Total Notion write time: ${notionWriteDuration}ms`);

      // Set Content Status to "Complete" (triggers Notion automation)
      console.log('\n📊 Setting Content Status: Complete...');
      await notionClient.updateContentStatus(analysesPageId, 'Complete');
      notionCalls += 1;
    } catch (error) {
      notionWriteDuration = Date.now() - notionWriteStartTime;
      console.error(`❌ Failed to write analysis to Notion after ${notionWriteDuration}ms:`, error);
      throw new Error(`Failed to write analysis to Notion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('\n📊 Step 7/7: Archiving to Stock History...');

    let archived = false;
    let archivedPageId: string | null = null;
    const archiveStartTime = Date.now();

    try {
      // v1.0.8: Archive to Stock History with market regime for pattern recognition
      const currentRegime = marketContext?.regime;
      archivedPageId = await notionClient.archiveToHistory(analysesPageId, currentRegime);
      archived = !!archivedPageId;
      notionCalls += 3; // read + create + update

      if (archived && archivedPageId) {
        // Write LLM content to history page (APPEND mode to preserve full history)
        await notionClient.writeAnalysisContent(archivedPageId, llmResult.content, 'append');
        notionCalls += 1;
        const archiveDuration = Date.now() - archiveStartTime;
        console.log(`✅ Archived to Stock History: ${archivedPageId} (${archiveDuration}ms)`);
        if (currentRegime) {
          console.log(`   Market Regime: ${currentRegime}`);
        }
      } else {
        console.log('⚠️  Archive to Stock History failed');
      }
    } catch (error) {
      const archiveDuration = Date.now() - archiveStartTime;
      console.warn(`⚠️  Failed to archive to Stock History after ${archiveDuration}ms:`, error);
      // Don't fail the entire request just because archiving failed
    }

    const workflowStatus = archived ? 'Completed' : 'Analysis Generated (Archive Failed)';

    const duration = timer.end(true);

    // Log successful completion with structured logging
    logAnalysisComplete(tickerUpper, duration, scores.composite, {
      dataCompleteness: qualityReport.dataCompleteness,
      dataQuality: qualityReport.grade,
      workflow: usePollingWorkflow ? 'polling' : 'immediate',
      archived,
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Analysis complete for ${tickerUpper} in ${duration}ms`);
    console.log('='.repeat(60) + '\n');

    // Return success response
    const response: AnalyzeResponse = {
      success: true,
      ticker: tickerUpper,
      analysesPageId,
      historyPageId: archivedPageId,
      childAnalysisPageId,
      sageStocksPageId: user.sageStocksPageId || null, // v1.2.4: User's Sage Stocks workspace page
      scores: {
        composite: scores.composite,
        technical: scores.technical,
        fundamental: scores.fundamental,
        macro: scores.macro,
        risk: scores.risk,
        sentiment: scores.sentiment,
        marketAlignment: scores.marketAlignment, // v1.1.0: Market alignment
        recommendation: scores.recommendation,
      },
      dataQuality: {
        completeness: Math.round(qualityReport.dataCompleteness * 100) / 100,
        grade: qualityReport.grade,
        confidence: qualityReport.confidence,
      },
      performance: {
        duration,
        fmpCalls,
        fredCalls,
        notionCalls,
      },
      llmMetadata: llmResult ? {
        provider: llmResult.modelUsed.includes('gemini') ? 'Google Gemini' :
                  llmResult.modelUsed.includes('claude') ? 'Anthropic Claude' :
                  llmResult.modelUsed.includes('gpt') ? 'OpenAI' : 'Unknown',
        model: llmResult.modelUsed,
        tokensUsed: {
          input: llmResult.tokensUsed.input,
          output: llmResult.tokensUsed.output,
          total: llmResult.tokensUsed.input + llmResult.tokensUsed.output,
        },
        cost: llmResult.cost,
        latencyMs: llmResult.latencyMs,
      } : undefined,
      workflow: {
        pollingCompleted: false, // Deprecated in v1.0.2
        archived,
        status: workflowStatus,
      },
      rateLimit: rateLimitResult
        ? {
            remaining: rateLimitResult.remaining,
            total: rateLimitResult.total,
            resetAt: rateLimitResult.resetAt.toISOString(),
            bypassed: rateLimitResult.bypassed,
          }
        : undefined,
      analysisContent: llmResult ? llmResult.content : undefined, // v1.2.18: Return content
    };

    // Set rate limit headers
    if (rateLimitResult) {
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      res.setHeader('X-RateLimit-Total', rateLimitResult.total.toString());
      res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());
    }

    // Increment user's analysis counters (non-blocking)
    incrementUserAnalyses(user.id).catch((error) => {
      console.error('Failed to increment user analyses:', error);
      // Don't throw - this is non-critical
    });

    // Update setup progress if this is the first analysis (Step 4/5)
    try {
      const setupProgress = await getSetupProgress(req);

      if (setupProgress && setupProgress.currentStep <= 4) {
        // This is their first analysis - mark Step 4 complete and Step 5 in progress
        await updateSetupProgress(req, {
          currentStep: 5,
          completedSteps: [...new Set([...setupProgress.completedSteps, 4])],
          step4FirstTicker: ticker,
          step5AnalysisUrl: response.analysesPageId
            ? `https://notion.so/${response.analysesPageId.replace(/-/g, '')}`
            : undefined,
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to update setup progress (non-critical):', error);
    }

    res.status(200).json(response);
  } catch (error) {
    // End timer with error
    const duration = timer.endWithError(error as Error);

    console.error('❌ Analysis failed:', error);

    // Log failure with structured logging
    const errorCode = getErrorCode(error);
    if (ticker) {
      logAnalysisFailed(ticker, errorCode, { duration }, error as Error);
    }

    // Report critical errors to Bug Reports database (v1.2.1)
    // Skip rate limit errors (user error, not system error)
    if (!(error instanceof RateLimitError) && user && ticker) {
      reportAPIError(
        error as Error,
        '/api/analyze',
        user.email
      ).catch((reportError) => {
        console.error('Failed to report bug:', reportError);
        // Don't block error response
      });
    }

    // Special handling for rate limit errors (timezone-aware in v1.0.3)
    if (error instanceof RateLimitError) {
      const retryAfter = getSecondsUntilMidnight(error.timezone);

      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', error.resetAt.toISOString());
      res.setHeader('X-RateLimit-Timezone', error.timezone);

      res.status(429).json({
        success: false,
        error: error.userMessage,
        code: error.code,
        resetAt: error.resetAt.toISOString(),
        timezone: error.timezone,
        retryAfter,
      });
      return;
    }

    // Write error to Notion if we have a page ID and user credentials
    if (analysesPageId && ticker && user && userAccessToken && user.stockAnalysesDbId && user.stockHistoryDbId) {
      try {
        const notionClient = createNotionClient({
          apiKey: userAccessToken, // User's OAuth token
          stockAnalysesDbId: user.stockAnalysesDbId,
          stockHistoryDbId: user.stockHistoryDbId,
          userId: user.notionUserId, // User's Notion User ID (dynamic)
        });

        const errorNote = formatErrorForNotion(error, ticker);
        await notionClient.writeErrorToPage(analysesPageId, errorNote);
      } catch (notionError) {
        console.error('❌ Failed to write error to Notion:', notionError);
        // Don't fail the request just because we couldn't write to Notion
      }
    }

    // Format error response with proper status code
    const errorResponse = formatErrorResponse(error, ticker);
    const statusCode = getStatusCode(error);

    res.status(statusCode).json(errorResponse);
  }
}
