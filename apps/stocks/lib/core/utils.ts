/**
 * Utility Functions for Sage Stocks v1.0
 *
 * Common utilities for error handling, timeouts, and data processing.
 */

import { APITimeoutError, APIResponseError } from './errors';
import { createTimer } from './logger';

/**
 * Wrap a promise with a timeout
 *
 * If the promise doesn't resolve within the timeout period,
 * rejects with APITimeoutError.
 *
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param service - Service name for error message
 * @returns Promise that resolves with original value or rejects with timeout error
 *
 * @example
 * const data = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   30000,
 *   'Example API'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  service: string
): Promise<T> {
  const timer = createTimer(`${service} (with ${timeoutMs}ms timeout)`, { timeout: timeoutMs });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      timer.endWithError(new APITimeoutError(service, timeoutMs));
      reject(new APITimeoutError(service, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]) as T;
    timer.end(true);
    return result;
  } catch (error) {
    if (error instanceof APITimeoutError) {
      throw error;
    }
    timer.endWithError(error as Error);
    throw error;
  }
}

/**
 * Fetch with timeout and error handling
 *
 * Wraps fetch with timeout, handles HTTP errors, and parses JSON response.
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds
 * @param serviceName - Service name for error messages
 * @returns Parsed JSON response
 *
 * @throws APITimeoutError if request times out
 * @throws APIResponseError if HTTP error status
 *
 * @example
 * const data = await fetchWithTimeout(
 *   'https://api.example.com/data',
 *   { headers: { 'Authorization': 'Bearer token' } },
 *   30000,
 *   'Example API'
 * );
 */
export async function fetchWithTimeout<T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000,
  serviceName: string = 'API'
): Promise<T> {
  const response = await withTimeout(
    fetch(url, options),
    timeoutMs,
    serviceName
  );

  // Check for HTTP errors
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const errorBody = await response.text();
      if (errorBody) {
        errorMessage = errorBody.substring(0, 200); // Limit error message length
      }
    } catch {
      // Ignore errors reading error body
    }

    throw new APIResponseError(serviceName, response.status, errorMessage);
  }

  // Parse JSON response
  try {
    return await response.json() as T;
  } catch (error) {
    throw new Error(`${serviceName} returned invalid JSON: ${error}`);
  }
}

/**
 * Retry options for withRetry function
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
};

/**
 * Determine if an error should be retried
 *
 * Retryable errors:
 * - APITimeoutError - API took too long, might work next time
 * - NotionAPIError with 429, 500, 502, 503, 504 - transient server errors
 * - Notion service_unavailable errors - Notion API is temporarily down
 * - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
 *
 * Non-retryable errors:
 * - InvalidTickerError - bad input won't fix by retrying
 * - DataNotFoundError - data doesn't exist
 * - ValidationError - data validation failed
 * - HTTP 400, 401, 403, 404 - client errors
 */
function isRetryableError(error: any): boolean {
  const {
    APITimeoutError,
    NotionAPIError,
    InvalidTickerError,
    DataNotFoundError,
    ValidationError,
  } = require('./errors');

  // Retry timeouts
  if (error instanceof APITimeoutError) {
    return true;
  }

  // Retry Notion API errors with specific status codes
  if (error instanceof NotionAPIError) {
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.statusCode);
  }

  // Retry Notion service unavailable errors (from Notion SDK)
  const errorMessage = error?.message || String(error);
  if (
    errorMessage.includes('NOTION_SERVICE_UNAVAILABLE') ||
    errorMessage.includes('service_unavailable') ||
    errorMessage.includes('NOTION_RATE_LIMITED')
  ) {
    return true;
  }

  // Retry network errors
  if (error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
    return true;
  }

  // Don't retry validation errors, invalid input, etc.
  if (
    error instanceof InvalidTickerError ||
    error instanceof DataNotFoundError ||
    error instanceof ValidationError
  ) {
    return false;
  }

  // Default: don't retry unknown errors
  return false;
}

/**
 * Execute an operation with retry logic and exponential backoff
 *
 * @param operation - Async function to execute
 * @param operationName - Name of operation for logging
 * @param options - Retry configuration options
 * @returns Result of successful operation
 * @throws Last error if all retries fail
 *
 * @example
 * const data = await withRetry(
 *   async () => fetchDataFromAPI(),
 *   'FMP getQuote(AAPL)',
 *   { maxAttempts: 3 }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { log, LogLevel } = require('./logger');
  const { NotionAPIError } = require('./errors');

  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await operation();

      // Log success if this wasn't the first attempt
      if (attempt > 1) {
        log(LogLevel.INFO, `${operationName} succeeded on retry`, {
          attempt,
          totalAttempts: opts.maxAttempts,
        });
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry if non-retryable error
      if (!isRetryableError(error)) {
        log(LogLevel.ERROR, `Non-retryable error in ${operationName}`, {
          attempt,
          error: (error as Error).message,
        });
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === opts.maxAttempts) {
        log(LogLevel.ERROR, `Max retry attempts reached for ${operationName}`, {
          attempts: opts.maxAttempts,
          error: (error as Error).message,
        });
        throw error;
      }

      // Special handling for rate limits (HTTP 429)
      const notionError = error as any;
      if (notionError instanceof NotionAPIError && notionError.statusCode === 429) {
        // Use Retry-After header if available, otherwise default to 5 seconds
        const retryAfter = notionError.retryAfter || 5000;

        log(LogLevel.WARN, `Rate limited in ${operationName}, waiting`, {
          attempt,
          maxAttempts: opts.maxAttempts,
          retryAfterMs: retryAfter,
        });

        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        continue;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      log(LogLevel.WARN, `Retrying ${operationName} after error`, {
        attempt,
        maxAttempts: opts.maxAttempts,
        delayMs: delay,
        error: (error as Error).message,
      });

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 *
 * Returns parsed value or fallback if parse fails
 */
