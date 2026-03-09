/**
 * Admin Approve/Deny Endpoint
 *
 * Updates a user's status to approved or denied.
 * Requires admin authentication.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, updateUserStatus } from '../../lib/core/auth';
import { log, LogLevel } from '../../lib/core/logger';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Require admin authentication
  const session = await requireAdmin(req, res);
  if (!session) {
    return; // requireAdmin already sent error response
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Use POST to update user status.',
    });
    return;
  }

  try {
    const { userId, status } = req.body;

    // Validate input
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'userId is required and must be a string.',
      });
      return;
    }

    if (!status || !['approved', 'denied', 'pending'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'status must be one of: approved, denied, pending',
      });
      return;
    }

    // Update user status
    await updateUserStatus(userId, status);

    log(LogLevel.INFO, 'Admin updated user status', {
      admin: session.email,
      userId,
      newStatus: status,
    });

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
    });
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to update user status', {
      admin: session.email,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      message: 'An error occurred while updating the user.',
    });
  }
}
