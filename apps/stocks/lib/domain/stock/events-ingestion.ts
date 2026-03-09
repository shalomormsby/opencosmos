/**
 * Stock Events Ingestion Service
 *
 * Fetches upcoming stock events (earnings, dividends, splits, guidance) from FMP API
 * and writes them to Stock Events database for all Portfolio/Watchlist stocks.
 *
 * Features:
 * - Queries Stock Analyses for Portfolio/Watchlist stocks per user
 * - Deduplicates API calls across users
 * - Fetches next 90 days of events from FMP
 * - Transforms FMP data to Stock Events schema
 * - Upserts to Stock Events database (no duplicates)
 * - Graceful error handling (logs warnings, continues processing)
 *
 * Version: 1.2.16
 */

import { Client } from '@notionhq/client';
import { FMPClient } from '../../integrations/fmp/client';
import { info, warn, error as logError, createTimer } from '../../core/logger';
import { decryptToken } from '../../core/auth';

// ========================================
// HELPER: Data Source ID Resolution
// ========================================

// Cache for data source IDs (API v2025-09-03)
const dataSourceCache = new Map<string, string>();

/**
 * Get data source ID from database ID
 * Required for Notion API version 2025-09-03
 */
async function getDataSourceId(notion: Client, databaseId: string): Promise<string> {
  const cacheKey = `${databaseId}`;
  if (dataSourceCache.has(cacheKey)) {
    return dataSourceCache.get(cacheKey)!;
  }

  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = (db as any).data_sources?.[0]?.id;

  if (!dataSourceId) {
    throw new Error(`No data source found for database ${databaseId}`);
  }

  dataSourceCache.set(cacheKey, dataSourceId);
  return dataSourceId;
}

// ========================================
// TYPES
// ========================================

interface BetaUser {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  stockAnalysesDbId?: string; // From Beta Users database
  stockHistoryDbId?: string; // From Beta Users database
  stockEventsDbId?: string; // From Beta Users database (v1.2.16)
  timezone: string;
}

interface StockEventData {
  ticker: string;
  eventType: 'Earnings Call' | 'Dividend' | 'Stock Split' | 'Guidance' | 'Economic Event';
  eventDate: string; // YYYY-MM-DD
  description: string;
  confidence: 'High' | 'Medium-High' | 'Medium' | 'Low';
  timingPrecision: 'Date Confirmed' | 'Estimated' | 'Preliminary';
  eventSource: 'FMP API' | 'Manual Entry' | 'Company Announcement';

  // Event-specific fields
  epsEstimate?: number;
  dividendAmount?: number;
  splitRatio?: string;
  fiscalQuarter?: string;
  fiscalYear?: number;
}

interface StockEventsIngestionMetrics {
  startTime: Date;
  endTime?: Date;
  durationMs?: number;

  // User metrics
  totalUsers: number;
  usersProcessed: number;
  usersFailed: number;

  // Stock metrics
  totalStocks: number; // Unique tickers across all users
  portfolioStocks: number;
  watchlistStocks: number;

  // Event metrics
  eventsFromFMP: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsSkipped: number; // Duplicates or malformed

  // API efficiency
  fmpApiCalls: number;
  notionApiCalls: number;

  // Errors
  errors: string[];
  warnings: string[];
}

// ========================================
// MAIN INGESTION FUNCTION
// ========================================

/**
 * Run stock events ingestion for all users
 *
 * @param fmpClient FMP API client
 * @param betaUsersDatabaseId Beta Users database ID (admin database)
 * @param notionAdminToken Admin Notion token to query Beta Users
 * @param daysAhead Number of days to fetch events for (default 90)
 */
