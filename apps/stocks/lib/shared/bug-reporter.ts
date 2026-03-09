/**
 * Bug Reporter Utility
 *
 * Automatically logs errors and system issues to Notion Bug Reports database
 * Provides structured error reporting with diagnostic context
 *
 * Usage:
 *   reportBug(error, 'analyze.ts', { ticker: 'AAPL', userId: '123' });
 */

import { Client } from '@notionhq/client';
import { log, LogLevel } from '../core/logger';

// Bug Reports database ID (from URL: https://www.notion.so/ormsby/68f392263ca94f79bd9d5882c4c657f2)
const BUG_REPORTS_DB_ID = '68f392263ca94f79bd9d5882c4c657f2';
const ADMIN_NOTION_KEY = process.env.ADMIN_NOTION_TOKEN || process.env.ADMIN_NOTION_KEY || process.env.NOTION_API_KEY;

export interface BugReportContext {
  ticker?: string;
  userId?: string;
  userEmail?: string;
  endpoint?: string;
  requestId?: string;
  duration?: number;
  stackTrace?: string;
  configuredDbIds?: {
    stockAnalysesDbId?: string;
    stockHistoryDbId?: string;
    marketContextDbId?: string;
    stockEventsDbId?: string;
    sageStocksPageId?: string;
  };
  [key: string]: any; // Allow any additional context
}

export enum BugSeverity {
  CRITICAL = 'Critical', // System down, data loss, security breach
  HIGH = 'High',         // Feature broken, affects multiple users
  MEDIUM = 'Medium',     // Feature degraded, workaround exists
  LOW = 'Low',           // Minor issue, cosmetic, edge case
}

export enum BugCategory {
  DATABASE_ACCESS = 'Database Access',
  API_ERROR = 'API Error',
  AUTHENTICATION = 'Authentication',
  CONFIGURATION = 'Configuration',
  DATA_VALIDATION = 'Data Validation',
  INTEGRATION = 'Integration',
  SCHEDULED_TASK = 'Scheduled Task',
  TEMPLATE_DETECTION = 'Template Detection',
  OTHER = 'Other',
}

/**
 * Report a bug to Notion Bug Reports database
 * Non-blocking - logs errors but doesn't throw
 */
export async function reportBug(
  error: Error | string,
  source: string,
  context: BugReportContext = {},
  severity: BugSeverity = BugSeverity.MEDIUM,
  category: BugCategory = BugCategory.OTHER
): Promise<string | null> {
  // Don't report bugs if admin key not configured (dev environment)
  if (!ADMIN_NOTION_KEY) {
    console.warn('[BUG_REPORTER] NOTION_API_KEY not configured - skipping bug report');
    return null;
  }

  try {
    const notion = new Client({ auth: ADMIN_NOTION_KEY, notionVersion: '2025-09-03' });

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Build diagnostic info block
    const diagnosticInfo = buildDiagnosticInfo(errorMessage, errorStack, source, context);

    // Build title
    const title = `[${category}] ${source}: ${errorMessage.substring(0, 80)}`;

    // Create bug report page
    const response = await notion.pages.create({
      parent: { database_id: BUG_REPORTS_DB_ID },
      properties: {
        // Title property
        Name: {
          title: [{ text: { content: title } }],
        },
        // Severity
        Severity: {
          select: { name: severity },
        },
        // Category
        Category: {
          select: { name: category },
        },
        // Status (default to New)
        Status: {
          select: { name: 'New' },
        },
        // Source
        Source: {
          rich_text: [{ text: { content: source } }],
        },
        // User Email (if provided)
        ...(context.userEmail && {
          'User Email': {
            email: context.userEmail,
          },
        }),
      },
      children: [
        // Error Message
        {
          object: 'block' as const,
          type: 'heading_2' as const,
          heading_2: {
            rich_text: [{ text: { content: '🔴 Error Message' } }],
          },
        },
        {
          object: 'block' as const,
          type: 'quote' as const,
          quote: {
            rich_text: [{ text: { content: errorMessage } }],
          },
        },
        // Diagnostic Info
        {
          object: 'block' as const,
          type: 'heading_2' as const,
          heading_2: {
            rich_text: [{ text: { content: '🔍 Diagnostic Info' } }],
          },
        },
        {
          object: 'block' as const,
          type: 'code' as const,
          code: {
            rich_text: [{ text: { content: diagnosticInfo } }],
            language: 'javascript',
          },
        },
        // Stack Trace (if available)
        ...(errorStack
          ? [
            {
              object: 'block' as const,
              type: 'heading_2' as const,
              heading_2: {
                rich_text: [{ text: { content: '📚 Stack Trace' } }],
              },
            },
            {
              object: 'block' as const,
              type: 'code' as const,
              code: {
                rich_text: [
                  {
                    text: {
                      content: errorStack.substring(0, 2000), // Notion limit
                    },
                  },
                ],
                language: 'javascript',
              },
            },
          ]
          : []),
        // Timestamp
        {
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [
              {
                text: {
                  content: `\n⏰ Reported at: ${new Date().toISOString()}`,
                },
              },
            ],
          },
        },
      ] as any,
    });

    log(LogLevel.INFO, 'Bug report created', {
      pageId: response.id,
      severity,
      category,
      source,
    });

    return response.id;
  } catch (reportError) {
    // Don't throw - bug reporting should never break the app
    const originalErrorMsg = error instanceof Error ? error.message : String(error);
    log(LogLevel.ERROR, 'Failed to create bug report', {
      error: reportError instanceof Error ? reportError.message : String(reportError),
      originalError: originalErrorMsg,
    });
    return null;
  }
}

/**
 * Build diagnostic info string from context
 */
