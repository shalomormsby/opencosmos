/**
 * Timezone Utilities for Sage Stocks
 *
 * Provides timezone-aware date formatting and validation for multi-timezone support.
 * Supports users from Hawaii (UTC-10) to Central Europe (UTC+1/+2).
 *
 * Key Features:
 * - IANA timezone validation
 * - Timezone-aware date formatting (YYYY-MM-DD)
 * - Midnight calculation in user's timezone
 * - Human-readable timestamp formatting with timezone abbreviations
 *
 * Design Philosophy:
 * - Use built-in Intl.DateTimeFormat API (zero dependencies)
 * - Handle DST transitions automatically
 * - Return UTC Date objects for consistency with existing code
 */

/**
 * Supported IANA timezones (Hawaii → Central Europe)
 *
 * Coverage:
 * - Hawaii-Aleutian Time (UTC-10)
 * - Alaska Time (UTC-9)
 * - Pacific Time (UTC-8/-7)
 * - Mountain Time (UTC-7/-6)
 * - Central Time (UTC-6/-5)
 * - Eastern Time (UTC-5/-4)
 * - Atlantic Time (UTC-4/-3)
 * - Newfoundland Time (UTC-3:30/-2:30)
 * - UK Time (UTC+0/+1)
 * - Central European Time (UTC+1/+2)
 */
export const SUPPORTED_TIMEZONES = [
  'America/Adak',        // Hawaii-Aleutian (UTC-10/-9)
  'Pacific/Honolulu',    // Hawaii (UTC-10)
  'America/Anchorage',   // Alaska (UTC-9/-8)
  'America/Los_Angeles', // Pacific (UTC-8/-7)
  'America/Denver',      // Mountain (UTC-7/-6)
  'America/Chicago',     // Central (UTC-6/-5)
  'America/New_York',    // Eastern (UTC-5/-4)
  'America/Toronto',     // Canada Eastern (UTC-5/-4)
  'America/Halifax',     // Canada Atlantic (UTC-4/-3)
  'America/St_Johns',    // Newfoundland (UTC-3:30/-2:30)
  'Europe/London',       // UK (UTC+0/+1)
  'Europe/Paris',        // Central European (UTC+1/+2)
  'Europe/Berlin',       // Central European (UTC+1/+2)
] as const;

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number];

/**
 * Default timezone (Pacific Time)
 * Can be overridden via DEFAULT_TIMEZONE environment variable
 */
export const DEFAULT_TIMEZONE: SupportedTimezone = 'America/Los_Angeles';

/**
 * Validate and normalize timezone string
 *
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @param fallback - Fallback timezone if validation fails (default: DEFAULT_TIMEZONE)
 * @returns Valid timezone or fallback
 *
 * @example
 * validateTimezone('America/New_York') // → 'America/New_York'
 * validateTimezone('Invalid/Zone')     // → 'America/Los_Angeles'
 * validateTimezone('', 'Europe/London') // → 'Europe/London'
 */
export function validateTimezone(
  timezone: string | undefined | null,
  fallback: SupportedTimezone = DEFAULT_TIMEZONE
): SupportedTimezone {
  if (!timezone) {
    return fallback;
  }

  // Check if timezone is in supported list
  if (SUPPORTED_TIMEZONES.includes(timezone as SupportedTimezone)) {
    return timezone as SupportedTimezone;
  }

  // Timezone not supported - return fallback
  return fallback;
}

/**
 * Get timezone from environment variable with validation
 *
 * @returns Validated timezone from env or DEFAULT_TIMEZONE
 *
 * @example
 * // .env: DEFAULT_TIMEZONE=America/Chicago
 * getTimezoneFromEnv() // → 'America/Chicago'
 *
 * // .env: DEFAULT_TIMEZONE=Invalid/Zone
 * getTimezoneFromEnv() // → 'America/Los_Angeles'
 */
export function getTimezoneFromEnv(): SupportedTimezone {
  const envTimezone = process.env.DEFAULT_TIMEZONE;
  return validateTimezone(envTimezone, DEFAULT_TIMEZONE);
}

/**
 * Format date as YYYY-MM-DD in user's timezone
 *
 * This is the core function for rate limiting quota keys.
 * Uses Intl.DateTimeFormat for timezone-aware date calculation.
 *
 * @param date - Date to format (default: now)
 * @param timezone - User's IANA timezone
 * @returns Date string in YYYY-MM-DD format (user's timezone)
 *
 * @example
 * // Nov 4, 2025 at 11:00 PM PT (Nov 5, 2025 at 7:00 AM UTC)
 * formatDateInTimezone(new Date('2025-11-05T07:00:00Z'), 'America/Los_Angeles')
 * // → '2025-11-04' (still Nov 4 in PT)
 *
 * formatDateInTimezone(new Date('2025-11-05T07:00:00Z'), 'America/New_York')
 * // → '2025-11-05' (already Nov 5 in ET)
 */
export function formatDateInTimezone(
  date: Date = new Date(),
  timezone: SupportedTimezone
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA locale returns YYYY-MM-DD format
  return formatter.format(date);
}

