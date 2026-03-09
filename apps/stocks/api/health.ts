/**
 * Health Check Endpoint
 *
 * Public endpoint to verify API is accessible and operational.
 * Does not require authentication.
 *
 * Usage:
 * - GET /api/health
 * - Returns API status, version, and available endpoints
 *
 * v1.0 - Vercel Serverless + TypeScript
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  timestamp: string;
  environment: string;
  auth: {
    enabled: boolean;
    method: string;
  };
  endpoints: {
    path: string;
    method: string;
    description: string;
    requiresAuth: boolean;
  }[];
  config: {
    timeouts: {
      analyze: number;
      webhook: number;
      default: number;
    };
  };
}

/**
 * Health check handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
      details: 'Only GET requests are accepted',
    });
    return;
  }

  try {
    const response: HealthResponse = {
      status: 'ok',
      version: '1.0.0-beta.1',
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || 'development',
      auth: {
        enabled: true,
        method: 'Notion OAuth (session-based)',
      },
      endpoints: [
        {
          path: '/api/health',
          method: 'GET',
          description: 'Health check and API information',
          requiresAuth: false,
        },
        {
          path: '/api/analyze',
          method: 'POST',
          description: 'Analyze a stock and sync to Notion',
          requiresAuth: true,
        },
        {
          path: '/api/auth/authorize',
          method: 'GET',
          description: 'Initiate Notion OAuth flow',
          requiresAuth: false,
        },
        {
          path: '/api/auth/session',
          method: 'GET',
          description: 'Check current session status',
          requiresAuth: false,
        },
        {
          path: '/api/admin/*',
          method: 'GET/POST',
          description: 'Admin dashboard endpoints',
          requiresAuth: true,
        },
      ],
      config: {
        timeouts: {
          analyze: 300, // 5 minutes
          webhook: 60, // 1 minute
          default: 30, // 30 seconds
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Health check error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