export async function runStockEventsIngestion(
  fmpClient: FMPClient,
  betaUsersDatabaseId: string,
  notionAdminToken: string,
  daysAhead: number = 90
): Promise<StockEventsIngestionMetrics> {
  const timer = createTimer('Stock Events Ingestion');

  const metrics: StockEventsIngestionMetrics = {
    startTime: new Date(),
    totalUsers: 0,
    usersProcessed: 0,
    usersFailed: 0,
    totalStocks: 0,
    portfolioStocks: 0,
    watchlistStocks: 0,
    eventsFromFMP: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsSkipped: 0,
    fmpApiCalls: 0,
    notionApiCalls: 0,
    errors: [],
    warnings: [],
  };

  info('Starting stock events ingestion', { daysAhead });

  try {
    // Step 1: Get all beta users
    const users = await fetchBetaUsers(betaUsersDatabaseId, notionAdminToken);
    metrics.totalUsers = users.length;
    metrics.notionApiCalls++;

    info(`Found ${users.length} beta users`, { userCount: users.length });

    // Step 2: Collect all unique tickers from Portfolio/Watchlist stocks
    const tickerMap = await collectPortfolioWatchlistStocks(users, metrics);
    metrics.totalStocks = tickerMap.size;

    info(`Collected ${metrics.totalStocks} unique tickers`, {
      totalStocks: metrics.totalStocks,
      portfolioStocks: metrics.portfolioStocks,
      watchlistStocks: metrics.watchlistStocks,
    });

    // Step 3: Fetch events from FMP for all tickers (next 90 days)
    const events = await fetchEventsFromFMP(
      fmpClient,
      Array.from(tickerMap.keys()),
      daysAhead,
      metrics
    );

    info(`Fetched ${events.length} events from FMP`, { eventCount: events.length });

    // Step 4: Distribute events to users who own those stocks
    await distributeEventsToUsers(events, tickerMap, metrics);

    // Step 5: Finalize metrics
    metrics.endTime = new Date();
    metrics.durationMs = timer.end(true);

    info('Stock events ingestion completed', {
      duration: `${(metrics.durationMs / 1000).toFixed(1)}s`,
      eventsCreated: metrics.eventsCreated,
      eventsUpdated: metrics.eventsUpdated,
      errors: metrics.errors.length,
      warnings: metrics.warnings.length,
    });

    return metrics;
  } catch (err) {
    timer.endWithError(err as Error);
    logError('Stock events ingestion failed', {}, err as Error);
    throw err;
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Fetch all approved beta users from Beta Users database
 */
async function fetchBetaUsers(
  databaseId: string,
  adminToken: string
): Promise<BetaUser[]> {
  const notion = new Client({ auth: adminToken, notionVersion: '2025-09-03' });
  const users: BetaUser[] = [];

  try {
    // Get data source ID for API v2025-09-03
    const dataSourceId = await getDataSourceId(notion, databaseId);

    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
          property: 'Status',
          select: {
            equals: 'Approved',
          },
        },
        start_cursor: startCursor,
      });

      for (const page of response.results) {
        const props = (page as any).properties;

        // Extract user data
        const userId = page.id;
        const email = props.Email?.email || '';
        const name = props.Name?.title?.[0]?.plain_text || '';
        const encryptedToken = props['Access Token']?.rich_text?.[0]?.plain_text || '';
        const timezone = props.Timezone?.rich_text?.[0]?.plain_text || 'America/Los_Angeles';

        // Extract database IDs (multi-tenant configuration)
        const stockAnalysesDbId = props['Stock Analyses DB ID']?.rich_text?.[0]?.plain_text || undefined;
        const stockHistoryDbId = props['Stock History DB ID']?.rich_text?.[0]?.plain_text || undefined;
        const stockEventsDbId = props['Stock Events DB ID']?.rich_text?.[0]?.plain_text || undefined;

        if (!encryptedToken) {
          warn('User missing access token, skipping', { userId, email });
          continue;
        }

        // Decrypt access token
        let accessToken: string;
        try {
          accessToken = await decryptToken(encryptedToken);
        } catch (error) {
          warn('Failed to decrypt access token for user', { userId, email, error });
          continue;
        }

        users.push({
          userId,
          email,
          name,
          accessToken,
          timezone,
          stockAnalysesDbId,
          stockHistoryDbId,
          stockEventsDbId,
        });
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
    }

    return users;
  } catch (err) {
    logError('Failed to fetch beta users', {}, err as Error);
    throw err;
  }
}

/**
 * Discover user's Stock Analyses and Stock Events databases
 */
async function discoverUserDatabases(user: BetaUser): Promise<void> {
  try {
    const notion = new Client({ auth: user.accessToken, notionVersion: '2025-09-03' });

    // Search for databases in user's workspace
    const response = await notion.search({
      filter: { property: 'object', value: 'data_source' },
      page_size: 100,
    });

    // Find Stock Analyses database
    for (const db of response.results) {
      const title = (db as any).title?.[0]?.plain_text || '';

      if (title.toLowerCase().includes('stock analyses')) {
        user.stockAnalysesDbId = db.id;
      } else if (title.toLowerCase().includes('stock events')) {
        user.stockEventsDbId = db.id;
      }
    }

    if (!user.stockAnalysesDbId) {
      warn('Stock Analyses database not found for user', { email: user.email });
    }

    if (!user.stockEventsDbId) {
      warn('Stock Events database not found for user', { email: user.email });
    }
  } catch (err) {
    warn('Failed to discover databases for user', { email: user.email, error: err });
  }
}

