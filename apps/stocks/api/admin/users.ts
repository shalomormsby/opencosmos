/**
 * Admin Users Endpoint
 *
 * Returns list of all users with their status and statistics.
 * Requires admin authentication.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, getAllUsers } from '../../lib/core/auth';
import { log, LogLevel } from '../../lib/core/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Require admin authentication
  const session = await requireAdmin(req, res);
  if (!session) {
    return; // requireAdmin already sent error response
  }

  try {
    // Get all users from Beta Users database
    const users = await getAllUsers();

    log(LogLevel.INFO, 'Admin fetched user list', {
      admin: session.email,
      userCount: users.length,
    });

    // Return users (with access tokens masked for security)
    const sanitizedUsers = users.map((user) => ({
      id: user.id,
      notionUserId: user.notionUserId,
      email: user.email,
      name: user.name,
      workspaceId: user.workspaceId,
      status: user.status,
      signupDate: user.signupDate,
      dailyAnalyses: user.dailyAnalyses,
      totalAnalyses: user.totalAnalyses,
      bypassActive: user.bypassActive,
      notes: user.notes,
      // accessToken intentionally omitted
    }));

    res.status(200).json({
      success: true,
      users: sanitizedUsers,
    });
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to fetch users', {
      admin: session.email,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: 'An error occurred while retrieving user data.',
    });
  }
}
