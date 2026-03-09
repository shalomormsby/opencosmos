/**
 * Setup API Endpoint
 *
 * Handles first-time user setup:
 * - Auto-detects template databases using scoring algorithm
 * - Validates database access
 * - Stores configuration in Beta Users database
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail, decryptToken, updateSetupProgress } from '../lib/core/auth';
import {
  autoDetectTemplate,
  testDatabaseRead,
  testDatabaseWrite,
  testPageRead,
} from '../lib/domain/templates/detection';
import { CURRENT_VERSION } from '../lib/domain/templates/versions';
import { Client } from '@notionhq/client';

interface SetupRequest {
  stockAnalysesDbId: string;
  stockHistoryDbId: string;
  sageStocksPageId: string;
}

interface ValidationError {
  field: string;
  message: string;
  helpUrl?: string;
}

/**
 * GET /api/setup
 * Returns auto-detection results or redirect if already setup
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Check authentication
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user data
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already set up
    if (user.stockAnalysesDbId && user.stockHistoryDbId && user.sageStocksPageId) {
      return res.json({
        alreadySetup: true,
        redirect: '/analyze',
      });
    }

    // Decrypt user's OAuth token
    const userToken = await decryptToken(user.accessToken);

    // Auto-detect databases
    console.log('🔍 Starting auto-detection for user:', session.email);
    const detection = await autoDetectTemplate(userToken);

    console.log('✓ Auto-detection complete:', {
      stockAnalyses: detection.stockAnalysesDb ? `Found (${detection.stockAnalysesDb.confidence})` : 'Not found',
      stockHistory: detection.stockHistoryDb ? `Found (${detection.stockHistoryDb.confidence})` : 'Not found',
      sageStocksPage: detection.sageStocksPage ? `Found (${detection.sageStocksPage.confidence})` : 'Not found',
    });

    return res.json({
      alreadySetup: false,
      detection,
      needsManual: detection.needsManual,
    });
  } catch (error: any) {
    console.error('❌ Setup GET error:', error);
    return res.status(500).json({
      error: 'Failed to detect template',
      details: error.message,
    });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Check authentication
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user data
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt user's OAuth token
    const userToken = await decryptToken(user.accessToken);

    // Parse request body
    const { stockAnalysesDbId, stockHistoryDbId, sageStocksPageId }: SetupRequest = req.body;

    console.log('📝 Validating setup for user:', session.email);

    // Validate resources
    const validation = await validateSetup(userToken, {
      stockAnalysesDbId,
      stockHistoryDbId,
      sageStocksPageId,
    });

    if (!validation.success) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    console.log('✓ Validation passed, storing configuration...');

    // Get Sage Stocks page URL
    const notion = new Client({ auth: userToken, notionVersion: '2025-09-03' });
    await notion.pages.retrieve({ page_id: sageStocksPageId });

    // Store in Beta Users database
    const adminNotion = new Client({ auth: process.env.NOTION_API_KEY!, notionVersion: '2025-09-03' });
    await adminNotion.pages.update({
      page_id: user.id,
      properties: {
        'Stock Analyses DB ID': { rich_text: [{ text: { content: stockAnalysesDbId } }] },
        'Stock History DB ID': { rich_text: [{ text: { content: stockHistoryDbId } }] },
        'Sage Stocks Page ID': { rich_text: [{ text: { content: sageStocksPageId } }] },
        'Template Version': { rich_text: [{ text: { content: CURRENT_VERSION } }] },
        'Setup Completed At': { date: { start: new Date().toISOString() } },
      }
    });

    console.log('✓ Setup complete for user:', session.email);

    // Mark Step 3 as complete in session
    try {
      await updateSetupProgress(req, {
        currentStep: 4, // Move to step 4 (trigger first analysis)
        completedSteps: [1, 2, 3],
        step3DetectionResults: {
          stockAnalysesDb: { id: stockAnalysesDbId, title: 'Stock Analyses', confidence: 'high' },
          stockHistoryDb: { id: stockHistoryDbId, title: 'Stock History', confidence: 'high' },
          sageStocksPage: { id: sageStocksPageId, title: 'Sage Stocks', confidence: 'high' },
        },
      });
    } catch (error) {
      console.warn('⚠️ Failed to update setup progress (non-critical):', error);
    }

    return res.json({
      success: true,
      redirect: '/analyze',
      message: 'Setup completed successfully!',
    });
  } catch (error: any) {
    console.error('❌ Setup POST error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save setup',
      details: error.message,
    });
  }
}

/**
 * Validate setup configuration
 */
async function validateSetup(
  notionToken: string,
  resources: SetupRequest
): Promise<{ success: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];

  // Validate Stock Analyses database
  console.log('  Checking Stock Analyses database access...');
  try {
    const canRead = await testDatabaseRead(notionToken, resources.stockAnalysesDbId);
    if (!canRead) {
      errors.push({
        field: 'stockAnalysesDbId',
        message: 'Cannot access Stock Analyses database. Make sure your Notion integration has access to this database.',
        helpUrl: 'https://docs.notion.com/reference/intro#integrations',
      });
    }

    const canWrite = await testDatabaseWrite(notionToken, resources.stockAnalysesDbId);
    if (!canWrite) {
      errors.push({
        field: 'stockAnalysesDbId',
        message: 'Cannot write to Stock Analyses database. Check that the integration has edit permissions.',
        helpUrl: 'https://docs.notion.com/reference/intro#integrations',
      });
    }
  } catch (error: any) {
    errors.push({
      field: 'stockAnalysesDbId',
      message: `Invalid Stock Analyses database ID. ${error.message}`,
      helpUrl: 'https://developers.notion.com/reference/retrieve-a-database',
    });
  }

  // Validate Stock History database
  console.log('  Checking Stock History database access...');
  try {
    const canRead = await testDatabaseRead(notionToken, resources.stockHistoryDbId);
    if (!canRead) {
      errors.push({
        field: 'stockHistoryDbId',
        message: 'Cannot access Stock History database. Make sure your Notion integration has access to this database.',
        helpUrl: 'https://docs.notion.com/reference/intro#integrations',
      });
    }
  } catch (error: any) {
    errors.push({
      field: 'stockHistoryDbId',
      message: `Invalid Stock History database ID. ${error.message}`,
      helpUrl: 'https://developers.notion.com/reference/retrieve-a-database',
    });
  }

  // Validate Sage Stocks page
  console.log('  Checking Sage Stocks page access...');
  try {
    const canRead = await testPageRead(notionToken, resources.sageStocksPageId);
    if (!canRead) {
      errors.push({
        field: 'sageStocksPageId',
        message: 'Cannot access Sage Stocks page. Make sure your Notion integration has access to this page.',
        helpUrl: 'https://docs.notion.com/reference/intro#integrations',
      });
    }
  } catch (error: any) {
    errors.push({
      field: 'sageStocksPageId',
      message: `Invalid Sage Stocks page ID. ${error.message}`,
      helpUrl: 'https://developers.notion.com/reference/retrieve-a-page',
    });
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