/**
 * Collect all Portfolio/Watchlist stocks from all users
 * Returns Map<ticker, BetaUser[]> for deduplication
 */
async function collectPortfolioWatchlistStocks(
  users: BetaUser[],
  metrics: StockEventsIngestionMetrics
): Promise<Map<string, BetaUser[]>> {
  const tickerMap = new Map<string, BetaUser[]>();

  for (const user of users) {
    try {
      // Check if user has Stock Analyses DB configured
      if (!user.stockAnalysesDbId) {
        // Fallback: Try to discover via search (for backwards compatibility)
        await discoverUserDatabases(user);
        metrics.notionApiCalls++; // Database search

        if (!user.stockAnalysesDbId) {
          warn('Stock Analyses DB ID not configured, skipping user', { email: user.email });
          metrics.usersFailed++;
          continue;
        }
      }

      const notion = new Client({ auth: user.accessToken, notionVersion: '2025-09-03' });

      // Get data source ID for Stock Analyses database
      const dataSourceId = await getDataSourceId(notion, user.stockAnalysesDbId);

      // Query Stock Analyses for Portfolio or Watchlist stocks
      // Try with Stock Type filter first, fall back to all stocks if property doesn't exist
      let response: any;
      try {
        response = await notion.dataSources.query({
          data_source_id: dataSourceId,
          filter: {
            or: [
              {
                property: 'Stock Type',
                select: {
                  equals: 'Portfolio',
                },
              },
              {
                property: 'Stock Type',
                select: {
                  equals: 'Watchlist',
                },
              },
            ],
          },
        });
        metrics.notionApiCalls++;
      } catch (filterError: any) {
        // If Stock Type property doesn't exist, query all stocks
        if (filterError?.code === 'validation_error' && filterError?.message?.includes('Stock Type')) {
          info(`Stock Type property not found for user ${user.email}, fetching all stocks`);
          response = await notion.dataSources.query({
            data_source_id: dataSourceId,
          });
          metrics.notionApiCalls++;
        } else {
          throw filterError;
        }
      }

      // Extract tickers
      for (const page of response.results) {
        const ticker = (page as any).properties.Ticker?.title?.[0]?.plain_text || '';
        const stockType = (page as any).properties['Stock Type']?.select?.name || '';

        if (!ticker) continue;

        // Track stock type metrics
        if (stockType === 'Portfolio') {
          metrics.portfolioStocks++;
        } else if (stockType === 'Watchlist') {
          metrics.watchlistStocks++;
        }

        // Add user to ticker's subscriber list
        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, []);
        }
        tickerMap.get(ticker)!.push(user);
      }

      info(`Collected stocks for user ${user.email}`, {
        email: user.email,
        stockCount: response.results.length,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      warn(`Failed to fetch stocks for user ${user.email}`, { error: err });
      metrics.warnings.push(`User ${user.email}: Failed to fetch stocks - ${errorMsg}`);
      metrics.usersFailed++;
    }
  }

  return tickerMap;
}

/**
 * Fetch events from FMP for all tickers (next N days)
 */
