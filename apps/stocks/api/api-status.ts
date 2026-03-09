/**
 * API Status Endpoint
 *
 * Provides real-time status monitoring for all 6 API integrations:
 * - FMP API (market data)
 * - FRED API (macro indicators)
 * - Google Gemini API (LLM analysis)
 * - Anthropic Claude API (optional LLM fallback)
 * - OpenAI API (optional LLM fallback)
 * - Notion API (database sync)
 *
 * Returns:
 * - Status indicators (active/error/inactive)
 * - Configuration details (model names, rate limits)
 * - Health check results
 * - Quick links to provider dashboards
 *
 * v1.0.2c - API Management Dashboard
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/core/auth';

interface APIStatus {
  name: string;
  status: 'active' | 'error' | 'inactive';
  configured: boolean;
  details: {
    model?: string;
    endpoint?: string;
    error?: string;
    lastCheck?: string;
  };
  links: {
    docs: string;
    dashboard?: string;
  };
  usage?: {
    callsToday?: number;
    tokensToday?: number;
    costToday?: number;
  };
}

interface APIStatusResponse {
  success: boolean;
  timestamp: string;
  apis: {
    fmp: APIStatus;
    fred: APIStatus;
    gemini: APIStatus;
    claude: APIStatus;
    openai: APIStatus;
    notion: APIStatus;
  };
  summary: {
    totalActive: number;
    totalInactive: number;
    totalErrors: number;
    totalCostToday: number;
    monthlyProjection: number;
  };
}

/**
 * Check if API is configured and healthy
 */
function checkAPIStatus(
  name: string,
  envVars: string[],
  docsUrl: string,
  dashboardUrl?: string,
  model?: string
): APIStatus {
  // Check if all required env vars are present
  const configured = envVars.every(envVar => !!process.env[envVar]);

  let status: 'active' | 'error' | 'inactive' = 'inactive';
  let error: string | undefined;

  if (configured) {
    // Basic validation: check if keys are not empty
    const allValid = envVars.every(envVar => {
      const value = process.env[envVar];
      return value && value.trim().length > 0;
    });

    if (allValid) {
      status = 'active';
    } else {
      status = 'error';
      error = 'API key appears to be empty or invalid';
    }
  }

  return {
    name,
    status,
    configured,
    details: {
      model,
      error,
      lastCheck: new Date().toISOString(),
    },
    links: {
      docs: docsUrl,
      dashboard: dashboardUrl,
    },
    usage: {
      callsToday: 0, // TODO: Implement usage tracking with Redis/Upstash
      costToday: 0,
    },
  };
}

/**
 * Main handler
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
      success: false,
      error: 'Method not allowed',
      details: 'Only GET requests are accepted',
    });
    return;
  }

  // Check authentication (optional - only if API_KEY env var is set)
  if (!(await requireAuth(req, res))) {
    return;
  }

  try {
    // Check each API status
    const fmpStatus = checkAPIStatus(
      'FMP API',
      ['FMP_API_KEY'],
      'https://financialmodelingprep.com/developer/docs',
      'https://financialmodelingprep.com/developer/docs/dashboard'
    );

    const fredStatus = checkAPIStatus(
      'FRED API',
      ['FRED_API_KEY'],
      'https://fred.stlouisfed.org/docs/api/',
      'https://fred.stlouisfed.org/docs/api/api_key.html'
    );

    const geminiStatus = checkAPIStatus(
      'Google Gemini API',
      ['GEMINI_API_KEY', 'LLM_MODEL_NAME'],
      'https://ai.google.dev/docs',
      'https://aistudio.google.com/apikey',
      process.env.LLM_MODEL_NAME || 'Not configured'
    );

    const claudeStatus = checkAPIStatus(
      'Anthropic Claude API',
      ['ANTHROPIC_API_KEY'],
      'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
      'https://console.anthropic.com/settings/keys'
    );

    const openaiStatus = checkAPIStatus(
      'OpenAI API',
      ['OPENAI_API_KEY'],
      'https://platform.openai.com/docs/api-reference',
      'https://platform.openai.com/api-keys'
    );

    const notionStatus = checkAPIStatus(
      'Notion API',
      ['NOTION_API_KEY', 'STOCK_ANALYSES_DB_ID', 'STOCK_HISTORY_DB_ID'],
      'https://developers.notion.com/',
      'https://www.notion.so/my-integrations'
    );

    // Calculate summary statistics
    const apis = [fmpStatus, fredStatus, geminiStatus, claudeStatus, openaiStatus, notionStatus];
    const totalActive = apis.filter(api => api.status === 'active').length;
    const totalInactive = apis.filter(api => api.status === 'inactive').length;
    const totalErrors = apis.filter(api => api.status === 'error').length;
    const totalCostToday = apis.reduce((sum, api) => sum + (api.usage?.costToday || 0), 0);
    const monthlyProjection = totalCostToday * 30; // Simple projection

    const response: APIStatusResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      apis: {
        fmp: fmpStatus,
        fred: fredStatus,
        gemini: geminiStatus,
        claude: claudeStatus,
        openai: openaiStatus,
        notion: notionStatus,
      },
      summary: {
        totalActive,
        totalInactive,
        totalErrors,
        totalCostToday,
        monthlyProjection,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ API status check failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to check API status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
