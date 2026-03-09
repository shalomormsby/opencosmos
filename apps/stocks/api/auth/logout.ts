/**
 * Logout Endpoint
 *
 * Clears the user's session and redirects to the landing page.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { log, LogLevel } from '../../lib/core/logger';
import { clearUserSession } from '../../lib/core/auth';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    // Clear session cookie
    await clearUserSession(res);

    log(LogLevel.INFO, 'User logged out successfully');

    // Redirect to landing page
    res.redirect('/');
  } catch (error) {
    log(LogLevel.ERROR, 'Logout error', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Even if there's an error, clear the cookie and redirect
    res.setHeader(
      'Set-Cookie',
      'si_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
    );
    res.redirect('/');
  }
}
