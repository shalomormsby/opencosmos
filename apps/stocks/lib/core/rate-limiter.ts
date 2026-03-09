/**
 * Rate Limiter for Sage Stocks v1.0.3
 *
 * Implements user-level rate limiting using Upstash Redis for distributed state tracking.
 * Each user gets 10 stock analyses per day, with automatic reset at midnight in their timezone.
 *
 * Features:
 * - Per-user rate limiting (10 analyses/day)
 * - Distributed state tracking with Upstash Redis
 * - Timezone-aware daily reset (midnight in user's timezone)
 * - Multi-timezone support (Hawaii → Central Europe)
 * - Admin user automatic bypass (via ADMIN_USER_ID env var)
 * - Session-based bypass code support
 * - Development mode bypass
 * - Graceful error handling (fails open if Redis unavailable)
 *
 * v1.0.3 Changes:
 * - Added timezone parameter to all rate limit methods
 * - Changed Redis key format to v2 (includes timezone)
 * - Reset time now calculated in user's timezone instead of UTC
 * - Bypass sessions now timezone-aware
 */

import { log, LogLevel } from './logger';
import {
  validateTimezone,
  getTimezoneFromEnv,
  formatDateInTimezone,
  getNextMidnightInTimezone,
  type SupportedTimezone,
} from '../shared/timezone';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  total: number;
  bypassed?: boolean;
  timezone?: SupportedTimezone; // User's timezone
}

export interface RateLimitUsage {
  count: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Rate Limiter Client
 *
 * Tracks user analysis requests and enforces daily limits using Redis.
 */
export class RateLimiter {
  private redisUrl: string;
  private redisToken: string;
  private maxAnalyses: number;
  private enabled: boolean;
  private adminUserId: string;

  constructor() {
    this.redisUrl = process.env.UPSTASH_REDIS_REST_URL || '';
    this.redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    this.maxAnalyses = parseInt(process.env.RATE_LIMIT_MAX_ANALYSES || '10');
    this.enabled = process.env.RATE_LIMIT_ENABLED !== 'false';
    this.adminUserId = process.env.ADMIN_USER_ID || '';

    if (this.enabled && (!this.redisUrl || !this.redisToken)) {
      log(
        LogLevel.ERROR,
        'Upstash Redis credentials not configured - rate limiting disabled',
        { enabled: this.enabled }
      );
      this.enabled = false;
    }
  }

  /**
   * Check if user has remaining quota, increment counter if allowed
   *
   * This is the main method called by the analyze endpoint. It checks for:
   * 1. Admin user automatic bypass (highest priority)
   * 2. Active bypass session
   * 3. Development mode bypass
   * 4. Normal rate limiting (timezone-aware)
   *
   * @param userId - User ID for rate limiting
   * @param timezone - User's IANA timezone (e.g., "America/Los_Angeles")
   * @returns Rate limit result with timezone info
   */
  async checkAndIncrement(
    userId: string,
    timezone?: string
  ): Promise<RateLimitResult> {
    // Validate and normalize timezone
    const userTimezone = validateTimezone(timezone, getTimezoneFromEnv());
    // Check if user is admin (automatic bypass)
    if (this.adminUserId && userId === this.adminUserId) {
      log(LogLevel.INFO, 'Request allowed via admin auto-bypass', { userId, timezone: userTimezone });
      return {
        allowed: true,
        remaining: 999,
        resetAt: getNextMidnightInTimezone(userTimezone),
        total: 999,
        bypassed: true,
        timezone: userTimezone,
      };
    }

    // Check for active bypass session
    const hasBypass = await this.hasActiveBypass(userId, userTimezone);
    if (hasBypass) {
      log(LogLevel.INFO, 'Request allowed via active bypass session', { userId, timezone: userTimezone });
      return {
        allowed: true,
        remaining: 999,
        resetAt: getNextMidnightInTimezone(userTimezone),
        total: this.maxAnalyses,
        bypassed: true,
        timezone: userTimezone,
      };
    }

    // Bypass rate limiting if disabled (development mode)
    if (!this.enabled) {
      log(LogLevel.INFO, 'Rate limiting disabled - request allowed', { userId, timezone: userTimezone });
      return {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 86400000),
        total: this.maxAnalyses,
        timezone: userTimezone,
      };
    }

    const key = this.getRateLimitKey(userId, userTimezone);
    const resetAt = getNextMidnightInTimezone(userTimezone);

    try {
      // Get current count
      const count = await this.getCount(key);

      log(LogLevel.INFO, 'Rate limit check', {
        userId,
        timezone: userTimezone,
        currentCount: count,
        maxAnalyses: this.maxAnalyses,
        resetAt: resetAt.toISOString(),
      });

      // Check if limit exceeded
      if (count >= this.maxAnalyses) {
        log(LogLevel.WARN, 'Rate limit exceeded', {
          userId,
          timezone: userTimezone,
          count,
          maxAnalyses: this.maxAnalyses,
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          total: this.maxAnalyses,
          timezone: userTimezone,
        };
      }

      // Increment counter
      await this.increment(key, resetAt);

      const remaining = this.maxAnalyses - (count + 1);

      log(LogLevel.INFO, 'Rate limit allowed', {
        userId,
        timezone: userTimezone,
        newCount: count + 1,
        remaining,
      });

      return {
        allowed: true,
        remaining,
        resetAt,
        total: this.maxAnalyses,
        timezone: userTimezone,
      };
    } catch (error) {
      // If Redis fails, allow request but log error (fail open)
      log(LogLevel.ERROR, 'Rate limiter error, allowing request', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        allowed: true,
        remaining: this.maxAnalyses,
        resetAt,
        total: this.maxAnalyses,
        timezone: userTimezone,
      };
    }
  }

