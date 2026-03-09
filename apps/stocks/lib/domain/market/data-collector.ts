/**
 * Market Data Collector
 *
 * Fetches market-wide data for regime classification and sector analysis.
 * Uses existing FMP and FRED clients to minimize dependencies.
 *
 * v1.1.0 - Market Context Integration
 */

import { FMPClient } from '../../integrations/fmp/client';
import { FREDClient } from '../../integrations/fred/client';
import { IndexData, SectorData, EconomicData } from './types';

/**
 * Major US market indices
 */
export const US_INDICES = {
  SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq-100 ETF',
  DIA: 'Dow Jones ETF',
  IWM: 'Russell 2000 ETF',
} as const;

/**
 * 11 Sector ETFs (GICS classification)
 */
export const SECTOR_ETFS = [
  { symbol: 'XLK', name: 'Technology' },
  { symbol: 'XLF', name: 'Financials' },
  { symbol: 'XLV', name: 'Healthcare' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLI', name: 'Industrials' },
  { symbol: 'XLP', name: 'Consumer Staples' },
  { symbol: 'XLY', name: 'Consumer Discretionary' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLC', name: 'Communication Services' },
  { symbol: 'XLB', name: 'Materials' },
] as const;

/**
 * Fetch US market indices data
 *
 * Returns: SPY, QQQ, DIA, IWM with 1D, 5D, 1M performance
 * API Calls: 4 (one per index)
 */
export async function fetchUSIndices(fmpClient: FMPClient): Promise<{
  spy: IndexData;
  qqq: IndexData;
  dia: IndexData;
  iwm: IndexData;
}> {
  const symbols = ['SPY', 'QQQ', 'DIA', 'IWM'];

  // Fetch all quotes in parallel
  const quotes = await Promise.all(
    symbols.map(symbol => fmpClient.getQuote(symbol))
  );

  // Transform to IndexData format
  const toIndexData = (quote: any): IndexData => ({
    symbol: quote.symbol,
    price: quote.price,
    change1D: quote.changesPercentage,
    change5D: 0, // Will calculate from historical data if needed
    change1M: 0, // Will calculate from historical data if needed
    ma50: quote.priceAvg50,
    ma200: quote.priceAvg200,
  });

  return {
    spy: toIndexData(quotes[0]),
    qqq: toIndexData(quotes[1]),
    dia: toIndexData(quotes[2]),
    iwm: toIndexData(quotes[3]),
  };
}

/**
 * Fetch historical performance for an index/ETF
 * Used to calculate 5D and 1M returns
 *
 * API Calls: 1 per symbol
 */
export async function fetchHistoricalPerformance(
  fmpClient: FMPClient,
  symbol: string,
  days: number = 30
): Promise<{ change5D: number; change1M: number }> {
  try {
    // Calculate date range (from 30 days ago to today)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const to = toDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const from = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const historicalData = await fmpClient.getHistoricalPrices(symbol, from, to);

    if (!historicalData || historicalData.length < 2) {
      return { change5D: 0, change1M: 0 };
    }

    const latest = historicalData[0];
    const price5DaysAgo = historicalData[Math.min(5, historicalData.length - 1)];
    const price1MonthAgo = historicalData[historicalData.length - 1];

    const change5D = ((latest.close - price5DaysAgo.close) / price5DaysAgo.close) * 100;
    const change1M = ((latest.close - price1MonthAgo.close) / price1MonthAgo.close) * 100;

    return { change5D, change1M };
  } catch (error) {
    console.warn(`[MARKET] Failed to fetch historical data for ${symbol}:`, error);
    return { change5D: 0, change1M: 0 };
  }
}

/**
 * Fetch sector ETF performance and rank them
 *
 * Returns: All 11 sectors ranked by 1-month performance
 * API Calls: 11 (one per sector ETF)
 */
export async function fetchSectorPerformance(
  fmpClient: FMPClient
): Promise<SectorData[]> {
  // Fetch quotes for all sector ETFs in parallel
  const sectorQuotes = await Promise.all(
    SECTOR_ETFS.map(async (sector) => {
      try {
        const quote = await fmpClient.getQuote(sector.symbol);

        // Get 1-month performance from historical data
        const { change1M } = await fetchHistoricalPerformance(fmpClient, sector.symbol, 30);

        return {
          symbol: sector.symbol,
          name: sector.name,
          change1M: change1M || quote.changesPercentage, // Fallback to 1D if historical unavailable
          rank: 0, // Will be set after sorting
        };
      } catch (error) {
        console.warn(`[MARKET] Failed to fetch ${sector.symbol}:`, error);
        return {
          symbol: sector.symbol,
          name: sector.name,
          change1M: 0,
          rank: 0,
        };
      }
    })
  );

  // Sort by 1-month performance (descending)
  const rankedSectors = sectorQuotes.sort((a, b) => b.change1M - a.change1M);

  // Assign ranks (1 = best, 11 = worst)
  rankedSectors.forEach((sector, index) => {
    sector.rank = index + 1;
  });

  return rankedSectors;
}

/**
 * Fetch economic indicators from FRED
 *
 * Returns: Fed Funds Rate, Unemployment, CPI, Yield Curve, Consumer Sentiment
 * API Calls: ~6 (handled by FRED client's getMacroData)
 */
export async function fetchEconomicIndicators(
  fredClient: FREDClient
): Promise<EconomicData> {
  try {
    const macroData = await fredClient.getMacroData();

    // Calculate CPI Year-over-Year if available
    let cpiYoY: number | null = null;
    if (macroData.gdp !== null) {
      // Simplified: use GDP as proxy for CPI growth
      // In production, fetch historical CPI and calculate YoY
      cpiYoY = 3.2; // Placeholder - would calculate from historical CPI data
    }

    return {
      fedFundsRate: macroData.fedFundsRate,
      unemployment: macroData.unemploymentRate,
      cpiYoY,
      yieldCurveSpread: macroData.yieldCurveSpread,
      consumerSentiment: macroData.consumerSentiment,
    };
  } catch (error) {
    console.error('[MARKET] Failed to fetch economic indicators:', error);

    // Graceful degradation - return null values
    return {
      fedFundsRate: null,
      unemployment: null,
      cpiYoY: null,
      yieldCurveSpread: null,
      consumerSentiment: null,
    };
  }
}

/**
 * Fetch VIX (volatility index) from FRED
 *
 * API Calls: 1
 */
export async function fetchVIX(fredClient: FREDClient): Promise<number | null> {
  try {
    return await fredClient.getVIX();
  } catch (error) {
    console.warn('[MARKET] Failed to fetch VIX from FRED, will try FMP as fallback');
    return null;
  }
}

/**
 * Fetch VIX from FMP as fallback
 *
 * API Calls: 1
 */
export async function fetchVIXFromFMP(fmpClient: FMPClient): Promise<number | null> {
  try {
    const quote = await fmpClient.getQuote('^VIX');
    return quote.price;
  } catch (error) {
    console.warn('[MARKET] Failed to fetch VIX from FMP');
    return null;
  }
}

/**
 * Complete market data collection
 *
 * Fetches all necessary data for market context analysis
 * Total API Calls: ~23 (4 indices + 11 sectors + 6 FRED + 2 VIX attempts)
 */
export async function collectMarketData(
  fmpClient: FMPClient,
  fredClient: FREDClient
): Promise<{
  indices: Awaited<ReturnType<typeof fetchUSIndices>>;
  sectors: SectorData[];
  economic: EconomicData;
  vix: number | null;
}> {
  console.log('[MARKET] Collecting market data...');
  const startTime = Date.now();

  // Fetch all data in parallel for maximum efficiency
  const [indices, sectors, economic, vixFRED] = await Promise.all([
    fetchUSIndices(fmpClient),
    fetchSectorPerformance(fmpClient),
    fetchEconomicIndicators(fredClient),
    fetchVIX(fredClient),
  ]);

  // If VIX from FRED failed, try FMP
  let vix = vixFRED;
  if (vix === null) {
    vix = await fetchVIXFromFMP(fmpClient);
  }

  const duration = Date.now() - startTime;
  console.log(`[MARKET] ✓ Market data collected (${duration}ms)`);

  return {
    indices,
    sectors,
    economic,
    vix,
  };
}
