/**
 * Data Validation for Sage Stocks v1.0
 *
 * Validates ticker symbols, API responses, and data completeness.
 * Prevents NaN/undefined scores by catching missing data early.
 */

import { InvalidTickerError, InsufficientDataError } from './errors';

/**
 * Data quality assessment result
 */
export interface DataQualityReport {
  isComplete: boolean;
  missingFields: string[];
  dataCompleteness: number; // 0.0 to 1.0
  canProceed: boolean; // false if critical fields missing
  grade: 'A - Excellent' | 'B - Good' | 'C - Fair' | 'D - Poor';
  confidence: 'High' | 'Medium-High' | 'Medium' | 'Low';
}

/**
 * Validate ticker symbol format
 *
 * Rules:
 * - 1-5 uppercase letters
 * - May contain dots for special shares (e.g., BRK.A)
 * - No special characters except dots
 * - No numbers
 *
 * @throws InvalidTickerError if ticker is invalid
 */
export function validateTicker(ticker: string): string {
  if (!ticker || typeof ticker !== 'string') {
    throw new InvalidTickerError(ticker, 'Ticker is required');
  }

  const trimmed = ticker.trim().toUpperCase();

  // Check length
  if (trimmed.length < 1 || trimmed.length > 6) {
    throw new InvalidTickerError(
      ticker,
      'Ticker must be 1-6 characters'
    );
  }

  // Check format: letters and dots only
  if (!/^[A-Z.]+$/.test(trimmed)) {
    throw new InvalidTickerError(
      ticker,
      'Ticker can only contain letters and dots'
    );
  }

  // Check for common invalid patterns
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
    throw new InvalidTickerError(ticker, 'Ticker cannot start or end with a dot');
  }

  if (trimmed.includes('..')) {
    throw new InvalidTickerError(ticker, 'Ticker cannot have consecutive dots');
  }

  return trimmed;
}

/**
 * Validate stock data completeness
 *
 * Checks for presence of critical and optional fields.
 * Returns quality report with completeness score and grade.
 */
export function validateStockData(data: {
  technical?: any;
  fundamental?: any;
  macro?: any;
}): DataQualityReport {
  // Critical fields - analysis cannot proceed without these
  const criticalFields: { name: string; check: () => boolean }[] = [
    {
      name: 'current_price',
      check: () => data.technical?.current_price != null,
    },
    {
      name: 'volume',
      check: () => data.technical?.volume != null,
    },
  ];

  // Important optional fields - analysis can proceed but quality is reduced
  const optionalFields: { name: string; check: () => boolean }[] = [
    {
      name: 'ma_50',
      check: () => data.technical?.ma_50 != null,
    },
    {
      name: 'ma_200',
      check: () => data.technical?.ma_200 != null,
    },
    {
      name: 'rsi',
      check: () => data.technical?.rsi != null,
    },
    {
      name: 'macd',
      check: () => data.technical?.macd != null,
    },
    {
      name: 'macd_signal',
      check: () => data.technical?.macd_signal != null,
    },
    {
      name: 'avg_volume_20d',
      check: () => data.technical?.avg_volume_20d != null,
    },
    {
      name: 'volatility_30d',
      check: () => data.technical?.volatility_30d != null,
    },
    {
      name: 'price_change_1d',
      check: () => data.technical?.price_change_1d != null,
    },
    {
      name: 'price_change_5d',
      check: () => data.technical?.price_change_5d != null,
    },
    {
      name: 'price_change_1m',
      check: () => data.technical?.price_change_1m != null,
    },
    {
      name: 'week_52_high',
      check: () => data.technical?.week_52_high != null,
    },
    {
      name: 'week_52_low',
      check: () => data.technical?.week_52_low != null,
    },
    {
      name: 'market_cap',
      check: () => data.fundamental?.market_cap != null,
    },
    {
      name: 'pe_ratio',
      check: () => data.fundamental?.pe_ratio != null,
    },
    {
      name: 'eps',
      check: () => data.fundamental?.eps != null,
    },
    {
      name: 'revenue_ttm',
      check: () => data.fundamental?.revenue_ttm != null,
    },
    {
      name: 'debt_to_equity',
      check: () => data.fundamental?.debt_to_equity != null,
    },
    {
      name: 'beta',
      check: () => data.fundamental?.beta != null,
    },
    {
      name: 'fed_funds_rate',
      check: () => data.macro?.fed_funds_rate != null,
    },
    {
      name: 'unemployment',
      check: () => data.macro?.unemployment != null,
    },
    {
      name: 'vix',
      check: () => data.macro?.vix != null,
    },
    {
      name: 'yield_curve_spread',
      check: () => data.macro?.yield_curve_spread != null,
    },
  ];

  // Check critical fields
  const missingCritical = criticalFields
    .filter((field) => !field.check())
    .map((field) => field.name);

  // Cannot proceed if critical fields are missing
  if (missingCritical.length > 0) {
    return {
      isComplete: false,
      missingFields: missingCritical,
      dataCompleteness: 0,
      canProceed: false,
      grade: 'D - Poor',
      confidence: 'Low',
    };
  }

  // Check optional fields
  const missingOptional = optionalFields
    .filter((field) => !field.check())
    .map((field) => field.name);

  // Calculate completeness
  const totalFields = criticalFields.length + optionalFields.length;
  const presentFields = criticalFields.length + (optionalFields.length - missingOptional.length);
  const completeness = presentFields / totalFields;

  // Determine grade
  let grade: DataQualityReport['grade'];
  if (completeness >= 0.9) grade = 'A - Excellent';
  else if (completeness >= 0.75) grade = 'B - Good';
  else if (completeness >= 0.6) grade = 'C - Fair';
  else grade = 'D - Poor';

  // Determine confidence
  let confidence: DataQualityReport['confidence'];
  if (completeness >= 0.85) confidence = 'High';
  else if (completeness >= 0.7) confidence = 'Medium-High';
  else if (completeness >= 0.55) confidence = 'Medium';
  else confidence = 'Low';

  return {
    isComplete: missingOptional.length === 0,
    missingFields: missingOptional,
    dataCompleteness: completeness,
    canProceed: true,
    grade,
    confidence,
  };
}

