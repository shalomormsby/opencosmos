/**
 * Financial Modeling Prep API Client
 *
 * Handles all API calls to FMP for technical and fundamental stock data.
 * Replaces Polygon.io + Alpha Vantage from v0.x architecture.
 *
 * Features:
 * - 30-second timeout protection
 * - Structured logging for all operations
 * - Graceful handling of missing data
 * - Custom error types for better debugging
 *
 * Documentation: https://site.financialmodelingprep.com/developer/docs
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { DataNotFoundError, APITimeoutError, APIResponseError } from '../../core/errors';
import { createTimer, warn, logAPICall } from '../../core/logger';
import { withRetry } from '../../core/utils';

interface FMPConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface StockQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  change: number;
  changePercent: number;
}

interface TechnicalIndicator {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Dynamic property based on indicator type
  rsi?: number;
  sma?: number;
  ema?: number;
  [key: string]: any; // Allow other indicator types
}

interface CompanyProfile {
  symbol: string;
  companyName: string;
  currency: string;
  exchange: string;
  industry: string;
  sector: string;
  country: string;
  marketCap: number;
  beta: number;
  description: string;
  ceo: string;
  fullTimeEmployees: string;
  website: string;
}

interface IncomeStatement {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  epsDiluted: number;
}

interface BalanceSheet {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalDebt: number;
  totalEquity: number;
  cashAndCashEquivalents: number;
}

interface FinancialRatios {
  date: string;
  symbol: string;
  period: string;
  // Correct property names from FMP API
  debtEquityRatio: number;
  debtToEquity?: number; // Alias for backwards compatibility
  currentRatio: number;
  quickRatio: number;
  priceEarningsRatio: number;
  priceToEarningsRatio?: number; // Alias for backwards compatibility
  priceToBookRatio: number;
  returnOnEquity: number;
  returnOnAssets: number;
  [key: string]: any; // Allow other ratios
}

// Event Calendar Interfaces (v1.2.16 - Stock Events Pipeline)

export interface EarningsCalendarEvent {
  symbol: string;
  date: string; // Date of earnings call (YYYY-MM-DD)
  eps?: number | null; // Actual EPS (null if not yet reported)
  epsEstimated?: number | null; // Estimated EPS
  time?: string; // "bmo" (before market open), "amc" (after market close), or specific time
  revenue?: number | null; // Actual revenue
  revenueEstimated?: number | null; // Estimated revenue
  fiscalDateEnding?: string; // Quarter/year end date
  updatedFromDate?: string; // Last update timestamp
}

export interface DividendCalendarEvent {
  symbol: string;
  date: string; // Ex-dividend date (YYYY-MM-DD)
  label?: string; // e.g., "August 07, 2023"
  adjDividend?: number; // Adjusted dividend amount per share
  dividend?: number; // Dividend amount per share
  recordDate?: string; // Record date
  paymentDate?: string; // Payment date
  declarationDate?: string; // Declaration date
}

export interface StockSplitEvent {
  symbol: string;
  date: string; // Split date (YYYY-MM-DD)
  label?: string; // e.g., "August 31, 2020"
  numerator?: number; // Split ratio numerator (e.g., 4 in "4:1")
  denominator?: number; // Split ratio denominator (e.g., 1 in "4:1")
}

export interface EconomicCalendarEvent {
  event: string; // Event name (e.g., "GDP Growth Rate")
  date: string; // Event date (YYYY-MM-DD HH:MM:SS)
  country?: string; // Country code (e.g., "US")
  actual?: number | null; // Actual value
  previous?: number | null; // Previous value
  estimate?: number | null; // Estimated value
  change?: number | null; // Change from previous
  changePercentage?: number | null; // Change percentage
  impact?: string; // "High", "Medium", "Low"
}

export class FMPClient {
  private client: AxiosInstance;
  private apiKey: string;
  private readonly TIMEOUT_MS = 30000; // 30 seconds for FMP API

  constructor(config: FMPConfig) {
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://financialmodelingprep.com/api/v3',
      timeout: config.timeout || this.TIMEOUT_MS,
      params: {
        apikey: this.apiKey,
      },
    });
  }

  /**
   * Handle axios errors and convert to custom error types
   */
  private handleError(error: unknown, operation: string, _symbol?: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Timeout error
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        throw new APITimeoutError('Financial Modeling Prep', this.TIMEOUT_MS);
      }

      // HTTP error response
      if (axiosError.response) {
        throw new APIResponseError(
          'Financial Modeling Prep',
          axiosError.response.status,
          axiosError.message
        );
      }

      // Network error
      if (axiosError.request) {
        throw new Error(`FMP network error during ${operation}: ${axiosError.message}`);
      }
    }

    // Unknown error
    throw error;
  }

  /**
   * Get real-time stock quote
   *
   * @throws DataNotFoundError if quote not found
   * @throws APITimeoutError if request times out
   * @throws APIResponseError if API returns error
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const timer = createTimer('FMP getQuote', { symbol });

    try {
      const response = await withRetry(
        async () => await this.client.get<StockQuote[]>(`/quote/${symbol}`),
        `FMP getQuote(${symbol})`
      );

      if (!response.data || response.data.length === 0) {
        throw new DataNotFoundError(symbol, 'quote data');
      }

      const duration = timer.end(true);
      logAPICall('FMP', 'getQuote', duration, true, { symbol });

      return response.data[0];
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FMP', 'getQuote', 0, false, { symbol });
      this.handleError(error, 'getQuote', symbol);
    }
  }

  /**
   * Get historical price data
   * @param symbol Stock symbol
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   */
  async getHistoricalPrices(
    symbol: string,
    from?: string,
    to?: string
  ): Promise<HistoricalPrice[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const response = await this.client.get<{ historical: HistoricalPrice[] }>(
      `/historical-price-full/${symbol}`,
      { params }
    );

    return response.data.historical || [];
  }

  /**
   * Get RSI (Relative Strength Index)
   * @param symbol Stock symbol
   * @param period RSI period (typically 14)
   * @param timeframe Timeframe: 1min, 5min, 15min, 30min, 1hour, 4hour, daily
   */
  async getRSI(
    symbol: string,
    period: number = 14,
    timeframe: string = 'daily'
  ): Promise<TechnicalIndicator[]> {
    const response = await this.client.get<TechnicalIndicator[]>(
      `/technical_indicator/${timeframe}/${symbol}`,
      {
        params: {
          type: 'rsi',
          period,
        },
      }
    );

    return response.data || [];
  }

  /**
   * Get SMA (Simple Moving Average)
   */
  async getSMA(
    symbol: string,
    period: number = 50,
    timeframe: string = 'daily'
  ): Promise<TechnicalIndicator[]> {
    const response = await this.client.get<TechnicalIndicator[]>(
      `/technical_indicator/${timeframe}/${symbol}`,
      {
        params: {
          type: 'sma',
          period,
        },
      }
    );

    return response.data || [];
  }

  /**
   * Get EMA (Exponential Moving Average)
   */
  async getEMA(
    symbol: string,
    period: number = 12,
    timeframe: string = 'daily'
  ): Promise<TechnicalIndicator[]> {
    const response = await this.client.get<TechnicalIndicator[]>(
      `/technical_indicator/${timeframe}/${symbol}`,
      {
        params: {
          type: 'ema',
          period,
        },
      }
    );

    return response.data || [];
  }

  /**
   * Get company profile and fundamental info
   *
   * @throws DataNotFoundError if profile not found
   * @throws APITimeoutError if request times out
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const timer = createTimer('FMP getCompanyProfile', { symbol });

    try {
      const response = await withRetry(
        async () => await this.client.get<CompanyProfile[]>(`/profile/${symbol}`),
        `FMP getCompanyProfile(${symbol})`
      );

      if (!response.data || response.data.length === 0) {
        throw new DataNotFoundError(symbol, 'company profile');
      }

      const duration = timer.end(true);
      logAPICall('FMP', 'getCompanyProfile', duration, true, { symbol });

      return response.data[0];
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FMP', 'getCompanyProfile', 0, false, { symbol });
      this.handleError(error, 'getCompanyProfile', symbol);
    }
  }

  /**
   * Get income statements (annual or quarterly)
   * @param symbol Stock symbol
   * @param period 'annual' or 'quarter'
   * @param limit Number of statements to retrieve
   */
  async getIncomeStatement(
    symbol: string,
    period: 'annual' | 'quarter' = 'annual',
    limit: number = 4
  ): Promise<IncomeStatement[]> {
    const response = await this.client.get<IncomeStatement[]>(
      `/income-statement/${symbol}`,
      {
        params: {
          period,
          limit,
        },
      }
    );

    return response.data || [];
  }

  /**
   * Get balance sheets
   */
  async getBalanceSheet(
    symbol: string,
    period: 'annual' | 'quarter' = 'annual',
    limit: number = 4
  ): Promise<BalanceSheet[]> {
    const response = await this.client.get<BalanceSheet[]>(
      `/balance-sheet-statement/${symbol}`,
      {
        params: {
          period,
          limit,
        },
      }
    );

    return response.data || [];
  }

  /**
   * Get financial ratios
   */
  async getFinancialRatios(
    symbol: string,
    period: 'annual' | 'quarter' = 'annual',
    limit: number = 4
  ): Promise<FinancialRatios[]> {
    const response = await this.client.get<FinancialRatios[]>(
      `/ratios/${symbol}`,
      {
        params: {
          period,
          limit,
        },
      }
    );

    return response.data || [];
  }

  // ========================================
  // EVENT CALENDAR METHODS (v1.2.16)
  // For Stock Events Pipeline
  // ========================================

  /**
   * Get earnings calendar for a date range
   *
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @returns Array of earnings events
   *
   * @example
   * const events = await fmpClient.getEarningsCalendar('2025-01-01', '2025-03-31');
   */
  async getEarningsCalendar(from: string, to: string): Promise<EarningsCalendarEvent[]> {
    const timer = createTimer('FMP getEarningsCalendar', { from, to });

    try {
      const response = await this.client.get<EarningsCalendarEvent[]>(
        '/earning_calendar',
        {
          params: { from, to },
        }
      );

      const duration = timer.end(true);
      logAPICall('FMP', 'getEarningsCalendar', duration, true, {
        from,
        to,
        count: response.data?.length || 0
      });

      return response.data || [];
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FMP', 'getEarningsCalendar', 0, false, { from, to });
      warn('FMP earnings calendar fetch failed, returning empty array', { from, to, error });
      return []; // Graceful degradation - optional data
    }
  }

  /**
   * Get dividend calendar for a date range
   *
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @returns Array of dividend events
   *
   * @example
   * const events = await fmpClient.getDividendCalendar('2025-01-01', '2025-03-31');
   */
  async getDividendCalendar(from: string, to: string): Promise<DividendCalendarEvent[]> {
    const timer = createTimer('FMP getDividendCalendar', { from, to });

    try {
      const response = await this.client.get<DividendCalendarEvent[]>(
        '/stock_dividend_calendar',
        {
          params: { from, to },
        }
      );

      const duration = timer.end(true);
      logAPICall('FMP', 'getDividendCalendar', duration, true, {
        from,
        to,
        count: response.data?.length || 0
      });

      return response.data || [];
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FMP', 'getDividendCalendar', 0, false, { from, to });
      warn('FMP dividend calendar fetch failed, returning empty array', { from, to, error });
      return []; // Graceful degradation - optional data
    }
  }

  /**
   * Get stock split calendar for a date range
   *
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @returns Array of stock split events
   *
   * @example
   * const events = await fmpClient.getStockSplitCalendar('2025-01-01', '2025-03-31');
   */
  async getStockSplitCalendar(from: string, to: string): Promise<StockSplitEvent[]> {
    const timer = createTimer('FMP getStockSplitCalendar', { from, to });

    try {
      const response = await this.client.get<StockSplitEvent[]>(
        '/stock_split_calendar',
        {
          params: { from, to },
        }
      );

      const duration = timer.end(true);
      logAPICall('FMP', 'getStockSplitCalendar', duration, true, {
        from,
        to,
        count: response.data?.length || 0
      });

      return response.data || [];
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FMP', 'getStockSplitCalendar', 0, false, { from, to });
      warn('FMP stock split calendar fetch failed, returning empty array', { from, to, error });
      return []; // Graceful degradation - optional data
    }
  }

  /**
   * Get economic calendar for a date range
   * Used to track guidance and macroeconomic events
   *
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   * @returns Array of economic events
   *
   * @example
   * const events = await fmpClient.getEconomicCalendar('2025-01-01', '2025-03-31');
   */
  async getEconomicCalendar(from: string, to: string): Promise<EconomicCalendarEvent[]> {
    const timer = createTimer('FMP getEconomicCalendar', { from, to });

    try {
      const response = await this.client.get<EconomicCalendarEvent[]>(
        '/economic_calendar',
        {
          params: { from, to },
        }
      );

      const duration = timer.end(true);
      logAPICall('FMP', 'getEconomicCalendar', duration, true, {
        from,
        to,
        count: response.data?.length || 0
      });

      return response.data || [];
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FMP', 'getEconomicCalendar', 0, false, { from, to });
      warn('FMP economic calendar fetch failed, returning empty array', { from, to, error });
      return []; // Graceful degradation - optional data
    }
  }

  /**
   * Helper: Get all data needed for stock analysis in one batch
   *
   * Optimized to minimize API calls. Uses graceful degradation:
   * - Critical fields (quote, profile) will throw if missing
   * - Optional fields (technical indicators, fundamentals) return empty arrays if unavailable
   *
   * @throws DataNotFoundError if critical data (quote or profile) is missing
   * @throws APITimeoutError if request times out
   */
  async getAnalysisData(symbol: string) {
    const timer = createTimer('FMP getAnalysisData (batch)', { symbol });

    try {
      // Fetch all data in parallel with Promise.allSettled for graceful degradation
      const results = await Promise.allSettled([
        this.getQuote(symbol), // 0 - Critical
        this.getCompanyProfile(symbol), // 1 - Critical
        this.getHistoricalPrices(symbol), // 2 - Optional
        this.getRSI(symbol, 14), // 3 - Optional
        this.getSMA(symbol, 50), // 4 - Optional
        this.getSMA(symbol, 200), // 5 - Optional
        this.getEMA(symbol, 12), // 6 - Optional
        this.getEMA(symbol, 26), // 7 - Optional
        this.getIncomeStatement(symbol, 'annual', 2), // 8 - Optional
        this.getBalanceSheet(symbol, 'annual', 2), // 9 - Optional
        this.getFinancialRatios(symbol, 'annual', 2), // 10 - Optional
      ]);

      // Extract critical data (must succeed)
      if (results[0].status === 'rejected') {
        throw results[0].reason;
      }
      if (results[1].status === 'rejected') {
        throw results[1].reason;
      }

      const quote = results[0].value;
      const profile = results[1].value;

      // Extract optional data (graceful degradation)
      const historical30d =
        results[2].status === 'fulfilled' ? results[2].value : [];
      const rsi =
        results[3].status === 'fulfilled' ? results[3].value : [];
      const sma50 =
        results[4].status === 'fulfilled' ? results[4].value : [];
      const sma200 =
        results[5].status === 'fulfilled' ? results[5].value : [];
      const ema12 =
        results[6].status === 'fulfilled' ? results[6].value : [];
      const ema26 =
        results[7].status === 'fulfilled' ? results[7].value : [];
      const incomeStatements =
        results[8].status === 'fulfilled' ? results[8].value : [];
      const balanceSheets =
        results[9].status === 'fulfilled' ? results[9].value : [];
      const ratios =
        results[10].status === 'fulfilled' ? results[10].value : [];

      // Log warnings for missing optional data
      const missingData: string[] = [];
      if (results[2].status === 'rejected') missingData.push('historical prices');
      if (results[3].status === 'rejected') missingData.push('RSI');
      if (results[4].status === 'rejected') missingData.push('SMA50');
      if (results[5].status === 'rejected') missingData.push('SMA200');
      if (results[6].status === 'rejected') missingData.push('EMA12');
      if (results[7].status === 'rejected') missingData.push('EMA26');
      if (results[8].status === 'rejected') missingData.push('income statements');
      if (results[9].status === 'rejected') missingData.push('balance sheets');
      if (results[10].status === 'rejected') missingData.push('financial ratios');

      if (missingData.length > 0) {
        warn('Some FMP data unavailable, using graceful degradation', {
          symbol,
          missingData,
        });
      }

      const duration = timer.end(true);
      logAPICall('FMP', 'getAnalysisData', duration, true, {
        symbol,
        missingDataCount: missingData.length,
      });

      return {
        quote,
        profile,
        historical: historical30d.slice(0, 30), // Last 30 days
        technicalIndicators: {
          rsi: rsi.slice(0, 1), // Latest RSI
          sma50: sma50.slice(0, 1), // Latest SMA50
          sma200: sma200.slice(0, 1), // Latest SMA200
          ema12: ema12.slice(0, 1), // Latest EMA12
          ema26: ema26.slice(0, 1), // Latest EMA26
        },
        fundamentals: {
          incomeStatements,
          balanceSheets,
          ratios,
        },
      };
    } catch (error) {
      timer.endWithError(error as Error);
      logAPICall('FMP', 'getAnalysisData', 0, false, { symbol });
      throw error; // Re-throw after logging
    }
  }
}

/**
 * Create FMP client instance
 */
export function createFMPClient(apiKey: string): FMPClient {
  return new FMPClient({ apiKey });
}
