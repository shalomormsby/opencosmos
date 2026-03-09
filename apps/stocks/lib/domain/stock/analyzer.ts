/**
 * Stock Analyzer - Pure Analysis Logic
 *
 * Extracted from api/analyze.ts to enable reuse by orchestrator.
 * Contains the core analysis workflow without HTTP/auth concerns.
 *
 * v1.0.5 - Orchestrator Support
 * v1.0.9 - Historical Context Integration (fixes delta-first prompt for cron path)
 */

import { createFMPClient } from '../../integrations/fmp/client';
import { createFREDClient } from '../../integrations/fred/client';
import { createStockScorer, ScoreResults } from '../analysis/scoring';
import { validateStockData } from '../../core/validators';
import { AnalysisContext } from '../../integrations/llm/types';
import { LLMFactory } from '../../integrations/llm/factory';
import { MarketContext } from '../market/index';
import { createNotionClient } from '../../integrations/notion/client';
import { calculateDeltas } from '../analysis/deltas';

export interface AnalysisInput {
  ticker: string;
  userAccessToken: string;
  notionUserId: string;
  timezone: string;
  marketContext?: MarketContext | null; // Optional market context for regime-aware analysis
  stockAnalysesDbId?: string; // Optional - needed for Notion client initialization
  stockHistoryDbId?: string; // Optional - enables historical context querying
}

export interface AnalysisResult {
  success: boolean;
  ticker: string;
  technical: any;
  fundamental: any;
  macro: any;
  scores: ScoreResults;
  dataQuality: {
    completeness: number;
    grade: string;
    confidence: string;
    canProceed: boolean;
    missingFields: string[];
  };
  llmAnalysis: {
    content: string;
    modelUsed: string;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    cost: number;
    latencyMs: number;
  };
  apiCalls: {
    fmp: number;
    fred: number;
    total: number;
  };
  analysisContent?: string; // v1.2.18: Return generated analysis text
  error?: string;
}

/**
 * Core analysis function - Pure business logic
 *
 * This function:
 * 1. Fetches data from FMP + FRED
 * 2. Calculates scores
 * 3. Validates data quality
 * 4. Generates LLM analysis
 * 5. Returns complete analysis result
 *
 * Does NOT:
 * - Write to Notion (caller's responsibility)
 * - Handle rate limiting (caller's responsibility)
 * - Handle authentication (token passed as parameter)
 */