  /**
   * Get current usage for a user (for usage endpoint)
   *
   * @param userId - User ID
   * @param timezone - User's IANA timezone
   */
  async getUsage(userId: string, timezone?: string): Promise<RateLimitUsage> {
    const userTimezone = validateTimezone(timezone, getTimezoneFromEnv());
    const key = this.getRateLimitKey(userId, userTimezone);
    const count = await this.getCount(key);
    const resetAt = getNextMidnightInTimezone(userTimezone);

    return {
      count,
      remaining: Math.max(0, this.maxAnalyses - count),
      resetAt,
    };
  }

  /**
   * Activate bypass session for user until midnight in their timezone
   *
   * Called by the bypass API endpoint when user enters valid bypass code.
   *
   * @param userId - User ID
   * @param timezone - User's IANA timezone
   */
  async activateBypass(userId: string, timezone?: string): Promise<void> {
    const userTimezone = validateTimezone(timezone, getTimezoneFromEnv());
    const key = `bypass_session:v2:${userId}:${userTimezone}`;
    const resetAt = getNextMidnightInTimezone(userTimezone);
    const ttl = Math.floor((resetAt.getTime() - Date.now()) / 1000);

    try {
      // Use Redis pipeline to set value and expiry atomically
      await fetch(`${this.redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['SET', key, '1'],
          ['EXPIRE', key, ttl],
        ]),
      });

      log(LogLevel.INFO, 'Bypass session activated', {
        userId,
        timezone: userTimezone,
        expiresAt: resetAt.toISOString(),
      });
    } catch (error) {
      log(LogLevel.ERROR, 'Failed to activate bypass session', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if user has active bypass session
   *
   * @param userId - User ID
   * @param timezone - User's IANA timezone
   */
  async hasActiveBypass(userId: string, timezone?: string): Promise<boolean> {
    const userTimezone = validateTimezone(timezone, getTimezoneFromEnv());
    const key = `bypass_session:v2:${userId}:${userTimezone}`;

    try {
      const response = await fetch(`${this.redisUrl}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
        },
      });

      const data = (await response.json()) as { result: string | null };
      return data.result === '1';
    } catch (error) {
      log(LogLevel.ERROR, 'Error checking bypass session', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Generate Redis key for user's daily rate limit counter (v2 format)
   *
   * v2 format includes timezone for proper quota isolation.
   * Old v1 keys (without timezone) will naturally expire after 24 hours.
   *
   * Format: rate_limit:v2:{userId}:{timezone}:{YYYY-MM-DD}
   *
   * @example
   * // PT user on Nov 5, 2025
   * getRateLimitKey('user123', 'America/Los_Angeles')
   * // → 'rate_limit:v2:user123:America/Los_Angeles:2025-11-05'
   *
   * // ET user on Nov 5, 2025
   * getRateLimitKey('user123', 'America/New_York')
   * // → 'rate_limit:v2:user123:America/New_York:2025-11-05'
   */
  private getRateLimitKey(userId: string, timezone: SupportedTimezone): string {
    const date = formatDateInTimezone(new Date(), timezone);
    return `rate_limit:v2:${userId}:${timezone}:${date}`;
  }


  /**
   * Get current count from Redis
   */
  private async getCount(key: string): Promise<number> {
    try {
      const response = await fetch(`${this.redisUrl}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
        },
      });

      const data = (await response.json()) as { result: string | null };
      return data.result ? parseInt(data.result) : 0;
    } catch (error) {
      log(LogLevel.ERROR, 'Error getting count from Redis', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Increment counter in Redis with automatic expiry
   */
  private async increment(key: string, expiresAt: Date): Promise<void> {
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    try {
      // Use Redis pipeline to increment and set expiry atomically
      await fetch(`${this.redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, ttl],
        ]),
      });
    } catch (error) {
      log(LogLevel.ERROR, 'Error incrementing count in Redis', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Helper function to extract user ID from request
 *
 * Tries multiple sources in order of priority:
 * 1. Request body (from Notion webhook)
 * 2. X-User-ID header (for direct API calls)
 */
export function extractUserId(req: { body?: any; headers?: any }): string | null {
  // Try to get from request body first (Notion webhook)
  if (req.body?.userId) {
    return req.body.userId;
  }

  // Try to get from custom header
  if (req.headers) {
    const userId =
      req.headers['x-user-id'] ||
      req.headers['X-User-ID'] ||
      req.headers['x-notion-user-id'] ||
      req.headers['X-Notion-User-ID'];

    if (userId) {
      return userId;
    }
  }

  return null;
}

/**
 * Helper function to calculate seconds until next midnight UTC
 *
 * @deprecated Use getSecondsUntilMidnight() from timezone.ts instead
 * Kept for backward compatibility only
 */
export function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}