/**
 * Ensure data quality is sufficient for analysis
 *
 * @throws InsufficientDataError if critical fields are missing
 */
export function ensureSufficientData(
  ticker: string,
  data: {
    technical?: any;
    fundamental?: any;
    macro?: any;
  }
): DataQualityReport {
  const report = validateStockData(data);

  if (!report.canProceed) {
    throw new InsufficientDataError(ticker, report.missingFields);
  }

  return report;
}

/**
 * Validate number is valid (not NaN, not Infinity)
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: any): value is number {
  return isValidNumber(value) && value >= 0 && value <= 100;
}

/**
 * Validate score (1.0-5.0)
 */
export function isValidScore(value: any): value is number {
  return isValidNumber(value) && value >= 1.0 && value <= 5.0;
}

/**
 * Safe number conversion
 *
 * Returns the number if valid, otherwise returns fallback (default: undefined)
 */
export function safeNumber(
  value: any,
  fallback?: number
): number | undefined {
  if (isValidNumber(value)) {
    return value;
  }
  return fallback;
}

/**
 * Validate API response structure
 *
 * Ensures response has expected shape and required fields
 */
export function validateAPIResponse<T>(
  response: any,
  requiredFields: string[],
  responseName: string
): T {
  if (!response || typeof response !== 'object') {
    throw new Error(`Invalid ${responseName}: response is not an object`);
  }

  const missing = requiredFields.filter((field) => !(field in response));

  if (missing.length > 0) {
    throw new Error(
      `Invalid ${responseName}: missing required fields: ${missing.join(', ')}`
    );
  }

  return response as T;
}

/**
 * Validate array response
 */
export function validateArrayResponse<T>(
  response: any,
  responseName: string,
  minLength: number = 1
): T[] {
  if (!Array.isArray(response)) {
    throw new Error(`Invalid ${responseName}: response is not an array`);
  }

  if (response.length < minLength) {
    throw new Error(
      `Invalid ${responseName}: array has ${response.length} items, expected at least ${minLength}`
    );
  }

  return response as T[];
}
