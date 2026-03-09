/**
 * Structured Logging for Sage Stocks v1.0
 *
 * Provides JSON-formatted logging for Vercel function logs.
 * All logs are written to console (stdout/stderr) and appear in Vercel dashboard.
 *
 * Future: Can be extended to send to external monitoring services
 * (Sentry, Datadog, LogRocket, etc.)
 */

import { SageStocksError, getErrorCode } from './errors';

/**
 * Log severity levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Configuration for logger
 */
interface LoggerConfig {
  minLevel?: LogLevel;
  includeStackTrace?: boolean;
  redactKeys?: string[]; // Keys to redact from context (e.g., 'apiKey', 'password')
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  includeStackTrace: true,
  redactKeys: ['apiKey', 'apikey', 'api_key', 'password', 'secret', 'token'],
};

let config: LoggerConfig = DEFAULT_CONFIG;

/**
 * Configure logger settings
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Redact sensitive data from context
 */
function redactSensitiveData(
  context: Record<string, any>,
  keysToRedact: string[]
): Record<string, any> {
  const redacted = { ...context };

  for (const key of keysToRedact) {
    if (key in redacted) {
      redacted[key] = '[REDACTED]';
    }
  }

  return redacted;
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const minLevelIndex = levels.indexOf(config.minLevel || LogLevel.INFO);
  const currentLevelIndex = levels.indexOf(level);

  return currentLevelIndex >= minLevelIndex;
}

/**
 * Core logging function
 *
 * @param level - Log severity level
 * @param message - Human-readable log message
 * @param context - Additional context data (will be redacted for sensitive keys)
 * @param error - Error object (optional)
 */
export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, any>,
  error?: Error
): void {
  if (!shouldLog(level)) {
    return;
  }

  // Redact sensitive data from context
  const safeContext = context
    ? redactSensitiveData(context, config.redactKeys || [])
    : undefined;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(safeContext && { context: safeContext }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        ...(config.includeStackTrace && { stack: error.stack }),
        ...(error instanceof SageStocksError && { code: error.code }),
      },
    }),
  };

  // Output to console (appears in Vercel function logs)
  const jsonLog = JSON.stringify(entry);

  if (level === LogLevel.ERROR) {
    console.error(jsonLog);
  } else if (level === LogLevel.WARN) {
    console.warn(jsonLog);
  } else {
    console.log(jsonLog);
  }
}

/**
 * Convenience logging functions
 */

export function debug(message: string, context?: Record<string, any>): void {
  log(LogLevel.DEBUG, message, context);
}

export function info(message: string, context?: Record<string, any>): void {
  log(LogLevel.INFO, message, context);
}

export function warn(
  message: string,
  context?: Record<string, any>,
  error?: Error
): void {
  log(LogLevel.WARN, message, context, error);
}

export function error(
  message: string,
  context?: Record<string, any>,
  err?: Error
): void {
  log(LogLevel.ERROR, message, context, err);
}

/**
 * Log API call metrics
 */
export function logAPICall(
  service: string,
  operation: string,
  duration: number,
  success: boolean,
  context?: Record<string, any>
): void {
  log(
    success ? LogLevel.INFO : LogLevel.WARN,
    `API call: ${service}.${operation}`,
    {
      service,
      operation,
      duration,
      success,
      ...context,
    }
  );
}

/**
 * Log analysis lifecycle events
 */
export function logAnalysisStart(ticker: string, context?: Record<string, any>): void {
  info('Analysis started', {
    ticker,
    ...context,
  });
}

export function logAnalysisComplete(
  ticker: string,
  duration: number,
  compositeScore: number,
  context?: Record<string, any>
): void {
  info('Analysis completed', {
    ticker,
    duration,
    compositeScore,
    ...context,
  });
}

export function logAnalysisFailed(
  ticker: string,
  errorCode: string,
  context?: Record<string, any>,
  err?: Error
): void {
  error('Analysis failed', {
    ticker,
    errorCode,
    ...context,
  }, err);
}

/**
 * Log data quality metrics
 */
export function logDataQuality(
  ticker: string,
  completeness: number,
  missingFields: string[],
  canProceed: boolean
): void {
  const level = canProceed ? LogLevel.INFO : LogLevel.WARN;

  log(level, 'Data quality check', {
    ticker,
    completeness,
    missingFields,
    canProceed,
  });
}

/**
 * Create a timing logger that automatically logs duration
 */
export class Timer {
  private startTime: number;

  constructor(
    private operation: string,
    private context?: Record<string, any>
  ) {
    this.startTime = Date.now();
    debug(`${operation} started`, context);
  }

  /**
   * End timer and log duration
   */
  end(success: boolean = true, additionalContext?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;

    log(
      success ? LogLevel.INFO : LogLevel.WARN,
      `${this.operation} ${success ? 'completed' : 'failed'}`,
      {
        duration,
        success,
        ...this.context,
        ...additionalContext,
      }
    );

    return duration;
  }

  /**
   * End timer with error
   */
  endWithError(err: Error, additionalContext?: Record<string, any>): number {
    const duration = Date.now() - this.startTime;

    error(`${this.operation} failed`, {
      duration,
      errorCode: getErrorCode(err),
      ...this.context,
      ...additionalContext,
    }, err);

    return duration;
  }
}

/**
 * Create a timer for an operation
 *
 * @example
 * const timer = createTimer('FMP API call', { ticker: 'AAPL' });
 * try {
 *   const data = await fetchData();
 *   timer.end(true);
 * } catch (err) {
 *   timer.endWithError(err);
 * }
 */
export function createTimer(
  operation: string,
  context?: Record<string, any>
): Timer {
  return new Timer(operation, context);
}
