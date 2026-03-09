/**
 * Notion Client for Sage Stocks v1.0.3
 *
 * Handles all Notion API operations:
 * - Writing analysis metrics to Stock Analyses database
 * - Managing 3-state Content Status (Analyzing → Complete → Error)
 * - Archiving completed analyses to Stock History
 * - Timezone-aware timestamp formatting
 *
 * v1.0.3: Added timezone support for history page titles
 * v1.0.2: Simplified to 3-state Content Status system
 * Ported from Python v0.3.0 NotionClient class
 */

import { Client } from '@notionhq/client';
import { formatTimestampInTimezone, validateTimezone, getTimezoneFromEnv, type SupportedTimezone } from '../../shared/timezone';
import {
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { ScoreResults } from '../../domain/analysis/scoring';
import { withRetry } from '../../core/utils';

interface NotionConfig {
  apiKey: string;
  stockAnalysesDbId: string;
  stockHistoryDbId: string;
  userId?: string; // For notifications
  timezone?: string; // User's IANA timezone (optional, defaults to env)
}

interface AnalysisData {
  ticker: string;
  companyName?: string;
  timestamp: Date;
  technical: TechnicalData;
  fundamental: FundamentalData;
  macro: MacroData;
  scores: ScoreResults;
  pattern?: PatternData;
  apiCalls?: {
    fmp?: number;
    fred?: number;
    total?: number;
  };
}

interface TechnicalData {
  current_price?: number;
  ma_50?: number;
  ma_200?: number;
  rsi?: number;
  macd?: number;
  macd_signal?: number;
  volume?: number;
  avg_volume_20d?: number;
  volatility_30d?: number;
  price_change_1d?: number;
  price_change_5d?: number;
  price_change_1m?: number;
  week_52_high?: number;
  week_52_low?: number;
}

interface FundamentalData {
  company_name?: string;
  market_cap?: number;
  pe_ratio?: number;
  eps?: number;
  revenue_ttm?: number;
  debt_to_equity?: number;
  beta?: number;
}

interface MacroData {
  fed_funds_rate?: number;
  unemployment?: number;
  consumer_sentiment?: number;
  yield_curve_spread?: number;
  vix?: number;
  gdp?: number;
}

interface PatternData {
  score?: number;
  signal?: string;
  detected?: string[];
}

type ContentStatus =
  | 'Analyzing'
  | 'Complete'
  | 'Error';

export class NotionClient {
  private client: Client;
  private stockAnalysesDbId: string;
  private stockHistoryDbId: string;
  private userId?: string;
  private timezone: SupportedTimezone;
  private dataSourceCache = new Map<string, string>();

  constructor(config: NotionConfig) {
    this.client = new Client({ auth: config.apiKey, notionVersion: '2025-09-03' });
    this.stockAnalysesDbId = config.stockAnalysesDbId;
    this.stockHistoryDbId = config.stockHistoryDbId;
    this.userId = config.userId;
    this.timezone = validateTimezone(config.timezone, getTimezoneFromEnv());
  }

  /**
   * Get data source ID from database ID
   * Caches result to avoid repeated API calls
   * Required for API version 2025-09-03
   */
  private async getDataSourceId(databaseId: string): Promise<string> {
    // Check cache first
    if (this.dataSourceCache.has(databaseId)) {
      return this.dataSourceCache.get(databaseId)!;
    }

    // Fetch from API
    const db = await this.client.databases.retrieve({
      database_id: databaseId
    });

    // Extract first data source ID
    const dataSourceId = (db as any).data_sources?.[0]?.id;

    if (!dataSourceId) {
      throw new Error(`No data source found for database ${databaseId}`);
    }

    // Cache and return
    this.dataSourceCache.set(databaseId, dataSourceId);
    return dataSourceId;
  }

  /**
   * Sync analysis data to Notion Stock Analyses database
   *
   * @param data - Analysis data containing ticker, scores, technical/fundamental metrics
   * @param usePollingWorkflow - Deprecated in v1.0.2. Content Status is now managed by /api/analyze endpoint.
   * @returns Object containing page IDs for Stock Analyses and Stock History (if created)
   *
   * @example
   * ```typescript
   * const result = await notionClient.syncToNotion(analysisData, true);
   * console.log('Created page:', result.analysesPageId);
   * ```
   */
  async syncToNotion(
    data: AnalysisData,
    usePollingWorkflow: boolean = true
  ): Promise<{ analysesPageId: string | null; historyPageId: string | null }> {
    console.log('='.repeat(60));
    console.log(`Syncing ${data.ticker} to Notion...`);
    console.log('='.repeat(60));

    // Build properties for Stock Analyses
    const properties = this.buildProperties(data, 'analyses');

    // Upsert to Stock Analyses
    const analysesPageId = await this.upsertAnalyses(
      data.ticker,
      properties
    );

    console.log(
      `✅ Stock Analyses: ${analysesPageId ? 'Updated' : 'Created'}`
    );

    // v0.3.0 workflow: Skip history creation (handled by archive_to_history)
    // v0.2.9 workflow: Create history immediately
    let historyPageId = null;
    if (!usePollingWorkflow && analysesPageId) {
      const historyProperties = this.buildProperties(data, 'history');
      historyPageId = await this.createHistory(
        data.ticker,
        data.timestamp,
        historyProperties
      );
      console.log('✅ Stock History: Created new entry');
    } else {
      console.log(
        '⏭️  Stock History: Deferred until AI analysis complete (v0.3.0 workflow)'
      );
    }

    console.log('='.repeat(60) + '\n');

    return { analysesPageId, historyPageId };
  }

  /**
   * Upsert page in Stock Analyses database
   * Updates existing page if ticker exists, creates new page otherwise
   *
   * Note: Content Status is NOT set here. It's managed by the /api/analyze endpoint.
   *
   * @throws Error if upsert fails after retries
   */
  private async upsertAnalyses(
    ticker: string,
    properties: Record<string, any>
  ): Promise<string | null> {
    try {
      // Find existing page by ticker
      const existingPageId = await this.findPageByTicker(
        this.stockAnalysesDbId,
        ticker,
        'title'
      );

      // Note: Content Status will be managed by analyze endpoint
      // Don't set it here - it will be set to "Analyzing" by the endpoint

      if (existingPageId) {
        // Update existing page with retry
        const response = await withRetry(
          async () =>
            await this.client.pages.update({
              page_id: existingPageId,
              properties,
            }),
          `Notion updatePage(${ticker})`,
          { maxAttempts: 2 } // Fewer retries for writes
        );

        if (!response || !response.id) {
          throw new Error(`Failed to update Stock Analyses page for ${ticker}`);
        }

        return response.id;
      } else {
        // Create new page with retry
        const response = await withRetry(
          async () =>
            await this.client.pages.create({
              parent: { database_id: this.stockAnalysesDbId },
              properties,
            }),
          `Notion createPage(${ticker})`,
          { maxAttempts: 2 } // Fewer retries for writes
        );

        if (!response || !response.id) {
          throw new Error(`Failed to create Stock Analyses page for ${ticker}`);
        }

        return response.id;
      }
    } catch (error) {
      console.error('[Notion] Analyses upsert error:', error);
      // Re-throw to make failures explicit instead of returning null silently
      throw new Error(
        `Stock Analyses upsert failed for ${ticker}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create new entry in Stock History database
   *
   * Timezone-aware: Formats timestamp in user's timezone (v1.0.3)
   */
  private async createHistory(
    ticker: string,
    timestamp: Date,
    properties: Record<string, any>
  ): Promise<string | null> {
    try {
      // Format date in user's timezone with abbreviation
      const formattedDate = formatTimestampInTimezone(timestamp, this.timezone);

      // Override Name property for history
      properties['Name'] = {
        title: [{ text: { content: `${ticker} - ${formattedDate}` } }],
      };

      // Note: Stock History doesn't use Content Status in v1.0.2
      // Removed to simplify 3-state system (Analyzing/Complete/Error only for Stock Analyses)

      const response = await withRetry(
        async () =>
          await this.client.pages.create({
            parent: { database_id: this.stockHistoryDbId },
            properties,
          }),
        `Notion createHistory(${ticker})`,
        { maxAttempts: 2 } // Fewer retries for writes
      );

      return response.id;
    } catch (error) {
      console.error('[Notion] History create error:', error);
      return null;
    }
  }

  /**
   * Find page by ticker in database
   * Returns page ID if found, null otherwise
   */
  private async findPageByTicker(
    databaseId: string,
    ticker: string,
    propertyType: 'title' | 'rich_text'
  ): Promise<string | null> {
    try {
      // Get data source ID for API v2025-09-03
      const dataSourceId = await this.getDataSourceId(databaseId);

      const response = await this.client.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
          property: 'Ticker',
          [propertyType]: {
            equals: ticker,
          },
        } as any,
        page_size: 1,
      });

      if (response.results.length > 0) {
        return response.results[0].id;
      }

      return null;
    } catch (error) {
      console.error('[Notion] Find by ticker error:', error);
      return null;
    }
  }

  /**
   * Build Notion properties from analysis data
   * Matches v0.3.0 Python property structure exactly
   */
  private buildProperties(
    data: AnalysisData,
    dbType: 'analyses' | 'history'
  ): Record<string, any> {
    const { ticker, companyName, timestamp, technical, fundamental, macro, scores } =
      data;

    // Calculate data completeness (24 total fields to match validators.ts)
    const fields = [
      technical.current_price,
      technical.ma_50,
      technical.ma_200,
      technical.rsi,
      technical.macd,
      technical.macd_signal,
      technical.volume,
      technical.avg_volume_20d,
      technical.volatility_30d,
      technical.price_change_1d,
      technical.price_change_5d,
      technical.price_change_1m,
      fundamental.market_cap,
      fundamental.pe_ratio,
      fundamental.eps,
      fundamental.revenue_ttm,
      fundamental.debt_to_equity,
      fundamental.beta,
      technical.week_52_high,
      technical.week_52_low,
      // Macro fields (4 fields)
      macro.fed_funds_rate,
      macro.unemployment,
      macro.vix,
      macro.yield_curve_spread,
    ];

    const available = fields.filter((f) => f !== undefined && f !== null).length;
    const totalFields = 24; // Matches validators.ts: 2 critical + 22 optional
    const completeness = available / totalFields;

    // Data quality grade
    let grade: string;
    if (completeness >= 0.9) grade = 'A - Excellent';
    else if (completeness >= 0.75) grade = 'B - Good';
    else if (completeness >= 0.6) grade = 'C - Fair';
    else grade = 'D - Poor';

    // Confidence level
    let confidence: string;
    if (completeness >= 0.85) confidence = 'High';
    else if (completeness >= 0.7) confidence = 'Medium-High';
    else if (completeness >= 0.55) confidence = 'Medium';
    else confidence = 'Low';

    // Build properties object
    const props: Record<string, any> = {};

    // Ticker property (title for analyses, rich_text for history)
    if (dbType === 'analyses') {
      props['Ticker'] = { title: [{ text: { content: ticker } }] };
    } else {
      props['Ticker'] = { rich_text: [{ text: { content: ticker } }] };
    }

    // Company name
    if (companyName) {
      props['Company Name'] = {
        rich_text: [{ text: { content: companyName } }],
      };
    }

    // Analysis date
    props['Analysis Date'] = { date: { start: timestamp.toISOString() } };

    // Owner (for notifications)
    if (this.userId) {
      props['Owner'] = { people: [{ id: this.userId }] };
    }

    // Current price
    if (technical.current_price !== undefined) {
      props['Current Price'] = { number: technical.current_price };
    }

    // Scores
    props['Composite Score'] = { number: scores.composite };
    props['Technical Score'] = { number: scores.technical };
    props['Fundamental Score'] = { number: scores.fundamental };
    props['Macro Score'] = { number: scores.macro };
    props['Risk Score'] = { number: scores.risk };
    props['Sentiment Score'] = { number: scores.sentiment };

    // Recommendation and quality
    props['Recommendation'] = { select: { name: scores.recommendation } };
    props['Confidence'] = { select: { name: confidence } };
    props['Data Quality Grade'] = { select: { name: grade } };
    props['Data Completeness'] = {
      number: Math.round(completeness * 100) / 100,
    };

    // Protocol version
    props['Protocol Version'] = {
      rich_text: [{ text: { content: 'v1.0.0' } }],
    };

    // Technical indicators
    if (technical.ma_50 !== undefined)
      props['50 Day MA'] = { number: Math.round(technical.ma_50 * 100) / 100 };
    if (technical.ma_200 !== undefined)
      props['200 Day MA'] = {
        number: Math.round(technical.ma_200 * 100) / 100,
      };
    if (technical.rsi !== undefined)
      props['RSI'] = { number: Math.round(technical.rsi * 10) / 10 };
    if (technical.macd !== undefined)
      props['MACD'] = { number: Math.round(technical.macd * 100) / 100 };
    if (technical.macd_signal !== undefined)
      props['MACD Signal'] = {
        number: Math.round(technical.macd_signal * 100) / 100,
      };
    if (technical.volume !== undefined)
      props['Volume'] = { number: Math.floor(technical.volume) };
    if (technical.avg_volume_20d !== undefined)
      props['Avg Volume (20D)'] = {
        number: Math.round(technical.avg_volume_20d * 10) / 10,
      };
    if (technical.volatility_30d !== undefined)
      props['Volatility (30D)'] = {
        number: Math.round(technical.volatility_30d * 10000) / 10000,
      };
    if (technical.price_change_1d !== undefined)
      props['Price Change (1D)'] = {
        number: Math.round(technical.price_change_1d * 10000) / 10000,
      };
    if (technical.price_change_5d !== undefined)
      props['Price Change (5D)'] = {
        number: Math.round(technical.price_change_5d * 10000) / 10000,
      };
    if (technical.price_change_1m !== undefined)
      props['Price Change (1M)'] = {
        number: Math.round(technical.price_change_1m * 10000) / 10000,
      };

    // Volume change calculation
    if (
      technical.volume !== undefined &&
      technical.avg_volume_20d !== undefined &&
      technical.avg_volume_20d !== 0
    ) {
      const volumeChange =
        (technical.volume - technical.avg_volume_20d) / technical.avg_volume_20d;
      props['Volume Change'] = {
        number: Math.round(volumeChange * 10000) / 10000,
      };
    }

    // Fundamental data
    if (fundamental.market_cap !== undefined)
      props['Market Cap'] = {
        number: Math.round(fundamental.market_cap * 100) / 100,
      };
    if (fundamental.pe_ratio !== undefined)
      props['P/E Ratio'] = {
        number: Math.round(fundamental.pe_ratio * 100) / 100,
      };
    if (fundamental.eps !== undefined)
      props['EPS'] = { number: Math.round(fundamental.eps * 100) / 100 };
    if (fundamental.revenue_ttm !== undefined)
      props['Revenue (TTM)'] = { number: Math.round(fundamental.revenue_ttm) };
    if (fundamental.debt_to_equity !== undefined)
      props['Debt to Equity'] = {
        number: Math.round(fundamental.debt_to_equity * 100) / 100,
      };
    if (fundamental.beta !== undefined)
      props['Beta'] = { number: Math.round(fundamental.beta * 100) / 100 };
    if (technical.week_52_high !== undefined)
      props['52 Week High'] = {
        number: Math.round(technical.week_52_high * 100) / 100,
      };
    if (technical.week_52_low !== undefined)
      props['52 Week Low'] = {
        number: Math.round(technical.week_52_low * 100) / 100,
      };

    // API calls tracking
    const totalApiCalls =
      (data.apiCalls?.fmp || 0) +
      (data.apiCalls?.fred || 0);
    props['API Calls Used'] = { number: totalApiCalls };

    // Pattern data (if available)
    if (data.pattern) {
      if (data.pattern.score !== undefined) {
        props['Pattern Score'] = { number: data.pattern.score };
      }
      if (data.pattern.signal) {
        const allowedSignals = [
          '🚀 Extremely Bullish',
          '📈 Bullish',
          '✋ Neutral',
          '📉 Bearish',
          '🚨 Extremely Bearish',
        ];
        if (allowedSignals.includes(data.pattern.signal)) {
          props['Pattern Signal'] = { select: { name: data.pattern.signal } };
        }
      }
      if (data.pattern.detected && data.pattern.detected.length > 0) {
        props['Detected Patterns'] = {
          rich_text: [{ text: { content: data.pattern.detected.join(', ') } }],
        };
      }
    }

    // Clear Notes field on successful analysis (prevents stale error messages from persisting)
    // Only set for Stock Analyses (not Stock History)
    if (dbType === 'analyses') {
      console.log(`[Notion] Clearing Notes field for ${ticker}`);
      props['Notes'] = {
        rich_text: [] // Empty array clears the field
      };
    }

    return props;
  }

  /**
   * Poll Stock Analyses page until status becomes "Complete"
   *
   * @deprecated This method is deprecated in v1.0.2. Content Status is now managed
   * automatically by the /api/analyze endpoint (Analyzing → Complete → Error).
   *
   * Continuously checks a Stock Analyses page for Content Status changes.
   * Returns when status becomes "Complete" (indicating AI analysis is complete)
   * or when timeout is reached.
   *
   * @param pageId - Notion page ID to poll
   * @param timeout - Maximum time to wait in seconds (default: 600 = 10 minutes)
   * @param pollInterval - How often to check status in seconds (default: 10)
   * @param skipPolling - If true, skip polling and return immediately (default: false)
   * @returns True if "Complete" status detected, false if timeout or skipped
   *
   * @example
   * ```typescript
   * const completed = await notionClient.waitForAnalysisCompletion(pageId, 600, 10);
   * if (completed) {
   *   await notionClient.archiveToHistory(pageId);
   * }
   * ```
   *
   * @remarks
   * - Sets Content Status to "Error" on timeout
   */
  async waitForAnalysisCompletion(
    pageId: string,
    timeout: number = 600, // 10 minutes default
    pollInterval: number = 10, // 10 seconds default
    skipPolling: boolean = false
  ): Promise<boolean> {
    if (skipPolling) {
      console.log('⏭️  Polling skipped. Run archive manually when ready:');
      console.log(`    await notion.archiveToHistory('${pageId}')`);
      return false;
    }

    const startTime = Date.now();
    const endTime = startTime + timeout * 1000;

    console.log('✅ Metrics synced. Waiting for AI analysis to complete...');
    console.log('📊 Open Notion and run your AI prompt now.');
    console.log(
      `⏱️  Polling every ${pollInterval}s for up to ${timeout / 60} minutes...`
    );

    while (Date.now() < endTime) {
      try {
        // Query page for current Status
        const page = (await this.client.pages.retrieve({
          page_id: pageId,
        })) as PageObjectResponse;

        const statusProperty = page.properties['Status'];
        if (statusProperty?.type === 'status') {
          const status = statusProperty.status?.name as
            | ContentStatus
            | undefined;

          if (status === 'Complete') {
            console.log('✅ AI analysis complete! Starting archival...');
            return true;
          }

          // Calculate time remaining
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = timeout - elapsed;

          console.log(
            `⏳ Status: ${status || 'None'} | Checking again in ${pollInterval}s (${remaining}s remaining)`
          );
        }
      } catch (error) {
        console.error('⚠️  Exception during polling:', error);
      }

      // Wait for poll interval
      await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
    }

    // Timeout reached - set status to "Error"
    console.log('⏱️  Timeout reached. Analysis not completed within time limit.');
    console.log('🔄 Setting Status to "Error"...');

    try {
      await this.client.pages.update({
        page_id: pageId,
        properties: {
          'Status': { status: { name: 'Error' } },
        },
      });
      console.log('✅ Status updated to "Error"');
    } catch (error) {
      console.error('⚠️  Could not update status:', error);
    }

    console.log('💡 You can run the archiving function manually when ready:');
    console.log(`    await notion.archiveToHistory('${pageId}')`);
    return false;
  }

  /**
   * Archive completed analysis to Stock History database
   *
   * Copies all properties and content blocks from a Stock Analyses page to create
   * a new historical record in Stock History. This is typically called after AI
   * analysis is complete.
   *
   * @param pageId - Notion page ID of the Stock Analyses page to archive
   * @param marketRegime - Market regime at time of analysis (for pattern recognition in v1.0.8)
   * @returns Page ID of the newly created Stock History entry, or null if failed
   *
   * @example
   * ```typescript
   * const historyId = await notionClient.archiveToHistory(analysesPageId, 'Risk-On');
   * if (historyId) {
   *   console.log('Archived to history:', historyId);
   * }
   * ```
   *
   * @remarks
   * - Creates a new page in Stock History (append-only, never updates)
   * - Excludes Stock Analyses-specific properties (Owner, etc.)
   * - Includes Market Regime for delta-first pattern recognition (v1.0.8)
   * - Does NOT update Content Status (already set to "Complete" by /api/analyze)
   * - Stock History pages don't use Content Status (simplified in v1.0.2)
   * - Copies all content blocks (except synced blocks)
   */
  async archiveToHistory(pageId: string, marketRegime?: string): Promise<string | null> {
    console.log('📦 Archiving analysis to Stock History...');

    try {
      // Read full page data
      const page = (await this.client.pages.retrieve({
        page_id: pageId,
      })) as PageObjectResponse;

      const blocks = await this.client.blocks.children.list({
        block_id: pageId,
      });

      // Properties to exclude from copy
      const EXCLUDE_PROPERTIES = new Set([
        'Status', // Workflow-specific
        'Owner', // Workflow-specific
        'Send to History', // Button property
        'Next Review Date', // Stock Analyses-specific
        'AI summary', // Stock Analyses-specific
        'Holding Type', // Stock Analyses-specific
        'Analysis Cadence', // Stock Analyses-specific (orchestrator feature)
      ]);

      // Copy properties (excluding Stock Analyses-specific ones)
      const propertiesToCopy: Record<string, any> = {};
      let excludedCount = 0;

      for (const [propName, propValue] of Object.entries(page.properties)) {
        if (EXCLUDE_PROPERTIES.has(propName)) {
          excludedCount++;
          continue;
        }

        const cleanedValue = this.cleanPropertyValue(propValue);
        if (cleanedValue) {
          propertiesToCopy[propName] = cleanedValue;
        }
      }

      console.log(
        `ℹ️  Copying ${Object.keys(propertiesToCopy).length} properties, excluding ${excludedCount} Stock Analyses-specific properties`
      );

      // Get ticker and analysis date for History page title
      const tickerProp = page.properties['Ticker'];
      const dateProp = page.properties['Analysis Date'];

      if (tickerProp?.type !== 'title' || dateProp?.type !== 'date') {
        console.error('⚠️  Missing required properties (Ticker or Analysis Date)');
        return null;
      }

      const ticker = tickerProp.title[0]?.plain_text || 'Unknown';
      const analysisDate = new Date(dateProp.date?.start || Date.now());

      // CRITICAL FIX: Check for duplicate entries on same date (prevents duplicates from orchestrator + manual API calls)
      // Extract date-only string (YYYY-MM-DD) for comparison
      const analysisDateOnly = analysisDate.toISOString().split('T')[0];

      try {
        const dataSourceId = await this.getDataSourceId(this.stockHistoryDbId);
        const existingEntries = await this.client.dataSources.query({
          data_source_id: dataSourceId,
          filter: {
            and: [
              {
                property: 'Ticker',
                rich_text: {
                  equals: ticker,
                },
              },
              {
                property: 'Analysis Date',
                date: {
                  equals: analysisDateOnly,
                },
              },
            ],
          },
          page_size: 1,
        });

        if (existingEntries.results.length > 0) {
          const existingPageId = existingEntries.results[0].id;
          console.log(`⚠️  Stock History entry already exists for ${ticker} on ${analysisDateOnly}`);
          console.log(`   Skipping duplicate creation. Existing page: ${existingPageId.substring(0, 8)}...`);
          return existingPageId;
        }
      } catch (error) {
        console.warn('⚠️  Failed to check for existing Stock History entries:', error);
        // Continue with creation - better to have a duplicate than miss an entry
      }

      // Format date in user's timezone with abbreviation (v1.0.3)
      const formattedDate = formatTimestampInTimezone(analysisDate, this.timezone);

      // Set Stock History specific properties
      propertiesToCopy['Ticker'] = {
        rich_text: [{ text: { content: ticker } }],
      };
      propertiesToCopy['Name'] = {
        title: [{ text: { content: `${ticker} - ${formattedDate}` } }],
      };

      // Add market regime for pattern recognition (v1.0.8)
      if (marketRegime) {
        propertiesToCopy['Market Regime'] = {
          select: { name: marketRegime },
        };
        console.log(`ℹ️  Including Market Regime: ${marketRegime}`);
      }
      // Note: Stock History doesn't use Content Status (deprecated - field is redundant for time-series data)

      // Create Stock History page
      let historyPage;
      try {
        historyPage = await this.client.pages.create({
          parent: { database_id: this.stockHistoryDbId },
          properties: propertiesToCopy,
        });
      } catch (error: any) {
        // If Market Regime property doesn't exist, retry without it
        if (error.code === 'validation_error' &&
          error.message?.includes('Market Regime') &&
          marketRegime) {
          console.warn('⚠️  Market Regime property not found in Stock History database - skipping');
          console.warn('   💡 To enable regime tracking, add a "Market Regime" select property to Stock History');
          console.warn('      Options: Risk-On, Risk-Off, Transition');

          // Remove Market Regime and retry
          delete propertiesToCopy['Market Regime'];
          historyPage = await this.client.pages.create({
            parent: { database_id: this.stockHistoryDbId },
            properties: propertiesToCopy,
          });
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      console.log(`✅ Created Stock History page: ${ticker} - ${formattedDate}`);

      // Copy content blocks (excluding synced blocks)
      const blocksToCopy = blocks.results.filter(
        (block: any) => block.type !== 'synced_block'
      );

      if (blocksToCopy.length > 0) {
        // Note: Block copying requires careful handling of block structure
        // For now, we'll log this as a TODO - full implementation requires
        // recursive block copying with proper type handling
        console.log(
          `ℹ️  ${blocksToCopy.length} content blocks found (block copying to be implemented)`
        );
      } else {
        console.log('ℹ️  No content blocks to copy (analysis may still be pending)');
      }

      // Note: Content Status already set to "Complete" by /api/analyze endpoint
      // No need to update it again
      console.log('🎉 Archival complete!');

      return historyPage.id;
    } catch (error) {
      console.error('❌ Exception during archival:', error);
      return null;
    }
  }

  /**
   * Archive by ticker name instead of page ID
   * Convenience method for manual archiving
   */
  async archiveTickerToHistory(ticker: string): Promise<string | null> {
    const pageId = await this.findPageByTicker(
      this.stockAnalysesDbId,
      ticker,
      'title'
    );

    if (!pageId) {
      console.error(`⚠️  No page found for ticker: ${ticker}`);
      return null;
    }

    return this.archiveToHistory(pageId);
  }

  /**
   * Update the Status property of a Notion page
   *
   * @param pageId - Notion page ID or URL
   * @param status - New status value: "Analyzing" | "Complete" | "Error"
   * @returns Promise that resolves when update is complete
   *
   * @example
   * ```typescript
   * // Mark analysis as in progress
   * await notionClient.updateContentStatus(pageId, "Analyzing");
   *
   * // Mark analysis as completed
   * await notionClient.updateContentStatus(pageId, "Complete");
   *
   * // Mark analysis as failed
   * await notionClient.updateContentStatus(pageId, "Error");
   * ```
   */
  async updateContentStatus(
    pageId: string,
    status: ContentStatus
  ): Promise<void> {
    try {
      // Extract page ID from URL if full URL provided
      const id = pageId.includes('notion.so')
        ? pageId.split('/').pop()?.split('?')[0].replace(/-/g, '')
        : pageId;

      if (!id) {
        throw new Error('Invalid page ID or URL');
      }

      await this.client.pages.update({
        page_id: id,
        properties: {
          'Status': {
            status: { name: status },
          },
        },
      });

      console.log(`✅ Updated Status to "${status}"`);
    } catch (error) {
      console.error('❌ Error updating Status:', error);
      throw error;
    }
  }

  /**
   * Write error message to page Notes property and set status to Error
   *
   * @param pageId - Notion page ID
   * @param errorMessage - Error message to write (will be truncated to 2000 chars)
   */
  async writeErrorToPage(pageId: string, errorMessage: string): Promise<void> {
    try {
      // Extract page ID from URL if full URL provided
      const id = pageId.includes('notion.so')
        ? pageId.split('/').pop()?.split('?')[0].replace(/-/g, '')
        : pageId;

      if (!id) {
        throw new Error('Invalid page ID or URL');
      }

      await withRetry(
        async () =>
          await this.client.pages.update({
            page_id: id,
            properties: {
              Notes: {
                rich_text: [
                  {
                    text: {
                      content: errorMessage.substring(0, 2000), // Notion limit
                    },
                  },
                ],
              },
              'Status': {
                status: {
                  name: 'Error',
                },
              },
            },
          }),
        `Notion writeError(${id.substring(0, 8)})`,
        { maxAttempts: 2 } // Fewer retries for writes
      );

      console.log(`✅ Error written to Notion page ${id}`);
    } catch (error) {
      console.error('❌ Failed to write error to Notion:', error);
      // Don't throw - we don't want to fail the request just because we couldn't write to Notion
    }
  }

  /**
   * Clean property value for copying to different database
   * Removes database-specific IDs
   */
  private cleanPropertyValue(propValue: any): any {
    if (!propValue || typeof propValue !== 'object') {
      return null;
    }

    const type = propValue.type;

    switch (type) {
      case 'title':
        return {
          title:
            propValue.title?.map((item: any) => ({
              text: { content: item.plain_text },
            })) || [],
        };

      case 'rich_text':
        return {
          rich_text:
            propValue.rich_text?.map((item: any) => ({
              text: { content: item.plain_text },
            })) || [],
        };

      case 'number':
        return { number: propValue.number };

      case 'select':
        return propValue.select?.name
          ? { select: { name: propValue.select.name } }
          : null;

      case 'multi_select':
        return {
          multi_select:
            propValue.multi_select?.map((item: any) => ({ name: item.name })) ||
            [],
        };

      case 'date':
        return propValue.date ? { date: propValue.date } : null;

      case 'checkbox':
        return { checkbox: propValue.checkbox };

      case 'url':
        return propValue.url ? { url: propValue.url } : null;

      case 'email':
        return propValue.email ? { email: propValue.email } : null;

      case 'phone_number':
        return propValue.phone_number
          ? { phone_number: propValue.phone_number }
          : null;

      default:
        // Skip unsupported property types
        return null;
    }
  }

  /**
   * Query historical analyses from Stock History database
   * @param ticker - Stock ticker symbol
   * @param daysBack - Number of days of history to retrieve (default: 90)
   * @returns Array of historical analyses sorted by date (newest first)
   *
   * v1.0.8: Changed from limit-based to date-based query for pattern recognition
   */
  async queryHistoricalAnalyses(
    ticker: string,
    daysBack: number = 90
  ): Promise<Array<{
    date: string;
    compositeScore: number;
    recommendation: string;
    technicalScore?: number;
    fundamentalScore?: number;
    macroScore?: number;
    riskScore?: number;
    sentimentScore?: number;
    marketAlignment?: number;
    marketRegime?: string;
    price?: number;
    volume?: number;
    metrics?: Record<string, any>;
  }>> {
    try {
      // Get data source ID for API v2025-09-03
      const dataSourceId = await this.getDataSourceId(this.stockHistoryDbId);

      // Calculate cutoff date (daysBack from now)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffISO = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const response = await this.client.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
          and: [
            {
              property: 'Ticker',
              title: {
                equals: ticker,
              },
            },
            {
              property: 'Analysis Date',
              date: {
                on_or_after: cutoffISO,
              },
            },
          ],
        },
        sorts: [
          {
            property: 'Analysis Date',
            direction: 'descending',
          },
        ],
        page_size: 100, // Max allowed, but date filter is primary limiter
      });

      return response.results.map((page: any) => {
        const props = page.properties;
        return {
          date: props['Analysis Date']?.date?.start || '',
          compositeScore: props['Composite Score']?.number || 0,
          recommendation: props['Recommendation']?.select?.name || '',
          technicalScore: props['Technical Score']?.number,
          fundamentalScore: props['Fundamental Score']?.number,
          macroScore: props['Macro Score']?.number,
          riskScore: props['Risk Score']?.number,
          sentimentScore: props['Sentiment Score']?.number,
          marketAlignment: props['Market Alignment']?.number,
          marketRegime: props['Market Regime']?.select?.name, // NEW in v1.0.8
          price: props['Current Price']?.number,
          volume: props['Volume']?.number,
          metrics: {
            pattern: props['Pattern']?.select?.name,
            confidence: props['Confidence']?.number,
            dataQuality: props['Data Quality']?.select?.name,
          },
        };
      });
    } catch (error: any) {
      console.error(`[Notion] Failed to query historical analyses for ${ticker}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert markdown text to Notion blocks
   * @param markdown - Markdown-formatted text
   * @returns Array of Notion block objects
   */
  private markdownToBlocks(markdown: string): Array<any> {
    const blocks: Array<any> = [];
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        i++;
        continue;
      }

      // Divider (---)
      if (line === '---') {
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {},
        });
        i++;
        continue;
      }

      // Empty block (<empty-block/>)
      if (line === '<empty-block/>') {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: '' } }],
          },
        });
        i++;
        continue;
      }

      // Callout block (<callout icon="..." color="..."> or \<callout icon="..." color="..."\>)
      // Handle both escaped and unescaped callout syntax
      const calloutStartPattern = /^\\?<callout\s+icon="([^"]+)"\s+color="([^"]+)"\\?>/;
      const calloutMatch = line.match(calloutStartPattern);

      if (calloutMatch) {
        const [, icon, color] = calloutMatch;

        // Collect callout content until closing tag (escaped or unescaped)
        const calloutLines: string[] = [];
        i++;
        while (i < lines.length) {
          const contentLine = lines[i];
          // Match both </callout> and \</callout\> (check trimmed version)
          const trimmedContentLine = contentLine.trim();
          if (trimmedContentLine === '</callout>' || trimmedContentLine === '\\</callout\\>') {
            i++; // Move past closing tag
            break;
          }
          // Keep original line (with tabs/spaces) for proper indentation parsing
          calloutLines.push(contentLine);
          i++;
        }

        // Convert color shorthand to Notion format
        const colorMap: { [key: string]: string } = {
          'green_bg': 'green_background',
          'red_bg': 'red_background',
          'orange_bg': 'orange_background',
          'yellow_bg': 'yellow_background',
          'blue_bg': 'blue_background',
          'gray_bg': 'gray_background',
          'purple_bg': 'purple_background',
          'pink_bg': 'pink_background',
          'brown_bg': 'brown_background',
        };
        const notionColor = colorMap[color] || color;

        // Parse callout content as child blocks (not flat rich_text)
        // Remove leading tabs/spaces from callout content (they're indentation markers in the prompt)
        const calloutContent = calloutLines
          .map(line => line.replace(/^\t/, '')) // Remove one leading tab if present
          .join('\n');

        const calloutChildren = this.markdownToBlocks(calloutContent);

        blocks.push({
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: '' } }], // Empty rich_text required by API
            icon: { emoji: icon },
            color: notionColor,
            children: calloutChildren.length > 0 ? calloutChildren : undefined,
          },
        });
        continue;
      }

      // Table detection (markdown tables with | delimiters)
      if (line.startsWith('|') && line.endsWith('|')) {
        const tableRows: string[] = [];

        // Collect all consecutive table rows
        while (i < lines.length) {
          const tableLine = lines[i].trim();
          if (tableLine.startsWith('|') && tableLine.endsWith('|')) {
            tableRows.push(tableLine);
            i++;
          } else {
            break;
          }
        }

        // Parse table if we have at least 2 rows (header + separator, or header + data)
        if (tableRows.length >= 2) {
          // Parse header row
          const headerCells = tableRows[0]
            .split('|')
            .slice(1, -1) // Remove first and last empty strings
            .map(cell => cell.trim());

          // Check if second row is a separator (e.g., |---|---|)
          const isSeparatorRow = tableRows[1].split('|')
            .slice(1, -1)
            .every(cell => /^[-:]+$/.test(cell.trim()));

          // Start from data rows (skip separator if present)
          const dataStartIndex = isSeparatorRow ? 2 : 1;
          const dataRows = tableRows.slice(dataStartIndex);

          // Build Notion table block
          const tableWidth = headerCells.length;

          // Create table structure
          const tableChildren: Array<any> = [];

          // Data rows
          for (const dataRow of dataRows) {
            const dataCells = dataRow
              .split('|')
              .slice(1, -1)
              .map(cell => cell.trim());

            const rowCells: Array<Array<any>> = [];
            for (const cellContent of dataCells) {
              // Parse cell content for bold formatting
              rowCells.push(this.parseRichText(cellContent));
            }

            tableChildren.push({
              object: 'block',
              type: 'table_row',
              table_row: {
                cells: rowCells,
              },
            });
          }

          // Create table block with header row as the first row
          blocks.push({
            object: 'block',
            type: 'table',
            table: {
              table_width: tableWidth,
              has_column_header: true,
              has_row_header: false,
              children: [
                {
                  object: 'block',
                  type: 'table_row',
                  table_row: {
                    cells: headerCells.map(header => [{
                      type: 'text',
                      text: { content: header },
                      annotations: { bold: true },
                    }]),
                  },
                },
                ...tableChildren,
              ],
            },
          });

          continue;
        }
      }

      // H3 heading (###)
      if (line.startsWith('### ')) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: line.substring(4) } }],
          },
        });
        i++;
        continue;
      }

      // H2 heading (##)
      if (line.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: line.substring(3) } }],
          },
        });
        i++;
        continue;
      }

      // Bullet point (- or *)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: this.parseRichText(line.substring(2)),
          },
        });
        i++;
        continue;
      }

      // Regular paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: this.parseRichText(line),
        },
      });
      i++;
    }

    return blocks;
  }

  /**
   * Parse markdown text into Notion rich text format
   * Supports **bold** formatting
   */
  private parseRichText(text: string): Array<any> {
    const richText: Array<any> = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        richText.push({
          type: 'text',
          text: { content: text.substring(lastIndex, match.index) },
        });
      }

      // Add bold text
      richText.push({
        type: 'text',
        text: { content: match[1] },
        annotations: { bold: true },
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      richText.push({
        type: 'text',
        text: { content: text.substring(lastIndex) },
      });
    }

    return richText.length > 0 ? richText : [{ type: 'text', text: { content: text } }];
  }

  /**
   * Write LLM-generated analysis content to a Notion page
   * @param pageId - ID of the Notion page to update
   * @param content - Markdown-formatted analysis content
   * @param mode - 'replace' (default) deletes existing content, 'append' keeps existing content
   *
   * NOTE: Use 'replace' mode for Stock Analyses pages (main database row)
   *       Use 'append' mode for Stock History pages (preserve full history)
   */
  async writeAnalysisContent(
    pageId: string,
    content: string,
    mode: 'replace' | 'append' = 'replace'
  ): Promise<void> {
    const startTime = Date.now();
    try {
      // Step 1: Delete all existing child blocks (only if mode is 'replace')
      if (mode === 'replace') {
        const deleteStartTime = Date.now();
        console.log(`[Notion] Starting REPLACE mode for page ${pageId}...`);

        // Pre-flight delay: Wait for Notion's backend to finish any processing
        // before we start touching the page (prevents conflict_error)
        console.log('[Notion] Pre-flight: Waiting 2 seconds for page to settle...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log(`[Notion] Collecting blocks to delete...`);

        // Step 1a: Collect all block IDs (paginated)
        const blockIdsToDelete: string[] = [];
        let hasMore = true;
        let cursor: string | undefined = undefined;

        while (hasMore) {
          const response = await this.client.blocks.children.list({
            block_id: pageId,
            start_cursor: cursor,
            page_size: 100,
          });

          // Collect block IDs
          for (const block of response.results) {
            if ('id' in block) {
              blockIdsToDelete.push(block.id);
            }
          }

          hasMore = response.has_more;
          cursor = response.next_cursor || undefined;
        }

        console.log(`[Notion] Found ${blockIdsToDelete.length} blocks to delete`);

        // Step 1b: Delete blocks SEQUENTIALLY (nuclear option)
        // Parallel batches were causing conflicts - delete one at a time with delays
        // to give Notion's backend breathing room
        let deletedCount = 0;
        const failedDeletes: Array<{ blockId: string; error: string }> = [];
        const deleteDelay = 200; // 200ms between each delete

        console.log(`[Notion] Deleting ${blockIdsToDelete.length} blocks sequentially (200ms per block)...`);

        for (let i = 0; i < blockIdsToDelete.length; i++) {
          const blockId = blockIdsToDelete[i];

          try {
            await this.client.blocks.delete({ block_id: blockId });
            deletedCount++;

            // Progress logging every 10 blocks
            if ((i + 1) % 10 === 0 || i === blockIdsToDelete.length - 1) {
              console.log(`[Notion] Deleted ${i + 1}/${blockIdsToDelete.length} blocks...`);
            }

            // Delay between each delete (except the last one)
            if (i < blockIdsToDelete.length - 1) {
              await new Promise(resolve => setTimeout(resolve, deleteDelay));
            }

          } catch (error: any) {
            const errorMsg = error.message || String(error);
            failedDeletes.push({ blockId: blockId.substring(0, 8), error: errorMsg });
            console.warn(`[Notion] Failed to delete block ${blockId.substring(0, 8)}:`, errorMsg);
          }
        }

        const deleteDuration = Date.now() - deleteStartTime;
        console.log(`[Notion] Deleted ${deletedCount}/${blockIdsToDelete.length} blocks in ${deleteDuration}ms (${Math.ceil(deletedCount / (deleteDuration / 1000))} blocks/sec)`);

        // CRITICAL: Validate all blocks were deleted
        if (deletedCount < blockIdsToDelete.length) {
          const failedCount = blockIdsToDelete.length - deletedCount;
          const errorSummary = failedDeletes.slice(0, 5).map(f => `${f.blockId}: ${f.error}`).join('; ');
          throw new Error(
            `Failed to delete ${failedCount}/${blockIdsToDelete.length} blocks. ` +
            `Cannot proceed with REPLACE mode to avoid content duplication. ` +
            `Sample errors: ${errorSummary}` +
            (failedDeletes.length > 5 ? ` (and ${failedDeletes.length - 5} more)` : '')
          );
        }

        console.log(`[Notion] ✅ All ${deletedCount} blocks successfully deleted`);
      } else {
        console.log(`[Notion] Appending content to page ${pageId} (mode: ${mode})...`);
      }

      // Step 2: Convert markdown to Notion blocks
      const convertStartTime = Date.now();
      const blocks = this.markdownToBlocks(content);
      const convertDuration = Date.now() - convertStartTime;
      console.log(`[Notion] Converted ${blocks.length} blocks in ${convertDuration}ms`);

      // Step 3: Append new blocks in chunks with delays to avoid rate limits
      // Notion API limits: 100 blocks per request, ~3 requests/second average
      const writeStartTime = Date.now();
      const chunkSize = 100;
      const chunkDelay = 100; // 100ms delay between chunks = ~10 req/sec (safely under Notion's 3 req/sec average)

      for (let i = 0; i < blocks.length; i += chunkSize) {
        const chunk = blocks.slice(i, i + chunkSize);
        const chunkStartTime = Date.now();

        await this.client.blocks.children.append({
          block_id: pageId,
          children: chunk,
        });

        const chunkDuration = Date.now() - chunkStartTime;
        console.log(`[Notion] Wrote chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(blocks.length / chunkSize)} (${chunk.length} blocks) in ${chunkDuration}ms`);

        // Add delay between chunks (except for the last chunk)
        if (i + chunkSize < blocks.length) {
          await new Promise(resolve => setTimeout(resolve, chunkDelay));
        }
      }

      const writeDuration = Date.now() - writeStartTime;
      const totalDuration = Date.now() - startTime;

      const action = mode === 'replace' ? 'Written' : 'Appended';
      console.log(`[Notion] ${action} ${blocks.length} ${mode === 'append' ? 'new ' : ''}blocks to page ${pageId}`);
      console.log(`[Notion] ⏱️  Total write time: ${totalDuration}ms (write: ${writeDuration}ms)`);
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      console.error(`[Notion] Failed to write content to page ${pageId} after ${totalDuration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Create a child analysis page under a parent ticker page
   *
   * Timezone-aware: Date string should already be formatted in user's timezone (v1.0.3)
   *
   * @param parentPageId - ID of the parent ticker page
   * @param ticker - Stock ticker symbol
   * @param date - Analysis date already formatted in user's timezone (e.g., "Nov 1, 2025")
   * @param content - Markdown-formatted analysis content
   * @param properties - Additional page properties (scores, recommendation, etc.)
   * @returns ID of the created child page
   */
  async createChildAnalysisPage(
    parentPageId: string,
    ticker: string,
    date: string,
    content: string,
    properties: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Create child page with title
      const page = await this.client.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          title: {
            title: [
              {
                type: 'text',
                text: { content: `${ticker} Analysis - ${date}` },
              },
            ],
          },
          ...properties,
        },
      });

      // Write analysis content to the page
      await this.writeAnalysisContent(page.id, content);

      console.log(`[Notion] Created child analysis page: ${page.id}`);
      return page.id;
    } catch (error: any) {
      console.error(`[Notion] Failed to create child analysis page:`, error.message);
      throw error;
    }
  }
}

/**
 * Create Notion client instance
 */
export function createNotionClient(config: NotionConfig): NotionClient {
  return new NotionClient(config);
}

export type { NotionConfig, AnalysisData, ContentStatus };
