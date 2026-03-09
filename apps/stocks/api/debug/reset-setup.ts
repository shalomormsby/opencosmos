/**
 * Debug endpoint to reset user setup (for testing auto-detection)
 * TEMPORARY - Will be removed after debugging
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail } from '../../lib/core/auth';
import { Client } from '@notionhq/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    console.log('🔧 [DEBUG] Resetting setup for user:', session.email);

    // Clear setup fields in Beta Users database
    const adminNotion = new Client({ auth: process.env.NOTION_API_KEY!, notionVersion: '2025-09-03' });
    await adminNotion.pages.update({
      page_id: user.id,
      properties: {
        'Stock Analyses DB ID': { rich_text: [] },
        'Stock History DB ID': { rich_text: [] },
        'Sage Stocks Page ID': { rich_text: [] },
        'Template Version': { rich_text: [] },
        'Setup Completed At': { date: null },
      }
    });

    console.log('✓ [DEBUG] Setup reset complete');

    return res.json({
      success: true,
      message: 'Setup reset successfully - you can now test auto-detection again',
    });
  } catch (error: any) {
    console.error('❌ [DEBUG] Reset failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset setup',
      details: error.message,
    });
  }
}