/**
 * Get next midnight (00:00:00) in user's timezone, returned as UTC Date
 *
 * This is used for rate limit reset times and bypass session expiry.
 * Returns a UTC Date object representing midnight in the user's timezone.
 *
 * @param timezone - User's IANA timezone
 * @param fromDate - Calculate from this date (default: now)
 * @returns UTC Date object representing next midnight in user's timezone
 *
 * @example
 * // Current time: Nov 4, 2025 at 11:00 PM PT
 * getNextMidnightInTimezone('America/Los_Angeles')
 * // → Date representing Nov 5, 2025 at 12:00 AM PT (8:00 AM UTC)
 *
 * // Current time: Nov 4, 2025 at 11:00 PM ET
 * getNextMidnightInTimezone('America/New_York')
 * // → Date representing Nov 5, 2025 at 12:00 AM ET (5:00 AM UTC)
 */
export function getNextMidnightInTimezone(
  timezone: SupportedTimezone,
  fromDate: Date = new Date()
): Date {
  // Get current date in user's timezone (YYYY-MM-DD)
  const dateInTz = formatDateInTimezone(fromDate, timezone);

  // Parse date components
  const [year, month, day] = dateInTz.split('-').map(Number);

  // Create tomorrow's date (add 1 day)
  const tomorrow = new Date(year, month - 1, day + 1);

  // Format tomorrow as ISO string (YYYY-MM-DD)
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Create Date object for midnight in user's timezone
  // This is a bit tricky: we need to find the UTC time that corresponds to
  // midnight in the user's timezone

  // Use a trick: format a known UTC time in the target timezone,
  // then calculate the offset
  const testDate = new Date(`${tomorrowStr}T12:00:00Z`); // Noon UTC

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Format the test date in the target timezone
  const parts = formatter.formatToParts(testDate);
  const tzDate = new Date(
    parseInt(parts.find(p => p.type === 'year')?.value || '0'),
    parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1,
    parseInt(parts.find(p => p.type === 'day')?.value || '1'),
    parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
    parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
    parseInt(parts.find(p => p.type === 'second')?.value || '0')
  );

  // Calculate offset: UTC time - local time
  const offset = testDate.getTime() - tzDate.getTime();

  // Now create midnight in the target timezone
  const midnightLocal = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  // Convert to UTC by adding the offset
  return new Date(midnightLocal.getTime() + offset);
}

/**
 * Format timestamp with timezone abbreviation for display
 *
 * Used for rate limit error messages and Notion page titles.
 * Returns human-readable format: "MM/DD/YYYY, HH:MM AM/PM TZ"
 *
 * @param date - Date to format
 * @param timezone - User's IANA timezone
 * @param includeTimezone - Include timezone abbreviation (default: true)
 * @returns Formatted timestamp string
 *
 * @example
 * const date = new Date('2025-11-05T19:07:00Z');
 *
 * formatTimestampInTimezone(date, 'America/Los_Angeles')
 * // → "11/05/2025, 12:07 PM PST"
 *
 * formatTimestampInTimezone(date, 'America/New_York')
 * // → "11/05/2025, 02:07 PM EST"
 *
 * formatTimestampInTimezone(date, 'Europe/Paris')
 * // → "11/05/2025, 08:07 PM CET"
 */
export function formatTimestampInTimezone(
  date: Date,
  timezone: SupportedTimezone,
  includeTimezone: boolean = true
): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...(includeTimezone && { timeZoneName: 'short' }),
  });

  return formatter.format(date);
}

/**
 * Format reset time for error messages
 *
 * Returns format: "Nov 6, 12:00 AM PST"
 * Used in rate limit error messages.
 *
 * @param date - Reset date
 * @param timezone - User's IANA timezone
 * @returns Formatted reset time string
 *
 * @example
 * const resetAt = new Date('2025-11-06T08:00:00Z'); // Nov 6 midnight PT
 *
 * formatResetTime(resetAt, 'America/Los_Angeles')
 * // → "Nov 6, 12:00 AM PST"
 *
 * formatResetTime(resetAt, 'America/New_York')
 * // → "Nov 6, 3:00 AM EST"
 */
export function formatResetTime(
  date: Date,
  timezone: SupportedTimezone
): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });

  return formatter.format(date);
}

/**
 * Calculate seconds until next midnight in user's timezone
 *
 * Used for Redis TTL and Retry-After headers.
 *
 * @param timezone - User's IANA timezone
 * @param fromDate - Calculate from this date (default: now)
 * @returns Seconds until next midnight
 *
 * @example
 * // Current time: Nov 4, 2025 at 11:30 PM PT
 * getSecondsUntilMidnight('America/Los_Angeles')
 * // → 1800 (30 minutes = 1800 seconds)
 */
export function getSecondsUntilMidnight(
  timezone: SupportedTimezone,
  fromDate: Date = new Date()
): number {
  const nextMidnight = getNextMidnightInTimezone(timezone, fromDate);
  return Math.floor((nextMidnight.getTime() - fromDate.getTime()) / 1000);
}
