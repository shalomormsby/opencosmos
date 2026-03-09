/**
 * Database Validation Endpoint
 *
 * GET /api/debug/validate
 * Validates user's database configuration and reports any issues
 * Automatically reports critical errors to Bug Reports database
 *
 * Returns:
 * - 200: All databases valid
 * - 503: Database configuration invalid (with detailed diagnostics)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail, decryptToken } from '../../lib/core/auth';
import { validateDatabaseConfig } from '../../lib/shared/database-validator';
import packageJson from '../../package.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Check if setup complete (all databases required)
    if (!user.stockAnalysesDbId || !user.stockHistoryDbId || !user.marketContextDbId || !user.stockEventsDbId || !user.sageStocksPageId) {
      return res.status(503).json({
        valid: false,
        error: 'Setup incomplete',
        message: 'All database IDs must be configured. Please complete setup at https://stocks.shalomormsby.com/setup',
        configuration: {
          stockAnalysesDbId: !!user.stockAnalysesDbId,
          stockHistoryDbId: !!user.stockHistoryDbId,
          marketContextDbId: !!user.marketContextDbId,
          stockEventsDbId: !!user.stockEventsDbId,
          sageStocksPageId: !!user.sageStocksPageId,
        },
      });
    }

    // Validate databases
    console.log(`🔍 Validating databases for ${user.email}...`);
    const userToken = await decryptToken(user.accessToken);
    const validation = await validateDatabaseConfig(userToken, {
      stockAnalysesDbId: user.stockAnalysesDbId,
      stockHistoryDbId: user.stockHistoryDbId,
      marketContextDbId: user.marketContextDbId,
      stockEventsDbId: user.stockEventsDbId,
      sageStocksPageId: user.sageStocksPageId,
      userEmail: user.email,
      userId: user.id,
    });

    if (!validation.valid) {
      console.error('❌ Database validation failed:', validation.errors);
      return res.status(503).json({
        valid: false,
        errors: validation.errors,
        warnings: validation.warnings,
        details: validation.details,
        configuration: {
          stockAnalysesDbId: user.stockAnalysesDbId,
          stockHistoryDbId: user.stockHistoryDbId,
          marketContextDbId: user.marketContextDbId,
          stockEventsDbId: user.stockEventsDbId,
          sageStocksPageId: user.sageStocksPageId,
        },
        helpUrl: 'https://stocks.shalomormsby.com/setup',
        message: 'Database configuration is invalid. See errors for details. A bug report has been automatically created.',
      });
    }

    console.log('✅ Database validation passed');
    return res.json({
      valid: true,
      message: 'All databases are accessible and configured correctly',
      details: validation.details,
      warnings: validation.warnings,
      configuration: {
        stockAnalysesDbId: user.stockAnalysesDbId,
        stockHistoryDbId: user.stockHistoryDbId,
        marketContextDbId: user.marketContextDbId,
        stockEventsDbId: user.stockEventsDbId,
        sageStocksPageId: user.sageStocksPageId,
        templateVersion: packageJson.version,
      },
    });
  } catch (error: any) {
    console.error('Database validation error:', error);
    return res.status(500).json({
      valid: false,
      error: 'Validation failed',
      details: error.message,
    });
  }
}