async function fetchEventsFromFMP(
  fmpClient: FMPClient,
  tickers: string[],
  daysAhead: number,
  metrics: StockEventsIngestionMetrics
): Promise<StockEventData[]> {
  const events: StockEventData[] = [];

  // Calculate date range
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  const fromDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const toDate = endDate.toISOString().split('T')[0];

  info('Fetching events from FMP', { fromDate, toDate, tickerCount: tickers.length });

  try {
    // Fetch all event types in parallel
    const [earningsEvents, dividendEvents, splitEvents] = await Promise.all([
      fmpClient.getEarningsCalendar(fromDate, toDate),
      fmpClient.getDividendCalendar(fromDate, toDate),
      fmpClient.getStockSplitCalendar(fromDate, toDate),
      // Economic calendar disabled for Phase 1 (too noisy, need filtering)
      // fmpClient.getEconomicCalendar(fromDate, toDate),
    ]);

    metrics.fmpApiCalls += 3; // 3 calendar endpoints called

    // Filter to only our tracked tickers
    const tickerSet = new Set(tickers.map(t => t.toUpperCase()));

    // Transform earnings events
    for (const event of earningsEvents) {
      if (!tickerSet.has(event.symbol?.toUpperCase())) continue;

      const description = event.epsEstimated
        ? `Expected EPS: $${event.epsEstimated.toFixed(2)}`
        : 'Earnings call scheduled';

      // Extract fiscal quarter/year if available
      let fiscalQuarter: string | undefined;
      let fiscalYear: number | undefined;

      if (event.fiscalDateEnding) {
        const fiscalDate = new Date(event.fiscalDateEnding);
        fiscalYear = fiscalDate.getFullYear();
        const month = fiscalDate.getMonth() + 1;
        fiscalQuarter = `Q${Math.ceil(month / 3)}`;
      }

      events.push({
        ticker: event.symbol,
        eventType: 'Earnings Call',
        eventDate: event.date,
        description,
        confidence: 'High',
        timingPrecision: 'Date Confirmed',
        eventSource: 'FMP API',
        epsEstimate: event.epsEstimated || undefined,
        fiscalQuarter,
        fiscalYear,
      });
    }

    // Transform dividend events
    for (const event of dividendEvents) {
      if (!tickerSet.has(event.symbol?.toUpperCase())) continue;

      const amount = event.dividend || event.adjDividend || 0;
      const description = amount > 0
        ? `Dividend: $${amount.toFixed(2)} per share`
        : 'Dividend payment scheduled';

      events.push({
        ticker: event.symbol,
        eventType: 'Dividend',
        eventDate: event.date,
        description,
        confidence: 'High',
        timingPrecision: 'Date Confirmed',
        eventSource: 'FMP API',
        dividendAmount: amount || undefined,
      });
    }

    // Transform stock split events
    for (const event of splitEvents) {
      if (!tickerSet.has(event.symbol?.toUpperCase())) continue;

      const ratio = event.numerator && event.denominator
        ? `${event.numerator}:${event.denominator}`
        : 'TBD';

      const description = `Stock split: ${ratio}`;

      events.push({
        ticker: event.symbol,
        eventType: 'Stock Split',
        eventDate: event.date,
        description,
        confidence: 'High',
        timingPrecision: 'Date Confirmed',
        eventSource: 'FMP API',
        splitRatio: ratio !== 'TBD' ? ratio : undefined,
      });
    }

    metrics.eventsFromFMP = events.length;

    info('FMP events transformed', {
      total: events.length,
      earnings: earningsEvents.filter(e => tickerSet.has(e.symbol?.toUpperCase())).length,
      dividends: dividendEvents.filter(e => tickerSet.has(e.symbol?.toUpperCase())).length,
      splits: splitEvents.filter(e => tickerSet.has(e.symbol?.toUpperCase())).length,
    });

    return events;
  } catch (err) {
    logError('Failed to fetch events from FMP', {}, err as Error);
    metrics.errors.push('FMP API error: ' + (err as Error).message);
    return []; // Graceful degradation
  }
}

/**
 * Distribute events to users' Stock Events databases
 */
async function distributeEventsToUsers(
  events: StockEventData[],
  tickerMap: Map<string, BetaUser[]>,
  metrics: StockEventsIngestionMetrics
): Promise<void> {
  // Group events by ticker for efficient distribution
  const eventsByTicker = new Map<string, StockEventData[]>();

  for (const event of events) {
    const ticker = event.ticker.toUpperCase();
    if (!eventsByTicker.has(ticker)) {
      eventsByTicker.set(ticker, []);
    }
    eventsByTicker.get(ticker)!.push(event);
  }

  // Distribute to users
  for (const [ticker, subscribers] of tickerMap.entries()) {
    const tickerEvents = eventsByTicker.get(ticker.toUpperCase()) || [];

    if (tickerEvents.length === 0) {
      continue; // No events for this ticker
    }

    // Write events to each subscriber's database
    for (const user of subscribers) {
      try {
        // Check if user has Stock Events DB configured
        if (!user.stockEventsDbId) {
          // Fallback: Try to discover via search (for backwards compatibility)
          await discoverUserDatabases(user);
          metrics.notionApiCalls++;

          if (!user.stockEventsDbId) {
            warn('Stock Events DB ID not configured, skipping user', { email: user.email });
            metrics.warnings.push(`User ${user.email}: Missing Stock Events DB ID`);
            continue;
          }
        }

        await writeEventsToNotionDatabase(
          user,
          tickerEvents,
          metrics
        );

        metrics.usersProcessed++;
      } catch (err) {
        warn(`Failed to write events for user ${user.email}`, { error: err });
        metrics.warnings.push(`User ${user.email}: Event write failed`);
        metrics.usersFailed++;
      }
    }
  }
}

/**
 * Write events to a user's Stock Events database
 * Upserts based on (ticker + event_type + event_date)
 */
