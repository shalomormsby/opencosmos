/**
 * Notion Poller for Sage Stocks v1.0
 *
 * Polls Stock Analyses database to detect when users request new analysis.
 * Enables user-triggered workflow:
 *   1. User checks "Request Analysis" checkbox in Notion
 *   2. Poller detects pending request
 *   3. Calls /api/analyze with ticker
 *   4. Writes results back to Notion
 *
 * v1.0 - Vercel Serverless + TypeScript
 */

import { Client } from '@notionhq/client';
import {
  PageObjectResponse,
  QueryDataSourceResponse,
} from '@notionhq/client/build/src/api-endpoints';

export interface PollerConfig {
  apiKey: string;
  stockAnalysesDbId: string;
  pollInterval?: number; // seconds (default: 30)
  maxRetries?: number; // max retries on error (default: 3)
}

export interface PendingAnalysis {
  pageId: string;
  ticker: string;
  lastEditedTime: string;
  contentStatus: string | null;
}

export interface PageProperties {
  pageId: string;
  ticker: string;
  requestAnalysis: boolean;
  contentStatus: string | null;
  analysisDate: string | null;
  compositeScore: number | null;
  lastEditedTime: string;
}

/**
 * Rate limiter for Notion API (3 requests/second limit)
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 3;
  private readonly windowMs = 1000;

  async throttle(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime + 100));
    }

    this.requests.push(Date.now());
  }
}

/**
 * Notion Poller - queries database for pending analysis requests
 */
export class NotionPoller {
  private client: Client;
  private stockAnalysesDbId: string;
  private pollInterval: number;
  private maxRetries: number;
  private rateLimiter: RateLimiter;
  private isPolling = false;
  private dataSourceCache = new Map<string, string>();

