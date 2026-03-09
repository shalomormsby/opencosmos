/**
 * Market Context - Main Entry Point
 *
 * Provides high-level API for fetching market context with smart caching.
 * This is the primary interface used by the orchestrator and stock analyzer.
 *
 * v1.1.0 - Market Context Integration
 */

import { FMPClient } from '../../integrations/fmp/client';
import { FREDClient } from '../../integrations/fred/client';
import { MarketContext, MarketDirection } from './types';
import { collectMarketData } from './data-collector';
import {
  classifyMarketRegime,
  determineMarketDirection,
  generateMarketSummary,
  generateKeyInsights,
} from './regime-classifier';
import {
  getCachedMarketContext,
  cacheMarketContext,
} from './cache';

/**
 * Fetch market context with smart caching
 *
 * Flow:
 * 1. Check Redis cache (1-hour TTL)
 * 2. If cache hit, return cached context
 * 3. If cache miss, fetch fresh data from APIs
 * 4. Classify regime and generate insights
 * 5. Cache result and return
 *
 * @param fmpClient FMP API client
 * @param fredClient FRED API client
 * @param forceRefresh Skip cache and fetch fresh data
 * @returns Complete market context
 */
export async function getMarketContext(
  fmpClient: FMPClient,
  fredClient: FREDClient,
  forceRefresh: boolean = false
): Promise<MarketContext> {
  // Check cache first (unless forceRefresh)
  if (!forceRefresh) {
    const cached = await getCachedMarketContext();
    if (cached) {
      return cached;
    }
  }

  // Cache miss or force refresh - fetch fresh data
  console.log('[MARKET] Fetching fresh market context...');
  const startTime = Date.now();

  try {
    // Step 1: Collect all market data
    const { indices, sectors, economic, vix } = await collectMarketData(fmpClient, fredClient);

    // Step 2: Classify market regime
    const regimeClassification = classifyMarketRegime({
      vix,
      spy: indices.spy,
      sectors,
    });

    // Step 3: Determine market direction
    const marketDirection = determineMarketDirection(indices.spy);

    // Step 4: Generate summary and insights
    const topSectors = sectors.slice(0, 3);
    const bottomSectors = sectors.slice(-3);

    const summary = generateMarketSummary({
      regime: regimeClassification.regime,
      confidence: regimeClassification.confidence,
      vix,
      spy: indices.spy,
      topSectors,
      bottomSectors,
    });

    const keyInsights = generateKeyInsights({
      regime: regimeClassification.regime,
      vix,
      spy: indices.spy,
      sectors,
      economic,
    });

    // Step 5: Build complete market context (using Pacific Time)
    const { getPacificTime } = await import('../../core/utils');
    const marketContext: MarketContext = {
      timestamp: new Date().toISOString(), // Keep UTC for internal tracking
      date: getPacificTime('date'), // YYYY-MM-DD in Pacific Time

      // Regime classification
      regime: regimeClassification.regime,
      regimeConfidence: regimeClassification.confidence,
      riskAssessment: regimeClassification.riskAssessment,

      // US Market indices
      spy: indices.spy,
      qqq: indices.qqq,
      dia: indices.dia,
      iwm: indices.iwm,
      vix: vix || 0, // Default to 0 if unavailable
      marketDirection,

      // Sector rotation
      sectorLeaders: topSectors,
      sectorLaggards: bottomSectors,
      allSectors: sectors,

      // Economic environment
      economic,

      // Analysis
      summary,
      keyInsights,
    };

    // Step 6: Cache the result
    await cacheMarketContext(marketContext);

    const duration = Date.now() - startTime;
    console.log(`[MARKET] ✓ Market context fetched and cached (${duration}ms)`);

    return marketContext;
  } catch (error: any) {
    console.error('[MARKET] ❌ Failed to fetch market context:', error);
    console.error('[MARKET]    Error details:', {
      message: error?.message,
      stack: error?.stack?.split('\n')[0], // First line of stack trace
      name: error?.name,
    });

    // Graceful degradation: return neutral context
    console.warn('[MARKET] ⚠️  Returning neutral market context as fallback');
    return await getNeutralMarketContext();
  }
}

/**
 * Fallback market context when data fetch fails
 *
 * Returns a neutral/transition regime with null/zero values
 */
async function getNeutralMarketContext(): Promise<MarketContext> {
  const { getPacificTime } = await import('../../core/utils');

  return {
    timestamp: new Date().toISOString(),
    date: getPacificTime('date'),

    regime: 'Transition',
    regimeConfidence: 0.5,
    riskAssessment: 'Neutral',

    spy: createEmptyIndexData('SPY'),
    qqq: createEmptyIndexData('QQQ'),
    dia: createEmptyIndexData('DIA'),
    iwm: createEmptyIndexData('IWM'),
    vix: 0,
    marketDirection: 'Sideways' as MarketDirection,

    sectorLeaders: [],
    sectorLaggards: [],
    allSectors: [],

    economic: {
      fedFundsRate: null,
      unemployment: null,
      cpiYoY: null,
      yieldCurveSpread: null,
      consumerSentiment: null,
    },

    summary: 'Market context unavailable - using neutral assumptions.',
    keyInsights: ['⚠️ Unable to fetch market data - proceeding with neutral context'],
  };
}

/**
 * Create empty index data (fallback)
 */
function createEmptyIndexData(symbol: string) {
  return {
    symbol,
    price: 0,
    change1D: 0,
    change5D: 0,
    change1M: 0,
    ma50: null,
    ma200: null,
  };
}

/**
 * Get sector data for a specific stock
 *
 * Used by scoring system to determine if stock's sector is in leaders/laggards
 */
export function getSectorDataForStock(
  marketContext: MarketContext,
  stockSector: string
): {
  sectorData: any;
  isLeader: boolean;
  isLaggard: boolean;
  rank: number;
} | null {
  const sectorData = marketContext.allSectors.find(s =>
    s.name.toLowerCase() === stockSector.toLowerCase()
  );

  if (!sectorData) {
    return null;
  }

  const isLeader = sectorData.rank <= 3;
  const isLaggard = sectorData.rank >= 9;

  return {
    sectorData,
    isLeader,
    isLaggard,
    rank: sectorData.rank,
  };
}