export function safeJSONParse<T = any>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown, ticker?: string): {
  success: false;
  error: {
    code: string;
    message: string;
    ticker?: string;
    timestamp: string;
    isUnexpected?: boolean;
  };
} {
  const { getErrorCode, getUserMessage, isUnexpectedError } = require('./errors');

  return {
    success: false,
    error: {
      code: getErrorCode(error),
      message: getUserMessage(error),
      ...(ticker && { ticker }),
      timestamp: new Date().toISOString(),
      isUnexpected: isUnexpectedError(error),
    },
  };
}

/**
 * Format error for Notion Notes property
 *
 * Creates a formatted markdown error message for display in Notion
 */
export function formatErrorForNotion(error: unknown, ticker: string): string {
  const { getErrorCode, getUserMessage } = require('./errors');

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const userMessage = getUserMessage(error);
  const errorCode = getErrorCode(error);

  return `⚠️ **Analysis Failed** (${timestamp})

${userMessage}

*Error Code: ${errorCode}*
*Ticker: ${ticker}*`;
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round number to specified decimal places
 */
export function round(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Check if value is defined and not null
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Get current date/time in Pacific Time (America/Los_Angeles)
 *
 * @param format - Output format: 'date' (YYYY-MM-DD), 'datetime' (ISO string in PT), 'display' (formatted string)
 * @returns Date/time string in Pacific Time
 *
 * @example
 * getPacificTime('date')     // "2025-11-19"
 * getPacificTime('datetime') // "2025-11-19T17:30:00.000-08:00"
 * getPacificTime('display')  // "Nov 19, 2025, 5:30 PM"
 */
export function getPacificTime(format: 'date' | 'datetime' | 'display' = 'date'): string {
  const now = new Date();

  if (format === 'date') {
    // Get YYYY-MM-DD in Pacific Time
    const dateStr = now.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // Convert from MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  } else if (format === 'datetime') {
    // Get ISO string in Pacific Time
    return now.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5:$6');
  } else {
    // Display format
    return now.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }
}

/**
 * Get value or default
 */
export function getOrDefault<T>(
  value: T | null | undefined,
  defaultValue: T
): T {
  return isDefined(value) ? value : defaultValue;
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Extract page ID from Notion URL
 *
 * @param pageIdOrUrl - Notion page ID or URL
 * @returns Clean page ID without dashes
 */
export function extractNotionPageId(pageIdOrUrl: string): string {
  if (pageIdOrUrl.includes('notion.so') || pageIdOrUrl.includes('notion.site')) {
    // Extract from URL: https://notion.so/workspace/Page-Title-abc123...
    const match = pageIdOrUrl.split('/').pop()?.split('?')[0];
    return match ? match.replace(/-/g, '') : pageIdOrUrl;
  }

  // Already a page ID, just remove dashes
  return pageIdOrUrl.replace(/-/g, '');
}

/**
 * Normalize Notion URL to handle both notion.so and notion.site domains
 *
 * Notion auto-converts notion.so URLs to notion.site in many contexts.
 * This function extracts the page ID and returns a canonical notion.so URL
 * that works reliably across all contexts.
 *
 * @param urlOrId - Notion URL (notion.so or notion.site) or page ID
 * @returns Normalized notion.so URL
 *
 * @example
 * normalizeNotionUrl('https://ormsby.notion.site/Sage-Stocks-2a9a1d1b67e0818b8e9fe451466994fc')
 * // Returns: 'https://www.notion.so/2a9a1d1b67e0818b8e9fe451466994fc'
 *
 * normalizeNotionUrl('2a9a1d1b67e0818b8e9fe451466994fc')
 * // Returns: 'https://www.notion.so/2a9a1d1b67e0818b8e9fe451466994fc'
 */
export function normalizeNotionUrl(urlOrId: string): string {
  // Extract page ID from URL or use as-is if already an ID
  const pageId = extractNotionPageId(urlOrId);

  // Return canonical notion.so URL
  // Note: We use www.notion.so (not just notion.so) as it's the official domain
  return `https://www.notion.so/${pageId}`;
}

/**
 * Extract template ID from Notion template URL
 *
 * Handles both notion.so and notion.site URLs
 *
 * @param templateUrl - Notion template URL
 * @returns Template ID (32-character hex string without dashes)
 *
 * @example
 * extractTemplateId('https://www.notion.so/Sage-Stocks-2a9a1d1b67e0818b8e9fe451466994fc')
 * // Returns: '2a9a1d1b67e0818b8e9fe451466994fc'
 */
export function extractTemplateId(templateUrl: string): string {
  return extractNotionPageId(templateUrl);
}
