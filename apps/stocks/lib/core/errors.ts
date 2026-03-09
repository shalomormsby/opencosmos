/**
 * Custom Error Classes for Sage Stocks v1.0.3
 *
 * Provides user-friendly error messages and structured error codes
 * for all failure scenarios in the stock analysis system.
 *
 * Error Hierarchy:
 * - SageStocksError (base class)
 *   - APITimeoutError
 *   - APIRateLimitError
 *   - DataNotFoundError
 *   - InvalidTickerError
 *   - NotionAPIError
 *   - ValidationError
 *   - InsufficientDataError
 *   - RateLimitError (user-level rate limiting, timezone-aware)
 *   - APIResponseError
 *
 * v1.0.3 Changes:
 * - RateLimitError now accepts timezone parameter for proper reset time formatting
 */

import { formatResetTime, validateTimezone, getTimezoneFromEnv, type SupportedTimezone } from '../shared/timezone';

/**
 * Base error class for all Sage Stocks errors
 *
 * Provides standardized error structure with:
 * - Developer message (for logs)
 * - User message (for display in Notion)
 * - Error code (for debugging/monitoring)
 * - HTTP status code (for API responses)
 */
export class SageStocksError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for JSON response
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.userMessage,
      statusCode: this.statusCode,
    };
  }
}

/**
 * API Timeout Error
 *
 * Thrown when external API call exceeds timeout threshold.
 * Common causes: Network issues, API service degradation
 */
export class APITimeoutError extends SageStocksError {
  constructor(service: string, timeout: number) {
    super(
      `${service} API timeout after ${timeout}ms`,
      'API_TIMEOUT',
      `🤨 This is taking longer than usual\n\nOur data provider is running slow right now. Try again in a couple minutes?`,
      504
    );
  }
}

/**
 * API Rate Limit Error
 *
 * Thrown when external API rate limit is exceeded.
 * Common causes: Too many requests in short period
 */
export class APIRateLimitError extends SageStocksError {
  constructor(service: string, retryAfter?: number) {
    const retryMessage = retryAfter
      ? ` Please wait ${retryAfter} seconds before trying again.`
      : ' Please wait a moment and try again.';

    super(
      `${service} API rate limit exceeded`,
      'RATE_LIMIT',
      `Too many requests to ${service}.${retryMessage}`,
      429
    );
  }
}

/**
 * Data Not Found Error
 *
 * Thrown when required data is completely missing for a ticker.
 * Common causes: Invalid ticker, delisted stock, API data gap
 */
export class DataNotFoundError extends SageStocksError {
  constructor(ticker: string, dataType: string) {
    super(
      `${dataType} data not found for ${ticker}`,
      'DATA_NOT_FOUND',
      `¯\\_(ツ)_/¯ Missing some data for ${ticker}\n\nWe couldn't find complete ${dataType}. Could be a smaller stock with limited data, or the info's temporarily unavailable.\n\nYou can still run the analysis, but heads up—it might be incomplete.`,
      404
    );
  }
}

/**
 * Invalid Ticker Error
 *
 * Thrown when ticker symbol fails validation.
 * Common causes: Typo, non-existent symbol, special characters
 */
export class InvalidTickerError extends SageStocksError {
  constructor(ticker: string, reason?: string) {
    const details = reason ? ` (${reason})` : '';
    super(
      `Invalid ticker symbol: ${ticker}${details}`,
      'INVALID_TICKER',
      `🤔 Can't find "${ticker}"\n\nDouble-check the ticker symbol. Stock symbols are usually 3-5 letters (like NVDA or MSFT).`,
      400
    );
  }
}

/**
 * Notion API Error
 *
 * Thrown when Notion API operations fail.
 * Common causes: Network issues, invalid properties, rate limits
 */
export class NotionAPIError extends SageStocksError {
  constructor(operation: string, details: string) {
    super(
      `Notion API error during ${operation}: ${details}`,
      'NOTION_API_ERROR',
      `🤦‍♂️ Couldn't save to Notion\n\nSomething went wrong on our end. The analysis finished, but we couldn't write it to Notion.\n\nTry again? 🤞`,
      500
    );
  }
}

/**
 * Validation Error
 *
 * Thrown when input validation fails.
 * Common causes: Missing required fields, invalid data format
 */
export class ValidationError extends SageStocksError {
  constructor(field: string, issue: string) {
    super(
      `Validation failed for ${field}: ${issue}`,
      'VALIDATION_ERROR',
      `Invalid ${field}: ${issue}`,
      400
    );
  }
}

/**
 * Insufficient Data Error
 *
 * Thrown when critical data fields are missing, preventing analysis.
 * Different from DataNotFoundError - this is for partial data issues.
 */
