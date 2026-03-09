/**
 * FRED (Federal Reserve Economic Data) API Client
 *
 * Handles macroeconomic data fetching from FRED API.
 * Used for macro scoring component in stock analysis.
 *
 * Features:
 * - 20-second timeout protection
 * - Structured logging for all operations
 * - Graceful handling of missing data (returns null)
 * - Custom error types for better debugging
 *
 * Documentation: https://fred.stlouisfed.org/docs/api/
 */

import axios, { AxiosInstance } from 'axios';
import { createTimer, warn, logAPICall } from '../../core/logger';
import { withRetry } from '../../core/utils';

interface FREDConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface FREDSeries {
  id: string;
  realtime_start: string;
  realtime_end: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  frequency_short: string;
  units: string;
  units_short: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short: string;
  last_updated: string;
  popularity: number;
  notes: string;
}

interface FREDObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

interface FREDSeriesData {
  observations: FREDObservation[];
}

/**
 * FRED Series IDs for macro indicators
 */
export const FRED_SERIES = {
  FED_FUNDS_RATE: 'DFF', // Daily Federal Funds Rate
  UNEMPLOYMENT: 'UNRATE', // Unemployment Rate
  INFLATION_CPI: 'CPIAUCSL', // Consumer Price Index
  GDP: 'GDP', // Gross Domestic Product
  TREASURY_10Y: 'DGS10', // 10-Year Treasury Constant Maturity Rate
  TREASURY_2Y: 'DGS2', // 2-Year Treasury Constant Maturity Rate
  VIX: 'VIXCLS', // CBOE Volatility Index (VIX)
  CONSUMER_SENTIMENT: 'UMCSENT', // University of Michigan Consumer Sentiment
} as const;

export class FREDClient {
  private client: AxiosInstance;
  private apiKey: string;
  private readonly TIMEOUT_MS = 20000; // 20 seconds for FRED API

  constructor(config: FREDConfig) {
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.stlouisfed.org/fred',
      timeout: config.timeout || this.TIMEOUT_MS,
      params: {
        api_key: this.apiKey,
        file_type: 'json',
      },
    });
  }

  /**
   * Get series information
   */
  async getSeries(seriesId: string): Promise<FREDSeries> {
    const response = await this.client.get('/series', {
      params: {
        series_id: seriesId,
      },
    });

    return response.data.seriess[0];
  }

  /**
   * Get series observations (data points)
   * @param seriesId FRED series ID
   * @param limit Number of observations to retrieve (default: 1 - latest)
   */
  async getObservations(
    seriesId: string,
    limit: number = 1
  ): Promise<FREDObservation[]> {
    const response = await withRetry(
      async () =>
        await this.client.get<FREDSeriesData>('/series/observations', {
          params: {
            series_id: seriesId,
            sort_order: 'desc', // Get latest first
            limit,
          },
        }),
      `FRED getObservations(${seriesId})`
    );

    return response.data.observations || [];
  }

  /**
   * Get latest value for a series
   * Returns null if value is "." (missing data)
   */
  async getLatestValue(seriesId: string): Promise<number | null> {
    const observations = await this.getObservations(seriesId, 1);

    if (observations.length === 0) {
      return null;
    }

    const value = observations[0].value;

    // FRED uses "." to indicate missing data
    if (value === '.') {
      return null;
    }

    return parseFloat(value);
  }

  /**
   * Get Federal Funds Rate (overnight lending rate)
   */
  async getFedFundsRate(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.FED_FUNDS_RATE);
  }

  /**
   * Get Unemployment Rate (%)
   */
  async getUnemploymentRate(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.UNEMPLOYMENT);
  }

  /**
   * Get Consumer Price Index (inflation indicator)
   */
  async getInflationCPI(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.INFLATION_CPI);
  }

  /**
   * Get GDP
   */
  async getGDP(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.GDP);
  }

  /**
   * Get 10-Year Treasury Yield (%)
   */
  async getTreasury10Y(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.TREASURY_10Y);
  }

  /**
   * Get 2-Year Treasury Yield (%)
   */
  async getTreasury2Y(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.TREASURY_2Y);
  }

  /**
   * Get Yield Curve Spread (10Y - 2Y)
   * Negative spread often indicates recession risk
   */
  async getYieldCurveSpread(): Promise<number | null> {
    const [treasury10y, treasury2y] = await Promise.all([
      this.getTreasury10Y(),
      this.getTreasury2Y(),
    ]);

    if (treasury10y === null || treasury2y === null) {
      return null;
    }

    return treasury10y - treasury2y;
  }

  /**
   * Get VIX (market volatility index)
   */
  async getVIX(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.VIX);
  }

  /**
   * Get Consumer Sentiment Index
   */
  async getConsumerSentiment(): Promise<number | null> {
    return this.getLatestValue(FRED_SERIES.CONSUMER_SENTIMENT);
  }

  /**
   * Helper: Get all macro data needed for stock analysis
   *
   * Optimized to minimize API calls (6 calls total).
   * Uses graceful degradation - returns null for unavailable data.
   * All fields are optional as macro data may not always be available.
   */
  async getMacroData() {
    const timer = createTimer('FRED getMacroData (batch)');

    try {
      // Fetch all data with Promise.allSettled for graceful degradation
      const results = await Promise.allSettled([
        this.getFedFundsRate(),
        this.getUnemploymentRate(),
        this.getYieldCurveSpread(),
        this.getVIX(),
        this.getConsumerSentiment(),
        this.getGDP(),
      ]);

      // Extract results (all gracefully return null if unavailable)
      const fedFundsRate = results[0].status === 'fulfilled' ? results[0].value : null;
      const unemploymentRate = results[1].status === 'fulfilled' ? results[1].value : null;
      const yieldCurveSpread = results[2].status === 'fulfilled' ? results[2].value : null;
      const vix = results[3].status === 'fulfilled' ? results[3].value : null;
      const consumerSentiment = results[4].status === 'fulfilled' ? results[4].value : null;
      const gdp = results[5].status === 'fulfilled' ? results[5].value : null;

      // Log warnings for missing data
      const missingData: string[] = [];
      if (results[0].status === 'rejected') missingData.push('Fed Funds Rate');
      if (results[1].status === 'rejected') missingData.push('Unemployment');
      if (results[2].status === 'rejected') missingData.push('Yield Curve');
      if (results[3].status === 'rejected') missingData.push('VIX');
      if (results[4].status === 'rejected') missingData.push('Consumer Sentiment');
      if (results[5].status === 'rejected') missingData.push('GDP');

      if (missingData.length > 0) {
        warn('Some FRED data unavailable, using graceful degradation', {
          missingData,
        });
      }

      const duration = timer.end(true);
      logAPICall('FRED', 'getMacroData', duration, true, {
        missingDataCount: missingData.length,
      });

      return {
        fedFundsRate,
        unemploymentRate,
        yieldCurveSpread,
        vix,
        consumerSentiment,
        gdp,
      };
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FRED', 'getMacroData', 0, false);
      throw error;
    }
  }

  /**
   * Get historical data for a series
   * Useful for trend analysis
   */
  async getHistoricalData(
    seriesId: string,
    limit: number = 30
  ): Promise<Array<{ date: string; value: number | null }>> {
    const observations = await this.getObservations(seriesId, limit);

    return observations.map((obs) => ({
      date: obs.date,
      value: obs.value === '.' ? null : parseFloat(obs.value),
    }));
  }
}

/**
 * Create FRED client instance
 */
export function createFREDClient(apiKey: string): FREDClient {
  return new FREDClient({ apiKey });
}