  constructor(config: PollerConfig) {
    this.client = new Client({ auth: config.apiKey, notionVersion: '2025-09-03' });
    this.stockAnalysesDbId = config.stockAnalysesDbId;
    this.pollInterval = config.pollInterval || 30;
    this.maxRetries = config.maxRetries || 3;
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Get data source ID from database ID
   * Required for API version 2025-09-03
   */
  private async getDataSourceId(databaseId: string): Promise<string> {
    if (this.dataSourceCache.has(databaseId)) {
      return this.dataSourceCache.get(databaseId)!;
    }

    const db = await this.client.databases.retrieve({ database_id: databaseId });
    const dataSourceId = (db as any).data_sources?.[0]?.id;

    if (!dataSourceId) {
      throw new Error(`No data source found for database ${databaseId}`);
    }

    this.dataSourceCache.set(databaseId, dataSourceId);
    return dataSourceId;
  }

  /**
   * Get configured poll interval
   */
  getPollInterval(): number {
    return this.pollInterval;
  }

  /**
   * Get configured max retries
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }

  /**
   * Query Stock Analyses database for pending analysis requests
   *
   * Returns pages where:
   * - Request Analysis checkbox = true
   * - Content Status ≠ "Processing" (to avoid duplicates)
   *
   * @returns Array of pending analysis requests
   */
  async queryPendingAnalyses(): Promise<PendingAnalysis[]> {
    await this.rateLimiter.throttle();

    try {
      // Get data source ID for API v2025-09-03
      const dataSourceId = await this.getDataSourceId(this.stockAnalysesDbId);

      const response: QueryDataSourceResponse = await this.client.dataSources.query({
        data_source_id: dataSourceId,
        filter: {
          and: [
            {
              property: 'Request Analysis',
              checkbox: {
                equals: true,
              },
            },
            {
              property: 'Content Status',
              select: {
                does_not_equal: 'Processing',
              },
            },
          ],
        },
        sorts: [
          {
            property: 'Last edited time',
            direction: 'ascending', // Process oldest requests first
          },
        ],
      });

      const pending: PendingAnalysis[] = [];

      for (const page of response.results) {
        if (!('properties' in page)) continue;

        const pageObj = page as PageObjectResponse;
        const ticker = this.extractTicker(pageObj);

        if (!ticker) {
          console.warn(`⚠️  Page ${pageObj.id} has no ticker, skipping`);
          continue;
        }

        const contentStatus = this.extractContentStatus(pageObj);

        pending.push({
          pageId: pageObj.id,
          ticker,
          lastEditedTime: pageObj.last_edited_time,
          contentStatus,
        });
      }

      return pending;
    } catch (error) {
      console.error('❌ Error querying pending analyses:', error);
      throw error;
    }
  }

  /**
   * Get all properties from a Stock Analyses page
   *
   * @param pageId - Notion page ID
   * @returns Page properties including ticker, status, scores, etc.
   */
  async getPageProperties(pageId: string): Promise<PageProperties> {
    await this.rateLimiter.throttle();

    try {
      const page = await this.client.pages.retrieve({
        page_id: pageId,
      });

      if (!('properties' in page)) {
        throw new Error('Invalid page response - no properties');
      }

      const pageObj = page as PageObjectResponse;

      const ticker = this.extractTicker(pageObj);
      if (!ticker) {
        throw new Error('Page has no ticker property');
      }

      return {
        pageId: pageObj.id,
        ticker,
        requestAnalysis: this.extractRequestAnalysis(pageObj),
        contentStatus: this.extractContentStatus(pageObj),
        analysisDate: this.extractAnalysisDate(pageObj),
        compositeScore: this.extractCompositeScore(pageObj),
        lastEditedTime: pageObj.last_edited_time,
      };
    } catch (error) {
      console.error(`❌ Error getting properties for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a page as "Processing" to prevent duplicate analysis
   *
   * @param pageId - Notion page ID
   */
  async markAsProcessing(pageId: string): Promise<void> {
    await this.rateLimiter.throttle();

    try {
      await this.client.pages.update({
        page_id: pageId,
        properties: {
          'Content Status': {
            select: {
              name: 'Processing',
            },
          },
          'Request Analysis': {
            checkbox: false, // Uncheck to prevent re-triggering
          },
        },
      });

      console.log(`✅ Marked page ${pageId} as Processing`);
    } catch (error) {
      console.error(`❌ Error marking page ${pageId} as Processing:`, error);
      throw error;
    }
  }

  /**
   * Mark a page as failed with error message
   *
   * @param pageId - Notion page ID
   * @param errorMessage - Error message to log
   */
  async markAsFailed(pageId: string, errorMessage: string): Promise<void> {
    await this.rateLimiter.throttle();

    try {
      await this.client.pages.update({
        page_id: pageId,
        properties: {
          'Content Status': {
            select: {
              name: 'Analysis Incomplete',
            },
          },
          'Request Analysis': {
            checkbox: false,
          },
        },
      });

      console.log(`❌ Marked page ${pageId} as failed: ${errorMessage}`);
    } catch (error) {
      console.error(`❌ Error marking page ${pageId} as failed:`, error);
    }
  }

  /**
   * Extract ticker from page properties
   */
  private extractTicker(page: PageObjectResponse): string | null {
    const tickerProp = page.properties['Ticker'];

    if (tickerProp && tickerProp.type === 'title' && tickerProp.title.length > 0) {
      return tickerProp.title[0].plain_text.toUpperCase().trim();
    }

    return null;
  }

  /**
   * Extract Request Analysis checkbox value
   */
  private extractRequestAnalysis(page: PageObjectResponse): boolean {
    const requestProp = page.properties['Request Analysis'];

    if (requestProp && requestProp.type === 'checkbox') {
      return requestProp.checkbox;
    }

    return false;
  }

  /**
   * Extract Content Status select value
   */
  private extractContentStatus(page: PageObjectResponse): string | null {
    const statusProp = page.properties['Content Status'];

    if (statusProp && statusProp.type === 'select' && statusProp.select) {
      return statusProp.select.name;
    }

    return null;
  }

  /**
   * Extract Analysis Date
   */
  private extractAnalysisDate(page: PageObjectResponse): string | null {
    const dateProp = page.properties['Analysis Date'];

    if (dateProp && dateProp.type === 'date' && dateProp.date) {
      return dateProp.date.start;
    }

    return null;
  }

  /**
   * Extract Composite Score
   */
  private extractCompositeScore(page: PageObjectResponse): number | null {
    const scoreProp = page.properties['Composite Score'];

    if (scoreProp && scoreProp.type === 'number' && scoreProp.number !== null) {
      return scoreProp.number;
    }

    return null;
  }


  /**
   * Stop polling
   */
  stopPolling(): void {
    this.isPolling = false;
  }

  /**
   * Check if currently polling
   */
  isCurrentlyPolling(): boolean {
    return this.isPolling;
  }
}

/**
 * Create a Notion poller instance
 */
export function createNotionPoller(config: PollerConfig): NotionPoller {
  return new NotionPoller(config);
}
