/**
 * Market Context Debug Endpoint
 *
 * Shows current market context state for debugging
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';
import { getMarketContext } from '../../lib/domain/market/index';
import { getCacheMetadata, getCachedMarketContext } from '../../lib/domain/market/cache';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Check environment variables
    const envStatus = {
      FMP_API_KEY: !!process.env.FMP_API_KEY,
      FRED_API_KEY: !!process.env.FRED_API_KEY,
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    };

    // Check cache status
    const cacheMetadata = await getCacheMetadata();
    const cachedContext = await getCachedMarketContext();

    // Try to fetch fresh context
    const fmpClient = createFMPClient(process.env.FMP_API_KEY || '');
    const fredClient = createFREDClient(process.env.FRED_API_KEY || '');

    let freshContext;
    let fetchError;

    try {
      freshContext = await getMarketContext(fmpClient, fredClient, true); // Force refresh
    } catch (error: any) {
      fetchError = {
        message: error?.message,
        name: error?.name,
        stack: error?.stack?.split('\n').slice(0, 3),
      };
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: {
        variables: envStatus,
        allConfigured: Object.values(envStatus).every(v => v),
      },
      cache: {
        metadata: cacheMetadata,
        hasCached: !!cachedContext,
        cachedRegime: cachedContext?.regime,
        cachedTimestamp: cachedContext?.timestamp,
      },
      fresh: {
        success: !!freshContext && !fetchError,
        regime: freshContext?.regime,
        regimeConfidence: freshContext?.regimeConfidence,
        vix: freshContext?.vix,
        spy: freshContext?.spy,
        error: fetchError,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Debug endpoint failed',
      message: error?.message,
      stack: error?.stack,
    });
  }
}