export class InsufficientDataError extends SageStocksError {
  constructor(ticker: string, missingFields: string[]) {
    const fieldList = missingFields.join(', ');
    super(
      `Insufficient data for ${ticker}: missing ${fieldList}`,
      'INSUFFICIENT_DATA',
      `Cannot complete analysis for ${ticker}. Critical data is missing: ${fieldList}. This may be a temporary API issue.`,
      422
    );
  }
}

/**
 * Rate Limit Error (User-Level, Timezone-Aware)
 *
 * Thrown when user exceeds their daily analysis quota.
 * Different from APIRateLimitError - this is for our application's user-level limits.
 *
 * v1.0.3: Now accepts timezone parameter to show reset time in user's timezone
 */
export class RateLimitError extends SageStocksError {
  public readonly resetAt: Date;
  public readonly timezone: SupportedTimezone;

  constructor(resetAt: Date, timezone?: string, _remaining: number = 0) {
    // Validate and normalize timezone
    const userTimezone = validateTimezone(timezone, getTimezoneFromEnv());

    // Format reset time in user's timezone with abbreviation
    const resetTime = formatResetTime(resetAt, userTimezone);

    super(
      `User rate limit exceeded - limit will reset at ${resetTime}`,
      'USER_RATE_LIMIT_EXCEEDED',
      `💪 Superuser alert! 🤩\n\nYou just hit our freebie limit (10 analyses a day on the house).\n\nWanna power up? View plans at https://shalomormsby.com/analyze/pricing to run more analyses per day.\n\n[Settings](https://stocks.shalomormsby.com/settings.html)`,
      429
    );

    this.resetAt = resetAt;
    this.timezone = userTimezone;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.userMessage,
      statusCode: this.statusCode,
      resetAt: this.resetAt.toISOString(),
      timezone: this.timezone,
    };
  }
}

/**
 * API Response Error
 *
 * Thrown when external API returns an error response.
 * Captures HTTP status and API-specific error messages.
 */
export class APIResponseError extends SageStocksError {
  constructor(
    service: string,
    status: number,
    message: string
  ) {
    let userMessage: string;
    let code: string;

    switch (status) {
      case 400:
        code = 'API_BAD_REQUEST';
        userMessage = `${service} rejected the request. The ticker or parameters may be invalid.`;
        break;
      case 401:
        code = 'API_UNAUTHORIZED';
        userMessage = `${service} authentication failed. This is a system configuration issue. Please contact support.`;
        break;
      case 403:
        code = 'API_FORBIDDEN';
        userMessage = `${service} access denied. Your subscription may have expired or reached limits.`;
        break;
      case 404:
        code = 'API_NOT_FOUND';
        userMessage = `${service} could not find the requested data. The ticker may not exist or may be delisted.`;
        break;
      case 429:
        code = 'API_RATE_LIMIT';
        userMessage = `${service} rate limit exceeded. Too many requests. Please wait and try again.`;
        break;
      case 500:
      case 502:
      case 503:
        code = 'API_SERVER_ERROR';
        userMessage = `${service} is experiencing technical difficulties. Please try again later.`;
        break;
      default:
        code = 'API_ERROR';
        userMessage = `${service} returned an error. Please try again.`;
    }

    super(
      `${service} API error (${status}): ${message}`,
      code,
      userMessage,
      status
    );
  }
}

/**
 * Check if an error is a Sage Stocks error
 */
export function isSageStocksError(
  error: unknown
): error is SageStocksError {
  return error instanceof SageStocksError;
}

/**
 * Get user-friendly error message from any error
 */
export function getUserMessage(error: unknown): string {
  if (isSageStocksError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return '🫣 Uh-oh!\n\nSomething went wrong in many steps of crafting this stock analysis for you.\n\nWish I could tell you the exact cause, but I can\'t right now. Sorry about that.\n\nTry again? 🤞';
  }

  return '🫣 Uh-oh!\n\nSomething went wrong in many steps of crafting this stock analysis for you.\n\nWish I could tell you the exact cause, but I can\'t right now. Sorry about that.\n\nTry again? 🤞';
}

/**
 * Check if error is a generic unexpected error (not a Sage Stocks error)
 * Used to apply different styling (red/pink vs blue)
 */
export function isUnexpectedError(error: unknown): boolean {
  return !isSageStocksError(error);
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isSageStocksError(error)) {
    return error.code;
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Get HTTP status code from any error
 */
export function getStatusCode(error: unknown): number {
  if (isSageStocksError(error)) {
    return error.statusCode;
  }

  return 500;
}
