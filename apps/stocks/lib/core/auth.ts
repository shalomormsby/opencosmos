/**
 * Authentication & User Management Library for Sage Stocks v1.0.0
 *
 * Provides OAuth session management, user CRUD operations, and token encryption.
 * Uses Upstash Redis for session storage and Notion for user data persistence.
 *
 * Features:
 * - Session management (24-hour Redis-backed sessions)
 * - User CRUD operations (Notion Beta Users database)
 * - OAuth token encryption (AES-256-GCM)
 * - Admin authorization helpers
 */

import { Client } from '@notionhq/client';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { log, LogLevel } from './logger';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SetupProgress {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6; // Step 6 = complete
  completedSteps: number[];
  step1ManualConfirm?: boolean;
  step3DetectionResults?: {
    stockAnalysesDb?: { id: string; title: string; confidence: string };
    stockHistoryDb?: { id: string; title: string; confidence: string };
    stockEventsDb?: { id: string; title: string; confidence: string };
    marketContextDb?: { id: string; title: string; confidence: string };
    sageStocksPage?: { id: string; title: string; confidence: string };
  };
  step4FirstTicker?: string;
  step5AnalysisUrl?: string;
  errors?: Array<{ step: number; message: string; code?: string }>;
  startedAt?: number;
  completedAt?: number | null;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  notionUserId: string;
  createdAt: number;
  setupProgress?: SetupProgress;
}

export interface User {
  id: string; // Notion page ID
  notionUserId: string; // Notion user ID from OAuth
  email: string;
  name: string;
  workspaceId: string;
  accessToken: string; // Encrypted
  status: 'pending' | 'approved' | 'denied';
  signupDate: string;
  dailyAnalyses: number;
  totalAnalyses: number;
  bypassActive: boolean;
  notes?: string;
  // v1.0.4: Automation support
  subscriptionTier?: 'Free' | 'Starter' | 'Analyst' | 'Pro';
  timezone?: string; // IANA timezone (e.g., "America/Los_Angeles")
  // v1.1.6: Template version management
  stockAnalysesDbId?: string;
  stockHistoryDbId?: string;
  marketContextDbId?: string; // v1.1.0: Market Context database
  stockEventsDbId?: string;   // v1.2.16: Stock Events database
  sageStocksPageId?: string;
  templateVersion?: string;
  upgradeHistory?: string; // JSON string of UpgradeHistory[]
}

export interface CreateUserData {
  notionUserId: string;
  email: string;
  name: string;
  workspaceId: string;
  accessToken: string; // Plain text - will be encrypted before storing
}

// ============================================================================
// Configuration
// ============================================================================

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const BETA_USERS_DB_ID = process.env.NOTION_BETA_USERS_DB_ID || '';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

// Initialize Notion client for user management
const notion = new Client({ auth: process.env.NOTION_API_KEY, notionVersion: '2025-09-03' });

// Cache for data source IDs (API v2025-09-03)
const dataSourceCache = new Map<string, string>();

/**
 * Get data source ID from database ID
 * Required for API version 2025-09-03
 */