function buildDiagnosticInfo(
  errorMessage: string,
  errorStack: string | undefined,
  source: string,
  context: BugReportContext
): string {
  const info: any = {
    timestamp: new Date().toISOString(),
    source,
    errorMessage,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
    },
    ...context,
  };

  // Add stack trace summary (first 3 lines)
  if (errorStack) {
    const stackLines = errorStack.split('\n').slice(0, 3);
    info.stackSummary = stackLines.join('\n');
  }

  return JSON.stringify(info, null, 2);
}

/**
 * Report a database configuration error with detailed diagnostics
 * Specialized function for DB ID mismatch issues
 */
export async function reportDatabaseConfigError(
  errorMessage: string,
  context: {
    userEmail: string;
    userId: string;
    configuredDbIds: {
      stockAnalysesDbId?: string;
      stockHistoryDbId?: string;
      marketContextDbId?: string;
      stockEventsDbId?: string;
      sageStocksPageId?: string;
    };
    foundDbIds?: {
      stockAnalysesDbs: string[];
      stockHistoryDbs: string[];
      marketContextDbs: string[];
      stockEventsDbs: string[];
      sageStocksPages: string[];
    };
    source: string;
  }
): Promise<string | null> {
  const enhancedContext: BugReportContext = {
    userEmail: context.userEmail,
    userId: context.userId,
    configuredDbIds: context.configuredDbIds,
    foundDbIds: context.foundDbIds,
    diagnosis: generateDiagnosis(context.configuredDbIds, context.foundDbIds),
  };

  return reportBug(
    new Error(errorMessage),
    context.source,
    enhancedContext,
    BugSeverity.CRITICAL,
    BugCategory.DATABASE_ACCESS
  );
}

/**
 * Generate diagnosis for database config issues
 */
function generateDiagnosis(
  configured: {
    stockAnalysesDbId?: string;
    stockHistoryDbId?: string;
    marketContextDbId?: string;
    stockEventsDbId?: string;
    sageStocksPageId?: string;
  },
  found?: {
    stockAnalysesDbs: string[];
    stockHistoryDbs: string[];
    marketContextDbs: string[];
    stockEventsDbs: string[];
    sageStocksPages: string[];
  }
): string {
  const issues: string[] = [];

  if (found) {
    // Check Stock Analyses
    if (configured.stockAnalysesDbId && !found.stockAnalysesDbs.includes(configured.stockAnalysesDbId)) {
      issues.push(
        `❌ Stock Analyses DB ID not found in workspace (configured: ${configured.stockAnalysesDbId})`
      );
      if (found.stockAnalysesDbs.length > 0) {
        issues.push(`   Available: ${found.stockAnalysesDbs.join(', ')}`);
      }
    }

    // Check Stock History
    if (configured.stockHistoryDbId && !found.stockHistoryDbs.includes(configured.stockHistoryDbId)) {
      issues.push(
        `❌ Stock History DB ID not found in workspace (configured: ${configured.stockHistoryDbId})`
      );
      if (found.stockHistoryDbs.length > 0) {
        issues.push(`   Available: ${found.stockHistoryDbs.join(', ')}`);
      }
    }

    // Check Market Context
    if (configured.marketContextDbId && !found.marketContextDbs.includes(configured.marketContextDbId)) {
      issues.push(
        `❌ Market Context DB ID not found in workspace (configured: ${configured.marketContextDbId})`
      );
      if (found.marketContextDbs.length > 0) {
        issues.push(`   Available: ${found.marketContextDbs.join(', ')}`);
      }
    }

    // Check Stock Events
    if (configured.stockEventsDbId && !found.stockEventsDbs.includes(configured.stockEventsDbId)) {
      issues.push(
        `❌ Stock Events DB ID not found in workspace (configured: ${configured.stockEventsDbId})`
      );
      if (found.stockEventsDbs.length > 0) {
        issues.push(`   Available: ${found.stockEventsDbs.join(', ')}`);
      }
    }

    // Check Sage Stocks Page
    if (configured.sageStocksPageId && !found.sageStocksPages.includes(configured.sageStocksPageId)) {
      issues.push(
        `❌ Sage Stocks Page ID not found in workspace (configured: ${configured.sageStocksPageId})`
      );
      if (found.sageStocksPages.length > 0) {
        issues.push(`   Available: ${found.sageStocksPages.join(', ')}`);
      }
    }

    // Check for duplicates
    if (found.stockAnalysesDbs.length > 1) {
      issues.push(`⚠️  Multiple Stock Analyses databases found (${found.stockAnalysesDbs.length})`);
    }
    if (found.stockHistoryDbs.length > 1) {
      issues.push(`⚠️  Multiple Stock History databases found (${found.stockHistoryDbs.length})`);
    }
    if (found.marketContextDbs.length > 1) {
      issues.push(`⚠️  Multiple Market Context databases found (${found.marketContextDbs.length})`);
    }
    if (found.stockEventsDbs.length > 1) {
      issues.push(`⚠️  Multiple Stock Events databases found (${found.stockEventsDbs.length})`);
    }
  }

  return issues.length > 0 ? issues.join('\n') : 'No issues detected';
}

/**
 * Quick helper to report API errors
 */
export async function reportAPIError(
  error: Error,
  endpoint: string,
  userEmail?: string
): Promise<string | null> {
  return reportBug(
    error,
    endpoint,
    { endpoint, userEmail },
    BugSeverity.HIGH,
    BugCategory.API_ERROR
  );
}

/**
 * Quick helper to report scheduled task failures
 */
export async function reportScheduledTaskError(
  error: Error,
  taskName: string,
  context: BugReportContext = {}
): Promise<string | null> {
  return reportBug(
    error,
    `cron: ${taskName}`,
    context,
    BugSeverity.HIGH,
    BugCategory.SCHEDULED_TASK
  );
}
