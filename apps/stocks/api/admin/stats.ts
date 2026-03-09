/**
 * Admin Stats Endpoint
 *
 * Returns basic statistics for the admin dashboard:
 * - Total users
 * - Users by status (pending, approved, denied)
 * - Total analyses today/lifetime
 * - Recent signups
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
    // Get all users
    const users = await getAllUsers();

    // Calculate statistics
    const totalUsers = users.length;
    const pendingUsers = users.filter((u) => u.status === 'pending').length;
    const approvedUsers = users.filter((u) => u.status === 'approved').length;
    const deniedUsers = users.filter((u) => u.status === 'denied').length;

    const totalAnalysesLifetime = users.reduce(
      (sum, u) => sum + (u.totalAnalyses || 0),
      0
    );

    const totalAnalysesToday = users.reduce(
      (sum, u) => sum + (u.dailyAnalyses || 0),
      0
    );

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSignups = users.filter((u) => {
      const signupDate = new Date(u.signupDate);
      return signupDate >= sevenDaysAgo;
    }).length;

    // Active users (users with analyses in the last 7 days)
    const activeUsers = users.filter((u) => u.dailyAnalyses > 0).length;

    log(LogLevel.INFO, 'Admin fetched stats', {
      admin: session.email,
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        pendingUsers,
        approvedUsers,
        deniedUsers,
        totalAnalysesLifetime,
        totalAnalysesToday,
        recentSignups,
        activeUsers,
      },
    });
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to fetch stats', {
      admin: session.email,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: 'An error occurred while retrieving stats.',
    });
  }
}