async function getDataSourceId(databaseId: string): Promise<string> {
  if (dataSourceCache.has(databaseId)) {
    return dataSourceCache.get(databaseId)!;
  }

  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = (db as any).data_sources?.[0]?.id;

  if (!dataSourceId) {
    throw new Error(`No data source found for database ${databaseId}`);
  }

  dataSourceCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

// ============================================================================
// Session Management (Redis)
// ============================================================================

/**
 * Store user session in Redis with 24-hour TTL
 * Sets HTTP-only secure cookie with session ID
 */
export async function storeUserSession(
  sessionData: Omit<Session, 'createdAt'>
): Promise<string> {
  const sessionId = randomBytes(32).toString('hex');
  const session: Session = {
    ...sessionData,
    createdAt: Date.now(),
  };

  try {
    // Store session in Redis
    const setResponse = await fetch(`${REDIS_URL}/set/${sessionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });

    if (!setResponse.ok) {
      throw new Error(`Redis SET failed: ${setResponse.status}`);
    }

    // Set TTL
    const expireResponse = await fetch(`${REDIS_URL}/expire/${sessionId}/${SESSION_TTL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!expireResponse.ok) {
      throw new Error(`Redis EXPIRE failed: ${expireResponse.status}`);
    }

    // Build cookie string
    const isLocalhost = process.env.VERCEL_ENV === undefined;
    const cookieOptions = [
      `si_session=${sessionId}`,
      'Path=/',
      `Max-Age=${SESSION_TTL}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(!isLocalhost ? ['Secure'] : []), // Secure flag for HTTPS (Vercel)
    ];

    const cookieString = cookieOptions.join('; ');

    // CRITICAL: Return cookie string for caller to set in response
    // Vercel's serverless functions require headers to be set before sending response

    log(LogLevel.INFO, 'Session stored in Redis', {
      userId: sessionData.userId,
      email: sessionData.email,
      sessionIdPrefix: sessionId.substring(0, 10),
    });

    // Return cookie string for caller to set
    return cookieString;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to store session', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to create session');
  }
}

/**
 * Validate session from request cookie
 * Returns session data if valid, null otherwise
 */
export async function validateSession(req: VercelRequest): Promise<Session | null> {
  try {
    // Extract session ID from cookie
    const cookies = req.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .find((c) => c.trim().startsWith('si_session='));

    if (!sessionCookie) {
      log(LogLevel.INFO, 'No session cookie found', {
        cookiesPresent: cookies.length > 0,
        cookies: cookies ? cookies.substring(0, 100) : 'none',
      });
      return null;
    }

    const sessionId = sessionCookie.split('=')[1].trim();

    log(LogLevel.INFO, 'Session cookie found, validating...', {
      sessionIdPrefix: sessionId.substring(0, 10),
    });

    // Retrieve session from Redis
    const response = await fetch(`${REDIS_URL}/get/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    const data = (await response.json()) as { result: string | null };

    if (!data.result) {
      log(LogLevel.INFO, 'Session not found in Redis', {
        sessionIdPrefix: sessionId.substring(0, 10),
      });
      return null;
    }

    const session = JSON.parse(data.result) as Session;

    log(LogLevel.INFO, 'Session retrieved from Redis', {
      userId: session.userId,
      email: session.email,
      sessionAge: Date.now() - session.createdAt,
    });

    // Check if session is expired (shouldn't happen with Redis TTL, but double-check)
    const age = Date.now() - session.createdAt;
    if (age > SESSION_TTL * 1000) {
      log(LogLevel.INFO, 'Session expired', {
        sessionIdPrefix: sessionId.substring(0, 10),
        age,
        maxAge: SESSION_TTL * 1000,
      });
      await clearUserSession(sessionId);
      return null;
    }

    log(LogLevel.INFO, 'Session validated successfully', {
      userId: session.userId,
      email: session.email,
    });

    return session;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to validate session', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Clear user session (logout)
 * Removes session from Redis and clears cookie
 */
export async function clearUserSession(
  sessionIdOrRes: string | VercelResponse
): Promise<void> {
  try {
    // If passed a response object, extract session ID from request
    if (typeof sessionIdOrRes !== 'string') {
      const res = sessionIdOrRes;
      // Clear cookie
      res.setHeader(
        'Set-Cookie',
        'si_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
      );
      return;
    }

    // Delete session from Redis
    const sessionId = sessionIdOrRes;
    await fetch(`${REDIS_URL}/del/${sessionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    log(LogLevel.INFO, 'Session cleared successfully');
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to clear session', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Setup Progress Management
// ============================================================================

/**
 * Initialize setup progress for a new user session
 */
export async function initializeSetupProgress(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`${REDIS_URL}/get/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    const data = (await response.json()) as { result: string | null };
    if (!data.result) {
      throw new Error('Session not found');
    }

    const session = JSON.parse(data.result) as Session;

    // Initialize setup progress if not exists
    if (!session.setupProgress) {
      session.setupProgress = {
        currentStep: 1,
        completedSteps: [],
        startedAt: Date.now(),
        completedAt: null,
      };

      // Update session in Redis
      await fetch(`${REDIS_URL}/set/${sessionId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });

      log(LogLevel.INFO, 'Setup progress initialized', { userId: session.userId });
    }
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to initialize setup progress', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Update setup progress in session
 */
export async function updateSetupProgress(
  req: VercelRequest,
  updates: Partial<SetupProgress>
): Promise<SetupProgress> {
  try {
    // Extract session ID from cookie
    const cookies = req.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .find((c) => c.trim().startsWith('si_session='));

    if (!sessionCookie) {
      throw new Error('No session cookie found');
    }

    const sessionId = sessionCookie.split('=')[1].trim();

    // Get current session
    const response = await fetch(`${REDIS_URL}/get/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    const data = (await response.json()) as { result: string | null };
    if (!data.result) {
      throw new Error('Session not found');
    }

    const session = JSON.parse(data.result) as Session;

    // Update setup progress
    const currentProgress = session.setupProgress || {
      currentStep: 1,
      completedSteps: [],
      startedAt: Date.now(),
      completedAt: null,
    };

    const updatedProgress: SetupProgress = {
      ...currentProgress,
      ...updates,
    };

    session.setupProgress = updatedProgress;

    // Store updated session
    await fetch(`${REDIS_URL}/set/${sessionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(session),
    });

    log(LogLevel.INFO, 'Setup progress updated', {
      userId: session.userId,
      currentStep: updatedProgress.currentStep,
      completedSteps: updatedProgress.completedSteps,
    });

    return updatedProgress;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to update setup progress', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get setup progress from session
 */
export async function getSetupProgress(req: VercelRequest): Promise<SetupProgress | null> {
  try {
    const session = await validateSession(req);
    if (!session) {
      return null;
    }

    return session.setupProgress || null;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to get setup progress', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// Token Encryption (AES-256-GCM)
// ============================================================================

/**
 * Encrypt OAuth access token using AES-256-GCM
 * Returns base64-encoded encrypted string with IV and auth tag
 */
export async function encryptToken(token: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  try {
    // Generate random IV (initialization vector)
    const iv = randomBytes(16);

    // Create cipher
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    // Encrypt token
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'hex'),
      authTag,
    ]);

    return combined.toString('base64');
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to encrypt token', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Token encryption failed');
  }
}

/**
 * Decrypt OAuth access token
 * Returns plain text token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  try {
    // Decode base64
    const combined = Buffer.from(encryptedToken, 'base64');

    // Extract IV (first 16 bytes)
    const iv = combined.subarray(0, 16);

    // Extract auth tag (last 16 bytes)
    const authTag = combined.subarray(combined.length - 16);

    // Extract encrypted data (middle part)
    const encrypted = combined.subarray(16, combined.length - 16);

    // Create decipher
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt token
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to decrypt token', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Token decryption failed');
  }
}

/**
 * Safely decrypt OAuth access token with better error context
 * Throws a more descriptive error when decryption fails (e.g., after key rotation)
 */
export async function safeDecryptToken(
  encryptedToken: string,
  context?: { userId?: string; email?: string }
): Promise<string> {
  try {
    return await decryptToken(encryptedToken);
  } catch (error) {
    log(LogLevel.ERROR, 'Token decryption failed - likely encryption key rotation', {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('TOKEN_DECRYPTION_FAILED: Authentication token could not be decrypted. Please log out and log back in to re-authenticate.');
  }
}

// ============================================================================
// User Management (Notion CRUD)
// ============================================================================

/**
 * Create or update user in Beta Users database
 * If user exists (by email), updates their info
 * If new user, creates with status: 'pending'
 */
export async function createOrUpdateUser(userData: CreateUserData): Promise<User> {
  if (!BETA_USERS_DB_ID) {
    throw new Error('NOTION_BETA_USERS_DB_ID not configured');
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email);

    // Encrypt access token
    const encryptedToken = await encryptToken(userData.accessToken);

    if (existingUser) {
      // Update existing user
      log(LogLevel.INFO, 'Updating existing user', { email: userData.email });

      await notion.pages.update({
        page_id: existingUser.id,
        properties: {
          Name: { title: [{ text: { content: userData.name } }] },
          'Notion User ID': { rich_text: [{ text: { content: userData.notionUserId } }] },
          'Workspace ID': { rich_text: [{ text: { content: userData.workspaceId } }] },
          'Access Token': { rich_text: [{ text: { content: encryptedToken } }] },
        },
      });

      return {
        ...existingUser,
        name: userData.name,
        notionUserId: userData.notionUserId,
        workspaceId: userData.workspaceId,
        accessToken: encryptedToken,
      };
    } else {
      // Create new user with 'pending' status
      log(LogLevel.INFO, 'Creating new user', { email: userData.email });

      const response = await notion.pages.create({
        parent: { database_id: BETA_USERS_DB_ID },
        properties: {
          Name: { title: [{ text: { content: userData.name } }] },
          Email: { email: userData.email },
          'Notion User ID': { rich_text: [{ text: { content: userData.notionUserId } }] },
          'Workspace ID': { rich_text: [{ text: { content: userData.workspaceId } }] },
          'Access Token': { rich_text: [{ text: { content: encryptedToken } }] },
          Status: { select: { name: 'Pending' } },
          'Daily Analyses': { number: 0 },
          'Total Analyses': { number: 0 },
          'Bypass Active': { checkbox: false },
        },
      });

      return {
        id: response.id,
        notionUserId: userData.notionUserId,
        email: userData.email,
        name: userData.name,
        workspaceId: userData.workspaceId,
        accessToken: encryptedToken,
        status: 'pending',
        signupDate: new Date().toISOString(),
        dailyAnalyses: 0,
        totalAnalyses: 0,
        bypassActive: false,
      };
    }
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to create/update user', {
      email: userData.email,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to save user data');
  }
}

/**
 * Get user by email from Beta Users database
 *
 * Includes retry logic for Notion API service outages
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!BETA_USERS_DB_ID) {
    throw new Error('NOTION_BETA_USERS_DB_ID not configured');
  }

  try {
    // Get data source ID for API v2025-09-03
    const dataSourceId = await getDataSourceId(BETA_USERS_DB_ID);

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Email',
        email: { equals: email },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0] as any;
    return mapNotionPageToUser(page);
  } catch (error: any) {
    // Check if this is a Notion service outage (temporary)
    const isServiceUnavailable = error?.code === 'service_unavailable';
    const isRateLimited = error?.code === 'rate_limited';

    log(LogLevel.ERROR, 'Failed to get user by email', {
      email,
      error: error instanceof Error ? error.message : String(error),
      notionErrorCode: error?.code,
      isServiceUnavailable,
    });

    // Throw specific error for Notion service outages
    if (isServiceUnavailable) {
      throw new Error('NOTION_SERVICE_UNAVAILABLE: Public API service is temporarily unavailable');
    }

    // Throw specific error for rate limiting
    if (isRateLimited) {
      throw new Error('NOTION_RATE_LIMITED: Too many requests to Notion API');
    }

    throw new Error('Failed to retrieve user');
  }
}

/**
 * Get user by Notion User ID
 */
export async function getUserByNotionId(notionUserId: string): Promise<User | null> {
  if (!BETA_USERS_DB_ID) {
    throw new Error('NOTION_BETA_USERS_DB_ID not configured');
  }

  try {
    // Get data source ID for API v2025-09-03
    const dataSourceId = await getDataSourceId(BETA_USERS_DB_ID);

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Notion User ID',
        rich_text: { equals: notionUserId },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0] as any;
    return mapNotionPageToUser(page);
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to get user by Notion ID', {
      notionUserId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to retrieve user');
  }
}

/**
 * Update user status (pending/approved/denied)
 */
export async function updateUserStatus(
  userId: string,
  status: 'pending' | 'approved' | 'denied'
): Promise<void> {
  try {
    await notion.pages.update({
      page_id: userId,
      properties: {
        Status: { select: { name: status.charAt(0).toUpperCase() + status.slice(1) } },
      },
    });

    log(LogLevel.INFO, 'User status updated', { userId, status });
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to update user status', {
      userId,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to update user status');
  }
}

/**
 * Update user's database IDs after template detection (v1.2.4)
 */
export async function updateUserDatabaseIds(
  userId: string,
  databaseIds: {
    sageStocksPageId?: string;
    stockAnalysesDbId?: string;
    stockHistoryDbId?: string;
    marketContextDbId?: string;
    stockEventsDbId?: string;
    setupCompletedAt?: string; // ISO 8601 timestamp
    templateVersion?: string;
  }
): Promise<void> {
  try {
    const properties: Record<string, any> = {};

    if (databaseIds.sageStocksPageId) {
      properties['Sage Stocks Page ID'] = {
        rich_text: [{ text: { content: databaseIds.sageStocksPageId } }],
      };
    }

    if (databaseIds.stockAnalysesDbId) {
      properties['Stock Analyses DB ID'] = {
        rich_text: [{ text: { content: databaseIds.stockAnalysesDbId } }],
      };
    }

    if (databaseIds.stockHistoryDbId) {
      properties['Stock History DB ID'] = {
        rich_text: [{ text: { content: databaseIds.stockHistoryDbId } }],
      };
    }

    if (databaseIds.marketContextDbId) {
      properties['Market Context DB ID'] = {
        rich_text: [{ text: { content: databaseIds.marketContextDbId } }],
      };
    }

    if (databaseIds.stockEventsDbId) {
      properties['Stock Events DB ID'] = {
        rich_text: [{ text: { content: databaseIds.stockEventsDbId } }],
      };
    }

    if (databaseIds.setupCompletedAt) {
      properties['Setup Completed At'] = {
        date: { start: databaseIds.setupCompletedAt },
      };
    }

    if (databaseIds.templateVersion) {
      properties['Template Version'] = {
        rich_text: [{ text: { content: databaseIds.templateVersion } }],
      };
    }

    await notion.pages.update({
      page_id: userId,
      properties,
    });

    log(LogLevel.INFO, 'User database IDs updated', {
      userId,
      hasSageStocksPage: !!databaseIds.sageStocksPageId,
      hasStockAnalyses: !!databaseIds.stockAnalysesDbId,
      hasStockHistory: !!databaseIds.stockHistoryDbId,
      hasMarketContext: !!databaseIds.marketContextDbId,
      hasStockEvents: !!databaseIds.stockEventsDbId,
      setupCompletedAt: databaseIds.setupCompletedAt || null,
    });
  } catch (error: any) {
    // Check if this is a Notion service outage (temporary)
    const isServiceUnavailable = error?.code === 'service_unavailable';
    const isRateLimited = error?.code === 'rate_limited';

    log(LogLevel.ERROR, 'Failed to update user database IDs', {
      userId,
      error: error instanceof Error ? error.message : String(error),
      notionErrorCode: error?.code,
      isServiceUnavailable,
    });

    // Preserve Notion error information for retry logic
    if (isServiceUnavailable) {
      throw new Error('NOTION_SERVICE_UNAVAILABLE: Failed to save database IDs - Notion API temporarily unavailable');
    }

    if (isRateLimited) {
      throw new Error('NOTION_RATE_LIMITED: Failed to save database IDs - Too many requests to Notion');
    }

    throw new Error('Failed to update database IDs');
  }
}

/**
 * Get all users (for admin dashboard)
 */
export async function getAllUsers(): Promise<User[]> {
  if (!BETA_USERS_DB_ID) {
    throw new Error('NOTION_BETA_USERS_DB_ID not configured');
  }

  try {
    // Get data source ID for API v2025-09-03
    const dataSourceId = await getDataSourceId(BETA_USERS_DB_ID);
    const users: User[] = [];
    let hasMore = true;
    let cursor: string | undefined = undefined;

    while (hasMore) {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        sorts: [{ property: 'Signup Date', direction: 'descending' }],
        start_cursor: cursor,
      });

      const pageUsers = response.results.map((page) => mapNotionPageToUser(page as any));
      users.push(...pageUsers);

      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }

    return users;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to get all users', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to retrieve users');
  }
}

/**
 * Increment user's analysis counters
 */
export async function incrementUserAnalyses(userId: string): Promise<void> {
  try {
    // Get current counts
    const page = await notion.pages.retrieve({ page_id: userId }) as any;
    const dailyAnalyses = page.properties['Daily Analyses']?.number || 0;
    const totalAnalyses = page.properties['Total Analyses']?.number || 0;

    // Increment both counters
    await notion.pages.update({
      page_id: userId,
      properties: {
        'Daily Analyses': { number: dailyAnalyses + 1 },
        'Total Analyses': { number: totalAnalyses + 1 },
      },
    });

    log(LogLevel.INFO, 'User analysis counters incremented', { userId });
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to increment user analyses', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - this is non-critical
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Notion page object to User interface
 */
function mapNotionPageToUser(page: any): User {
  const props = page.properties;

  return {
    id: page.id,
    notionUserId: props['Notion User ID']?.rich_text?.[0]?.text?.content || '',
    email: props.Email?.email || '',
    name: props.Name?.title?.[0]?.text?.content || '',
    workspaceId: props['Workspace ID']?.rich_text?.[0]?.text?.content || '',
    accessToken: props['Access Token']?.rich_text?.[0]?.text?.content || '',
    status: (props.Status?.select?.name?.toLowerCase() || 'pending') as User['status'],
    signupDate: props['Signup Date']?.created_time || '',
    dailyAnalyses: props['Daily Analyses']?.number || 0,
    totalAnalyses: props['Total Analyses']?.number || 0,
    bypassActive: props['Bypass Active']?.checkbox || false,
    notes: props.Notes?.rich_text?.[0]?.text?.content || undefined,
    // v1.0.4: Automation support
    subscriptionTier: (props['Subscription Tier']?.select?.name || 'Free') as User['subscriptionTier'],
    timezone: props.Timezone?.rich_text?.[0]?.text?.content || undefined,
    // v1.1.6: Template version management
    stockAnalysesDbId: props['Stock Analyses DB ID']?.rich_text?.[0]?.text?.content || undefined,
    stockHistoryDbId: props['Stock History DB ID']?.rich_text?.[0]?.text?.content || undefined,
    marketContextDbId: props['Market Context DB ID']?.rich_text?.[0]?.text?.content || undefined, // v1.1.0
    stockEventsDbId: props['Stock Events DB ID']?.rich_text?.[0]?.text?.content || undefined,   // v1.2.16
    sageStocksPageId: props['Sage Stocks Page ID']?.rich_text?.[0]?.text?.content || undefined,
    templateVersion: props['Template Version']?.rich_text?.[0]?.text?.content || undefined,
    upgradeHistory: props['Upgrade History']?.rich_text?.[0]?.text?.content || undefined,
  };
}

/**
 * Check if email is admin
 */
export function isAdmin(email: string): boolean {
  return email === ADMIN_EMAIL;
}

/**
 * Require authentication middleware
 * Returns session if authenticated, sends 401 and returns null otherwise
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<Session | null> {
  const session = await validateSession(req);

  if (!session) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
      message: 'Please sign in to continue',
    });
    return null;
  }

  return session;
}

/**
 * Require admin middleware
 * Returns session if admin, sends 403 and returns null otherwise
 */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<Session | null> {
  const session = await requireAuth(req, res);

  if (!session) {
    return null;
  }

  if (!isAdmin(session.email)) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required',
    });
    return null;
  }

  return session;
}
