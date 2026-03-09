/**
 * Queue Storage Module for Chunked Processing
 *
 * Manages queue persistence in Upstash Redis to support chunked processing
 * across multiple cron invocations. Enables processing 15+ stocks without
 * hitting Vercel's 800-second timeout by splitting work into chunks.
 *
 * Features:
 * - Store queue to Redis with market context
 * - Load queue from Redis with resume support
 * - Track processed count across invocations
 * - Auto-cleanup with 24-hour TTL
 * - Date-based queue IDs for daily executions
 */

import { QueueItem } from './orchestrator';
import { MarketContext } from '../domain/market/index';
import { log, LogLevel } from '../core/logger';

// Redis configuration
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const QUEUE_TTL = 86400; // 24 hours in seconds

/**
 * Stored queue structure in Redis
 */
export interface StoredQueue {
  id: string;                        // e.g., "queue:2025-12-01"
  items: QueueItem[];                // Full queue of stocks to process
  processedCount: number;            // How many items processed so far
  totalCount: number;                // Total items in queue
  createdAt: string;                 // ISO timestamp
  marketContext: MarketContext | null;  // Market context for this run
  chunkSize: number;                 // Items per chunk (default: 8)
  lastChunkAt?: string;              // ISO timestamp of last chunk processing
}

/**
 * Queue status for monitoring
 */
export interface QueueStatus {
  exists: boolean;
  queueId?: string;
  totalItems?: number;
  processedItems?: number;
  remainingItems?: number;
  progress?: number;                 // Percentage (0-100)
  isComplete?: boolean;
  createdAt?: string;
  lastChunkAt?: string;
}

/**
 * Save queue to Redis for chunked processing
 *
 * Creates a new queue in Redis with the full list of stocks to process.
 * The queue persists across multiple cron invocations to enable resume logic.
 *
 * @param queue - Full queue of stocks to process
 * @param marketContext - Market context for this analysis run
 * @param chunkSize - Number of items to process per chunk (default: 8)
 * @returns Queue ID for retrieval
 */
export async function saveQueueToRedis(
  queue: QueueItem[],
  marketContext: MarketContext | null,
  chunkSize: number = 8
): Promise<string> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis credentials not configured');
  }

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const queueId = `analysis_queue:${date}`;

  const storedQueue: StoredQueue = {
    id: queueId,
    items: queue,
    processedCount: 0,
    totalCount: queue.length,
    createdAt: new Date().toISOString(),
    marketContext,
    chunkSize,
  };

  try {
    // Store queue in Redis
    const response = await fetch(`${REDIS_URL}/set/${queueId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(storedQueue),
    });

    if (!response.ok) {
      throw new Error(`Redis SET failed: ${response.status} ${response.statusText}`);
    }

    // Set TTL to auto-cleanup after 24 hours
    await fetch(`${REDIS_URL}/expire/${queueId}/${QUEUE_TTL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    log(LogLevel.INFO, 'Queue saved to Redis', {
      queueId,
      totalItems: queue.length,
      chunkSize,
      ttl: QUEUE_TTL,
    });

    return queueId;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to save queue to Redis', {
      queueId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Load queue from Redis
 *
 * Retrieves the stored queue for the specified date (or today if not provided).
 * Returns null if no queue exists (first run of the day).
 *
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 * @returns Stored queue or null if not found
 */
export async function loadQueueFromRedis(date?: string): Promise<StoredQueue | null> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis credentials not configured');
  }

  const targetDate = date || new Date().toISOString().split('T')[0];
  const queueId = `analysis_queue:${targetDate}`;

  try {
    const response = await fetch(`${REDIS_URL}/get/${queueId}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        log(LogLevel.INFO, 'No queue found in Redis (first run)', { queueId });
        return null;
      }
      throw new Error(`Redis GET failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { result: string | null };

    if (!data.result) {
      log(LogLevel.INFO, 'Queue not found in Redis', { queueId });
      return null;
    }

    const storedQueue: StoredQueue = JSON.parse(data.result);

    log(LogLevel.INFO, 'Queue loaded from Redis', {
      queueId,
      totalItems: storedQueue.totalCount,
      processedItems: storedQueue.processedCount,
      remainingItems: storedQueue.totalCount - storedQueue.processedCount,
    });

    return storedQueue;
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to load queue from Redis', {
      queueId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Update processed count in Redis
 *
 * Called after each chunk completes to track progress across invocations.
 *
 * @param queueId - Queue ID to update
 * @param processedCount - New processed count
 */
export async function updateProcessedCount(
  queueId: string,
  processedCount: number
): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis credentials not configured');
  }

  try {
    // Load current queue
    const response = await fetch(`${REDIS_URL}/get/${queueId}`, {
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Redis GET failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { result: string | null };

    if (!data.result) {
      throw new Error('Queue not found');
    }

    const storedQueue: StoredQueue = JSON.parse(data.result);

    // Update processed count and last chunk timestamp
    storedQueue.processedCount = processedCount;
    storedQueue.lastChunkAt = new Date().toISOString();

    // Save back to Redis
    await fetch(`${REDIS_URL}/set/${queueId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(storedQueue),
    });

    log(LogLevel.INFO, 'Queue processed count updated', {
      queueId,
      processedCount,
      totalCount: storedQueue.totalCount,
      progress: Math.round((processedCount / storedQueue.totalCount) * 100),
    });
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to update processed count', {
      queueId,
      processedCount,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Delete queue from Redis
 *
 * Called when all chunks are complete to clean up storage.
 * Note: Queues also auto-expire after 24 hours via TTL.
 *
 * @param queueId - Queue ID to delete
 */
export async function deleteQueue(queueId: string): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis credentials not configured');
  }

  try {
    await fetch(`${REDIS_URL}/del/${queueId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    log(LogLevel.INFO, 'Queue deleted from Redis', { queueId });
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to delete queue from Redis', {
      queueId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get queue status for monitoring
 *
 * Returns current queue status including progress information.
 * Useful for debugging and monitoring dashboard.
 *
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 * @returns Queue status
 */
export async function getQueueStatus(date?: string): Promise<QueueStatus> {
  try {
    const storedQueue = await loadQueueFromRedis(date);

    if (!storedQueue) {
      return {
        exists: false,
      };
    }

    const processedItems = storedQueue.processedCount;
    const totalItems = storedQueue.totalCount;
    const remainingItems = totalItems - processedItems;
    const progress = Math.round((processedItems / totalItems) * 100);
    const isComplete = processedItems >= totalItems;

    return {
      exists: true,
      queueId: storedQueue.id,
      totalItems,
      processedItems,
      remainingItems,
      progress,
      isComplete,
      createdAt: storedQueue.createdAt,
      lastChunkAt: storedQueue.lastChunkAt,
    };
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to get queue status', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
