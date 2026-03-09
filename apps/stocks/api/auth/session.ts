/**
 * Session Check Endpoint
 *
 * Returns the current session status. Used by frontend to check authentication.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession } from '../../lib/core/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = await validateSession(req);

    if (!session) {
      return res.status(200).json({
        authenticated: false,
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        id: session.userId, // Notion page ID (for rate limiting)
        email: session.email,
        name: session.name,
        notionUserId: session.notionUserId,
      },
    });
  } catch (error) {
    // On error, return unauthenticated
    return res.status(200).json({
      authenticated: false,
    });
  }
}
