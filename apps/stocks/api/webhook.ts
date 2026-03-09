/**
 * Notion Webhook Handler
 *
 * Receives webhook events from Notion database automations.
 *
 * Current functionality:
 * 1. New analysis trigger: Extracts ticker and triggers analysis (DEPRECATED - marked "Will Not Do")
 *
 * Deprecated functionality (removed in v1.2.22):
 * 2. Archive trigger: Moved completed analysis to Stock History
 *    - Stock History is now created automatically in /api/analyze endpoint
 *    - No webhook trigger needed
 *    - Returns HTTP 410 Gone if called
 *
 * Setup in Notion:
 * - Remove any "Send to History" automations that call this webhook
 * - Webhook URL: https://your-app.vercel.app/api/webhook
 *
 * v1.2.22 - Removed archive webhook (duplicate prevention)
 * v1.0 - Vercel Serverless + TypeScript
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { requireAuth } from '../lib/core/auth';
import { createTimer, info, error as logError } from '../lib/core/logger';
import { formatErrorResponse } from '../lib/core/utils';
import { getStatusCode } from '../lib/core/errors';

interface NotionWebhookPayload {
  type?: string;
  action?: string; // 'archive' for Send to History button
  pageId?: string; // Page ID for archiving
  page?: {
    id: string;
    properties?: Record<string, any>;
  };
  database?: {
    id: string;
  };
}

interface WebhookResponse {
  success: boolean;
  ticker?: string;
  analysisTriggered?: boolean;
  archiveTriggered?: boolean;
  historyPageId?: string;
  message?: string;
  error?: string;
  details?: string;
}

/**
 * Verify Notion webhook signature
 * Notion signs webhooks with HMAC-SHA256
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Extract ticker from Notion page properties
 */
function extractTicker(properties: Record<string, any>): string | null {
  // Try different property names
  const tickerProperty =
    properties['Ticker'] ||
    properties['ticker'] ||
    properties['Symbol'] ||
    properties['symbol'];

  if (!tickerProperty) {
    return null;
  }

  // Handle different property types
  if (tickerProperty.type === 'title' && tickerProperty.title?.length > 0) {
    return tickerProperty.title[0].plain_text;
  }

  if (tickerProperty.type === 'rich_text' && tickerProperty.rich_text?.length > 0) {
    return tickerProperty.rich_text[0].plain_text;
  }

  if (tickerProperty.type === 'text' && tickerProperty.text?.length > 0) {
    return tickerProperty.text[0].plain_text;
  }

  return null;
}

/**
 * Main webhook handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const timer = createTimer('Webhook Handler');

  console.log('='.repeat(60));
  console.log('Notion webhook received');
  console.log('='.repeat(60));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      details: 'Only POST requests are accepted',
    });
    return;
  }

  // Check authentication (optional - only if API_KEY env var is set)
  if (!(await requireAuth(req, res))) {
    console.log('❌ Authentication failed');
    return;
  }

  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers['notion-signature'] as string;

      if (!signature) {
        console.log('❌ Missing signature header');
        res.status(401).json({
          success: false,
          error: 'Missing signature',
          details: 'Notion-Signature header is required',
        });
        return;
      }

      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      if (!verifySignature(rawBody, signature, webhookSecret)) {
        console.log('❌ Invalid signature');
        res.status(401).json({
          success: false,
          error: 'Invalid signature',
          details: 'Webhook signature verification failed',
        });
        return;
      }

      console.log('✅ Signature verified');
    } else {
      console.log('⚠️  No webhook secret configured - skipping signature verification');
    }

    // Parse webhook payload
    const payload: NotionWebhookPayload =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log('Webhook type:', payload.type);
    console.log('Webhook action:', payload.action);

    // DEPRECATED: Archive webhook removed in v1.2.22
    // Stock History is now created directly in the analysis pipeline (/api/analyze)
    // See: docs/architecture/overview.md for current data flow
    if (payload.action === 'archive') {
      console.log('⚠️  Deprecated archive webhook called');
      res.status(410).json({
        success: false,
        error: 'Archive webhook deprecated',
        details: 'Stock History is now created automatically in /api/analyze. Remove "Send to History" automation from Notion.',
        archiveTriggered: false,
      });
      return;
    }

    // Handle new analysis trigger (original behavior)
    // Extract ticker from page properties
    if (!payload.page?.properties) {
      console.log('❌ No page properties in webhook payload');
      res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: 'Webhook payload must include page.properties',
      });
      return;
    }

    const ticker = extractTicker(payload.page.properties);

    if (!ticker) {
      console.log('❌ No ticker found in page properties');
      res.status(400).json({
        success: false,
        error: 'Missing ticker',
        details: 'Could not find Ticker property in page',
      });
      return;
    }

    const tickerUpper = ticker.toUpperCase().trim();
    console.log(`✅ Ticker extracted: ${tickerUpper}`);

    // Trigger analysis endpoint
    console.log('🚀 Triggering analysis...');

    const analysisUrl = `${req.headers.origin || process.env.VERCEL_URL || 'http://localhost:3000'}/api/analyze`;

    console.log(`Calling: ${analysisUrl}`);

    const analysisResponse = await fetch(analysisUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker: tickerUpper,
        usePollingWorkflow: true,
        timeout: 600,
        pollInterval: 10,
        skipPolling: false,
      }),
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json() as any;
      console.log('❌ Analysis endpoint failed:', errorData);

      res.status(500).json({
        success: false,
        ticker: tickerUpper,
        analysisTriggered: false,
        error: 'Analysis failed',
        details: errorData.error || 'Unknown error from analysis endpoint',
      });
      return;
    }

    const analysisData = await analysisResponse.json() as any;

    const duration = timer.end(true);

    info('Webhook analysis trigger successful', {
      ticker: tickerUpper,
      pageId: analysisData.analysesPageId,
      compositeScore: analysisData.scores?.composite,
      duration,
    });

    console.log('✅ Analysis triggered successfully');
    console.log(`   Page ID: ${analysisData.analysesPageId}`);
    console.log(`   Composite Score: ${analysisData.scores?.composite}`);
    console.log(`   Recommendation: ${analysisData.scores?.recommendation}`);

    console.log('='.repeat(60) + '\n');

    // Return success response
    const response: WebhookResponse = {
      success: true,
      ticker: tickerUpper,
      analysisTriggered: true,
      message: `Analysis triggered for ${tickerUpper}. Check Notion for results.`,
    };

    res.status(200).json(response);
  } catch (error) {
    const duration = timer.endWithError(error as Error);

    logError('Webhook handler error', { duration }, error as Error);

    console.error('❌ Webhook handler error:', error);

    // Format error response with proper status code
    const errorResponse = formatErrorResponse(error);
    const statusCode = getStatusCode(error);

    res.status(statusCode).json({
      ...errorResponse,
      analysisTriggered: false,
    });
  }
}