async function writeEventsToNotionDatabase(
  user: BetaUser,
  events: StockEventData[],
  metrics: StockEventsIngestionMetrics
): Promise<void> {
  const notion = new Client({ auth: user.accessToken, notionVersion: '2025-09-03' });

  for (const event of events) {
    try {
      // Check if event already exists (upsert logic)
      const existingPage = await findExistingEvent(
        notion,
        user.stockEventsDbId!,
        event.ticker,
        event.eventType,
        event.eventDate
      );

      metrics.notionApiCalls++;

      // Look up Stock Analyses page for this ticker (v1.2.17: Event-aware analysis)
      const stockAnalysisPageId = await findStockAnalysisPage(
        notion,
        user.stockAnalysesDbId!,
        event.ticker
      );

      if (stockAnalysisPageId) {
        metrics.notionApiCalls++; // Count the lookup query
      }

      const properties: any = {
        'Event Name': {
          title: [
            {
              text: {
                content: `${event.ticker} ${event.eventType}`,
              },
            },
          ],
        },
        'Event Date': {
          date: {
            start: event.eventDate,
          },
        },
        Ticker: {
          rich_text: [
            {
              text: {
                content: event.ticker,
              },
            },
          ],
        },
        'Event Type': {
          select: {
            name: event.eventType,
          },
        },
        Description: {
          rich_text: [
            {
              text: {
                content: event.description,
              },
            },
          ],
        },
        Status: {
          select: {
            name: 'Upcoming',
          },
        },
        Confidence: {
          select: {
            name: event.confidence,
          },
        },
        'Timing Precision': {
          select: {
            name: event.timingPrecision,
          },
        },
        'Event Source': {
          select: {
            name: event.eventSource,
          },
        },
      };

      // Add event-specific fields
      if (event.epsEstimate !== undefined) {
        properties['EPS Estimate'] = { number: event.epsEstimate };
      }

      if (event.dividendAmount !== undefined) {
        properties['Dividend Amount'] = { number: event.dividendAmount };
      }

      if (event.splitRatio) {
        properties['Split Ratio'] = {
          rich_text: [{ text: { content: event.splitRatio } }],
        };
      }

      if (event.fiscalQuarter) {
        properties['Fiscal Quarter'] = {
          rich_text: [{ text: { content: event.fiscalQuarter } }],
        };
      }

      if (event.fiscalYear !== undefined) {
        properties['Fiscal Year'] = { number: event.fiscalYear };
      }

      // Link to Stock Analyses page (v1.2.17: Event-aware analysis)
      if (stockAnalysisPageId) {
        properties['Stock'] = {
          relation: [{ id: stockAnalysisPageId }],
        };
      }

      // Upsert: Update if exists, create if new
      if (existingPage) {
        await notion.pages.update({
          page_id: existingPage,
          properties,
        });
        metrics.eventsUpdated++;
        metrics.notionApiCalls++;
      } else {
        await notion.pages.create({
          parent: { database_id: user.stockEventsDbId! },
          properties,
        });
        metrics.eventsCreated++;
        metrics.notionApiCalls++;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      warn('Failed to write event to Notion', {
        ticker: event.ticker,
        eventType: event.eventType,
        error: err,
      });
      metrics.eventsSkipped++;
      metrics.warnings.push(
        `Event ${event.ticker} ${event.eventType}: Write failed - ${errorMsg}`
      );
    }
  }
}

/**
 * Find existing event in Stock Events database by (ticker + event_type + event_date)
 * Returns page ID if found, undefined otherwise
 */
async function findExistingEvent(
  notion: Client,
  databaseId: string,
  ticker: string,
  eventType: string,
  eventDate: string
): Promise<string | undefined> {
  try {
    // Get data source ID for API v2025-09-03
    const dataSourceId = await getDataSourceId(notion, databaseId);

    const response = await notion.dataSources.query({
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
            property: 'Event Type',
            select: {
              equals: eventType,
            },
          },
          {
            property: 'Event Date',
            date: {
              equals: eventDate,
            },
          },
        ],
      },
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }

    return undefined;
  } catch (err) {
    warn('Failed to query existing event', { ticker, eventType, eventDate, error: err });
    return undefined; // Assume doesn't exist, will create duplicate (handled by Notion)
  }
}

/**
 * Find Stock Analyses page by ticker
 * Returns page ID if found, undefined otherwise (v1.2.17: Event-aware analysis)
 */
async function findStockAnalysisPage(
  notion: Client,
  stockAnalysesDbId: string,
  ticker: string
): Promise<string | undefined> {
  try {
    // Get data source ID for API v2025-09-03
    const dataSourceId = await getDataSourceId(notion, stockAnalysesDbId);

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Ticker',
        title: {
          equals: ticker,
        },
      },
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }

    return undefined;
  } catch (err) {
    warn('Failed to find Stock Analyses page', { ticker, error: err });
    return undefined; // Graceful degradation - event will be created without Stock relation
  }
}