export async function analyzeStockCore(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const { ticker } = input;
  const tickerUpper = ticker.toUpperCase().trim();

  try {
    // Initialize API clients
    const fmpApiKey = process.env.FMP_API_KEY;
    const fredApiKey = process.env.FRED_API_KEY;

    if (!fmpApiKey) {
      throw new Error('FMP_API_KEY environment variable is not set');
    }
    if (!fredApiKey) {
      throw new Error('FRED_API_KEY environment variable is not set');
    }

    const fmpClient = createFMPClient(fmpApiKey);
    const fredClient = createFREDClient(fredApiKey);
    const scorer = createStockScorer();

    // Track API calls
    let fmpCalls = 0;
    let fredCalls = 0;

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

    // Calculate historical price changes and volatility
    let price_change_1m: number | undefined = undefined;
    let price_change_5d: number | undefined = undefined;
    let volatility_30d: number | undefined = undefined;

    if (fmpData.historical && fmpData.historical.length > 0) {
      const currentPrice = fmpData.quote.price;

      // Calculate 1-month (30-day) price change
      const targetIndex1m = Math.min(29, fmpData.historical.length - 1);
      const price30dAgo = fmpData.historical[targetIndex1m]?.close;

      if (price30dAgo && price30dAgo > 0) {
        price_change_1m = (currentPrice - price30dAgo) / price30dAgo;
      }

      // Calculate 5-day price change
      const targetIndex5d = Math.min(4, fmpData.historical.length - 1);
      const price5dAgo = fmpData.historical[targetIndex5d]?.close;

      if (price5dAgo && price5dAgo > 0) {
        price_change_5d = (currentPrice - price5dAgo) / price5dAgo;
      }

      // Calculate 30-day volatility
      if (fmpData.historical.length >= 30) {
        const dailyReturns: number[] = [];

        for (let i = 0; i < 29; i++) {
          const currentClose = fmpData.historical[i].close;
          const previousClose = fmpData.historical[i + 1].close;

          if (currentClose > 0 && previousClose > 0) {
            const dailyReturn = (currentClose - previousClose) / previousClose;
            dailyReturns.push(dailyReturn);
          }
        }

        if (dailyReturns.length >= 20) {
          const mean = dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
          const squaredDiffs = dailyReturns.map(val => Math.pow(val - mean, 2));
          const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
          volatility_30d = Math.sqrt(variance);
        }
      }
    }

    // Extract data for scoring
    const technical = {
      current_price: fmpData.quote.price,
      ma_50: fmpData.technicalIndicators.sma50[0]?.sma,
      ma_200: fmpData.technicalIndicators.sma200[0]?.sma,
      rsi: fmpData.technicalIndicators.rsi[0]?.rsi,
      macd: fmpData.technicalIndicators.ema12[0]?.ema,
      macd_signal: fmpData.technicalIndicators.ema26[0]?.ema,
      volume: fmpData.quote.volume,
      avg_volume_20d: fmpData.quote.avgVolume,
      volatility_30d,
      price_change_1d: fmpData.quote.change / fmpData.quote.previousClose,
      price_change_5d,
      price_change_1m,
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

    // Validate data quality
    const qualityReport = validateStockData({
      technical,
      fundamental,
      macro,
    });

    // Extract sector for market alignment calculation
    const stockSector = fmpData.profile?.sector || undefined;

    // Calculate scores WITH market context
    const scores = scorer.calculateScores(
      {
        technical,
        fundamental,
        macro,
      },
      input.marketContext,
      stockSector
    );

    // Query historical analyses for delta-first prompt (v1.0.9)
    // This enables delta-first analysis for BOTH API and orchestrator code paths
    let historicalAnalyses: any[] = [];
    let previousAnalysis: any = null;
    let deltas: any = null;

    if (input.stockHistoryDbId && input.stockAnalysesDbId) {
      try {
        console.log(`[ANALYZER] Querying historical analyses for ${tickerUpper}...`);

        const notionClient = createNotionClient({
          apiKey: input.userAccessToken,
          stockAnalysesDbId: input.stockAnalysesDbId,
          stockHistoryDbId: input.stockHistoryDbId,
          userId: input.notionUserId,
          timezone: input.timezone,
        });

        // Query 90 days of history
        historicalAnalyses = await notionClient.queryHistoricalAnalyses(tickerUpper, 90);

        if (historicalAnalyses.length > 0) {
          previousAnalysis = historicalAnalyses[0];

          // Calculate deltas for delta-first prompt
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
            input.marketContext, // Current market context
            previousAnalysis.marketRegime // Previous regime for transition detection
          );

          console.log(`[ANALYZER] ✓ Found ${historicalAnalyses.length} historical analyses (90 days)`);
          console.log(`[ANALYZER]   Previous: ${previousAnalysis.compositeScore}/5.0 (${previousAnalysis.date})`);
          console.log(`[ANALYZER]   Score Change: ${deltas.trendEmoji} ${deltas.scoreChange > 0 ? '+' : ''}${deltas.scoreChange.toFixed(2)} (${deltas.significance}, ${deltas.trendDirection})`);
          if (deltas.priceDeltas) {
            console.log(`[ANALYZER]   Price Change: ${deltas.priceDeltas.priceChangePercent > 0 ? '+' : ''}${deltas.priceDeltas.priceChangePercent.toFixed(2)}% over ${deltas.daysElapsed} days`);
          }
          if (deltas.regimeTransition?.occurred) {
            console.log(`[ANALYZER]   🔥 Regime Transition: ${deltas.regimeTransition.from} → ${deltas.regimeTransition.to}`);
          }
        } else {
          console.log(`[ANALYZER] ℹ️  No historical analyses found (first analysis for ${tickerUpper})`);
        }
      } catch (error) {
        console.warn(`[ANALYZER] ⚠️  Failed to query historical analyses for ${tickerUpper}:`, error);
        // Continue without historical context (graceful degradation)
      }
    } else {
      console.log(`[ANALYZER] ℹ️  Stock History DB not configured - skipping historical context`);
    }

    // Build current metrics object (used for both LLM context and delta calculation)
    const currentMetrics = {
      // Scores
      compositeScore: scores.composite,
      technicalScore: scores.technical,
      fundamentalScore: scores.fundamental,
      macroScore: scores.macro,
      riskScore: scores.risk,
      sentimentScore: scores.sentiment,
      marketAlignment: scores.marketAlignment, // NEW: Market alignment score
      sectorScore: 0,
      recommendation: scores.recommendation,
      pattern: 'Unknown',
      confidence: qualityReport.dataCompleteness * 5,
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
    };

    // Generate LLM analysis WITH historical context (v1.0.9)
    const analysisContext: AnalysisContext = {
      ticker: tickerUpper,
      currentDate: new Date().toISOString().split('T')[0], // e.g., "2025-11-16"
      marketContext: input.marketContext, // Pass market context to LLM
      currentMetrics,
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
    };

    const llmProvider = LLMFactory.getProviderFromEnv();
    const llmResult = await llmProvider.generateAnalysis(analysisContext);

    // Return complete analysis result
    return {
      success: true,
      ticker: tickerUpper,
      technical,
      fundamental,
      macro,
      scores,
      dataQuality: {
        completeness: qualityReport.dataCompleteness,
        grade: qualityReport.grade,
        confidence: qualityReport.confidence,
        canProceed: qualityReport.canProceed,
        missingFields: qualityReport.missingFields,
      },
      llmAnalysis: {
        content: llmResult.content,
        modelUsed: llmResult.modelUsed,
        tokensUsed: {
          input: llmResult.tokensUsed.input,
          output: llmResult.tokensUsed.output,
          total: llmResult.tokensUsed.input + llmResult.tokensUsed.output,
        },
        cost: llmResult.cost,
        latencyMs: llmResult.latencyMs,
      },
      analysisContent: llmResult.content, // v1.2.18: Return generated content
      apiCalls: {
        fmp: fmpCalls,
        fred: fredCalls,
        total: fmpCalls + fredCalls,
      },
    };
  } catch (error) {
    // Return error result (don't throw - let caller handle)
    return {
      success: false,
      ticker: tickerUpper,
      technical: {},
      fundamental: {},
      macro: {},
      scores: {
        composite: 0,
        technical: 0,
        fundamental: 0,
        macro: 0,
        risk: 0,
        sentiment: 0,
        marketAlignment: 0,
        recommendation: 'Error',
      },
      dataQuality: {
        completeness: 0,
        grade: 'F',
        confidence: 'None',
        canProceed: false,
        missingFields: [],
      },
      llmAnalysis: {
        content: '',
        modelUsed: 'none',
        tokensUsed: { input: 0, output: 0, total: 0 },
        cost: 0,
        latencyMs: 0,
      },
      apiCalls: {
        fmp: 0,
        fred: 0,
        total: 0,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate analysis result completeness
 *
 * Ensures all required fields are populated before broadcasting.
 * Returns true if analysis is complete and ready to broadcast.
 */
export function validateAnalysisComplete(result: AnalysisResult): boolean {
  if (!result.success) {
    return false;
  }

  // Check required fields
  const hasScores = result.scores.composite > 0;
  const hasRecommendation = result.scores.recommendation !== 'Error';
  const hasLLMContent = result.llmAnalysis.content.length > 0;
  const hasDataQuality = result.dataQuality.canProceed;

  return hasScores && hasRecommendation && hasLLMContent && hasDataQuality;
}
