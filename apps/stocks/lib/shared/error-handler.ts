/**
 * Centralized Error Handler for Stock Analysis Pipeline
 *
 * Ensures consistent error handling across all analysis failure modes:
 * - Sets Status: "Error"
 * - Writes error details to Notes property
 * - Updates Last Auto-Analysis timestamp
 * - Notifies admin via System Errors database
 *
 * This prevents silent failures where Status shows "Complete" with stale data.
 */

import { Client } from '@notionhq/client';

export interface ErrorContext {
  ticker: string;
  userEmail?: string;
  timestamp: Date;
  errorType: 'analysis_failed' | 'sync_failed' | 'api_error' | 'broadcast_failed' | 'timeout' | 'unknown';
  phase?: string; // e.g., "data_fetch", "llm_generation", "notion_write"
}

/**
 * Set analysis error state in Notion
 *
 * Updates the Stock Analyses page with:
 * - Status: "Error"
 * - Notes: Error message with timestamp
 * - Last Auto-Analysis: Current timestamp (shows attempt was made)
 *
 * @param notionClient - Notion client with user's auth token
 * @param pageId - Stock Analyses page ID to update
 * @param error - Error object or message
 * @param context - Error context for logging and notifications
 */
export async function setAnalysisError(
  notionClient: Client,
  pageId: string,
  error: Error | string,
  context: ErrorContext
): Promise<void> {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const formattedError = `[${context.timestamp.toISOString()}] Analysis failed for ${context.ticker}\nType: ${context.errorType}${context.phase ? `\nPhase: ${context.phase}` : ''}\nError: ${errorMessage}`;

    // Update page with error state
    await notionClient.pages.update({
      page_id: pageId,
      properties: {
        'Status': {
          status: { name: 'Error' }
        },
        'Notes': {
          rich_text: [
            {
              text: {
                content: formattedError.substring(0, 2000) // Notion limit
              }
            }
          ]
        },
        'Last Auto-Analysis': {
          date: {
            start: context.timestamp.toISOString()
          }
        }
      }
    });

    console.log(`✅ Error state set for ${context.ticker} (page: ${pageId.substring(0, 8)}...)`);

    // Notify admin (non-blocking - don't fail if notification fails)
    notifyAdmin(errorMessage, context).catch(err => {
      console.error('⚠️  Failed to notify admin:', err);
    });

  } catch (updateError) {
    console.error(`❌ Failed to set error state for ${context.ticker}:`, updateError);
    // Don't throw - we've already failed, don't cascade the failure

    // Try to report this meta-error to admin
    notifyAdmin(
      `Failed to set error state: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
      { ...context, errorType: 'unknown' }
    ).catch(err => {
      console.error('⚠️  Failed to notify admin about meta-error:', err);
    });
  }
}

/**
 * Notify admin of analysis errors via System Errors database
 *
 * Environment variable required: SYSTEM_ERRORS_DB_ID
 * Admin's Notion OAuth token required: ADMIN_NOTION_TOKEN
 *
 * If these aren't configured, logs warning but doesn't fail.
 */
async function notifyAdmin(
  errorMessage: string,
  context: ErrorContext
): Promise<void> {
  try {
    const systemErrorsDbId = process.env.SYSTEM_ERRORS_DB_ID;
    const adminNotionToken = process.env.ADMIN_NOTION_TOKEN;

    if (!systemErrorsDbId || !adminNotionToken) {
      console.warn('⚠️  System Errors database not configured - skipping admin notification');
      console.warn('   Set SYSTEM_ERRORS_DB_ID and ADMIN_NOTION_TOKEN to enable notifications');
      return;
    }

    const adminClient = new Client({
      auth: adminNotionToken,
      notionVersion: '2025-09-03'
    });

    // Create error notification page
    await adminClient.pages.create({
      parent: { database_id: systemErrorsDbId },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: `${context.ticker} - ${context.errorType}`
              }
            }
          ]
        },
        'Timestamp': {
          date: {
            start: context.timestamp.toISOString()
          }
        },
        'Error Type': {
          select: {
            name: formatErrorType(context.errorType)
          }
        },
        'Ticker': {
          rich_text: [
            {
              text: {
                content: context.ticker
              }
            }
          ]
        },
        'User Email': {
          rich_text: context.userEmail ? [
            {
              text: {
                content: context.userEmail
              }
            }
          ] : []
        },
        'Error Message': {
          rich_text: [
            {
              text: {
                content: errorMessage.substring(0, 2000) // Notion limit
              }
            }
          ]
        },
        'Status': {
          select: {
            name: 'New'
          }
        }
      }
    });

    console.log(`✅ Admin notified of ${context.errorType} error for ${context.ticker}`);

  } catch (notifyError) {
    console.error('❌ Failed to notify admin:', notifyError);
    // Don't throw - notification failure shouldn't block analysis pipeline
  }
}

/**
 * Format error type for Notion select property
 */
function formatErrorType(errorType: string): string {
  const typeMap: Record<string, string> = {
    'analysis_failed': 'Analysis Failed',
    'sync_failed': 'Sync Failed',
    'api_error': 'API Error',
    'broadcast_failed': 'Broadcast Failed',
    'timeout': 'Timeout',
    'unknown': 'Unknown'
  };

  return typeMap[errorType] || 'Unknown';
}

/**
 * Batch notify admin of multiple errors (for orchestrator summary)
 *
 * Creates a single summary notification instead of spamming with individual errors.
 */
export async function notifyAdminBatch(
  errors: Array<{ ticker: string; error: string; userEmail?: string }>,
  summary: { total: number; analyzed: number; failed: number }
): Promise<void> {
  try {
    const systemErrorsDbId = process.env.SYSTEM_ERRORS_DB_ID;
    const adminNotionToken = process.env.ADMIN_NOTION_TOKEN;

    if (!systemErrorsDbId || !adminNotionToken) {
      return; // Silently skip if not configured
    }

    const adminClient = new Client({
      auth: adminNotionToken,
      notionVersion: '2025-09-03'
    });

    const errorList = errors.map(e => `• ${e.ticker}: ${e.error}`).join('\n');
    const summaryText = `Daily analysis run completed with ${summary.failed} failures out of ${summary.total} tickers.\n\nFailed analyses:\n${errorList}`;

    await adminClient.pages.create({
      parent: { database_id: systemErrorsDbId },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: `Daily Analysis Run - ${summary.failed} Failures`
              }
            }
          ]
        },
        'Timestamp': {
          date: {
            start: new Date().toISOString()
          }
        },
        'Error Type': {
          select: {
            name: 'Analysis Failed'
          }
        },
        'Ticker': {
          rich_text: [
            {
              text: {
                content: `${errors.length} tickers`
              }
            }
          ]
        },
        'Error Message': {
          rich_text: [
            {
              text: {
                content: summaryText.substring(0, 2000)
              }
            }
          ]
        },
        'Status': {
          select: {
            name: 'New'
          }
        }
      }
    });

    console.log(`✅ Admin notified of batch errors: ${errors.length} failures`);

  } catch (error) {
    console.error('❌ Failed to send batch notification:', error);
  }
}
