/**
 * Debug endpoint to check encryption/decryption
 * GET /api/debug/check-encryption
 *
 * Tests if ENCRYPTION_KEY can encrypt and decrypt properly
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { encryptToken, decryptToken } from '../../lib/core/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

    if (!ENCRYPTION_KEY) {
      return res.status(500).json({
        success: false,
        error: 'ENCRYPTION_KEY not configured',
        keyLength: 0,
      });
    }

    // Test encrypt/decrypt with a sample token
    const testToken = 'test_token_12345';
    const encrypted = await encryptToken(testToken);
    const decrypted = await decryptToken(encrypted);

    const success = decrypted === testToken;

    return res.status(200).json({
      success,
      keyConfigured: true,
      keyLength: ENCRYPTION_KEY.length,
      encryptionWorks: success,
      encryptedSample: encrypted.substring(0, 20) + '...', // Show first 20 chars
      message: success
        ? 'Encryption/decryption working correctly with current key'
        : 'Encryption/decryption FAILED - key might be corrupted',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to test encryption',
    });
  }
}
