/**
 * Template URL Endpoint
 *
 * Provides the Notion template URL for users to duplicate.
 * Returns the template page URL based on the configured SAGE_STOCKS_TEMPLATE_ID.
 *
 * v1.2.13: Manual template duplication flow
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { log, LogLevel } from '../../lib/core/logger';
import { normalizeNotionUrl, extractTemplateId } from '../../lib/core/utils';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    let templateIdOrUrl = process.env.SAGE_STOCKS_TEMPLATE_ID;

    // Fix for incorrect template ID in some environments
    // The ID ce9b3a07... is a deleted/invalid page that was cached in some envs
    const KNOWN_BAD_ID = 'ce9b3a07e96a41c3ac1cc2a99f92bd90';
    const CORRECT_ID = '2a9a1d1b67e0818b8e9fe451466994fc';

    if (!templateIdOrUrl || templateIdOrUrl === KNOWN_BAD_ID) {
      log(LogLevel.WARN, `Replacing invalid/missing template ID '${templateIdOrUrl}' with correct ID`);
      templateIdOrUrl = CORRECT_ID;
    }

    // Normalize URL to handle both notion.so and notion.site
    // This ensures we always return a canonical notion.so URL that works everywhere
    const templateUrl = normalizeNotionUrl(templateIdOrUrl);
    const templateId = extractTemplateId(templateIdOrUrl);

    log(LogLevel.INFO, 'Template URL requested', {
      templateId,
      templateUrl,
      originalValue: templateIdOrUrl,
    });

    res.status(200).json({
      success: true,
      url: templateUrl,
      templateId,
    });
  } catch (error) {
    log(LogLevel.ERROR, 'Template URL endpoint error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get template URL',
    });
  }
}
