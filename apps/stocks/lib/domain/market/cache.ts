/**
 * Market Context Cache
 *
 * Redis-based caching for market context data with 1-hour TTL.
 * Uses Upstash Redis REST API for serverless compatibility.
 *
 * v1.1.0 - Market Context Integration
 */

import { MarketContext } from './types';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const CACHE_KEY = 'market:context:v1';
const CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * Check if Redis is configured
 */
function isRedisConfigured(): boolean {
  return REDIS_URL !== '' && REDIS_TOKEN !== '';
}

/**
 * Get cached market context from Redis
 *
 * Returns null if:
 * - Redis not configured
 * - Cache miss
 * - Cache expired (TTL <= 0)
 * - Error fetching from Redis
 */
export async function getCachedMarketContext(): Promise<MarketContext | null> {
  if (!isRedisConfigured()) {
    console.warn('[MARKET CACHE] Redis not configured, cache disabled');
    return null;
  }

  try {
    // Check TTL first to ensure cache is not expired
    const ttlResponse = await fetch(`${REDIS_URL}/ttl/${CACHE_KEY}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (ttlResponse.ok) {
      const ttlData = await ttlResponse.json() as { result?: number };
      const ttl = ttlData.result;

      if (ttl !== undefined && ttl <= 0) {
        console.log(`[MARKET CACHE] Cache expired (TTL: ${ttl}), treating as cache miss`);
        return null;
      }
    }

    const response = await fetch(`${REDIS_URL}/get/${CACHE_KEY}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.warn(`[MARKET CACHE] Redis GET failed: ${response.status}`);
      return null;
    }

    const data = await response.json() as { result?: string };

    if (!data.result) {
      console.log('[MARKET CACHE] Cache miss');
      return null;
    }

    const marketContext: MarketContext = JSON.parse(data.result);
    const age = Date.now() - new Date(marketContext.timestamp).getTime();
    const ageMinutes = Math.round(age / 60000);

    console.log(`[MARKET CACHE] ✓ Cache hit (${ageMinutes} min old)`);
    return marketContext;
  } catch (error) {
    console.error('[MARKET CACHE] Error fetching from Redis:', error);
    return null;
  }
}

/**
 * Cache market context in Redis with TTL
 */
export async function cacheMarketContext(context: MarketContext): Promise<void> {
  if (!isRedisConfigured()) {
    console.warn('[MARKET CACHE] Redis not configured, skipping cache');
    return;
  }

  try {
    // Note: Upstash REST API requires EX parameter in query string, not JSON body
    const response = await fetch(`${REDIS_URL}/set/${CACHE_KEY}?EX=${CACHE_TTL_SECONDS}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      console.warn(`[MARKET CACHE] Redis SET failed: ${response.status}`);
      return;
    }

    console.log(`[MARKET CACHE] ✓ Cached (TTL: ${CACHE_TTL_SECONDS / 60} min)`);
  } catch (error) {
    console.error('[MARKET CACHE] Error caching to Redis:', error);
  }
}

/**
 * Clear market context cache (useful for testing)
 */
export async function clearMarketContextCache(): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    const response = await fetch(`${REDIS_URL}/del/${CACHE_KEY}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.warn(`[MARKET CACHE] Redis DEL failed: ${response.status}`);
      return;
    }

    console.log('[MARKET CACHE] ✓ Cache cleared');
  } catch (error) {
    console.error('[MARKET CACHE] Error clearing cache:', error);
  }
}

/**
 * Get cache metadata (useful for monitoring)
 */
export async function getCacheMetadata(): Promise<{
  exists: boolean;
  age?: number; // milliseconds
  ttl?: number; // seconds
} | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    // Check if key exists
    const existsResponse = await fetch(`${REDIS_URL}/exists/${CACHE_KEY}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    const existsData = await existsResponse.json() as { result?: number };
    const exists = existsData.result === 1;

    if (!exists) {
      return { exists: false };
    }

    // Get TTL
    const ttlResponse = await fetch(`${REDIS_URL}/ttl/${CACHE_KEY}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    const ttlData = await ttlResponse.json() as { result?: number };
    const ttl = ttlData.result;

    // Get cached context to determine age
    const cached = await getCachedMarketContext();
    const age = cached ? Date.now() - new Date(cached.timestamp).getTime() : undefined;

    return {
      exists: true,
      age,
      ttl,
    };
  } catch (error) {
    console.error('[MARKET CACHE] Error getting metadata:', error);
    return null;
  }
}
