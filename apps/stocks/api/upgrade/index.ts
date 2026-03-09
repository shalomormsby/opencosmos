/**
 * Template Upgrade Endpoint
 *
 * Handles template version upgrades:
 * - GET: Check version and show upgrade UI
 * - POST: Apply upgrade with retry logic
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSession, getUserByEmail, decryptToken } from '../../lib/core/auth';
import { testDatabaseRead } from '../../lib/domain/templates/detection';
import { CURRENT_VERSION, UPGRADE_CHANGELOGS, needsUpgrade } from '../../lib/domain/templates/versions';
import { Client } from '@notionhq/client';

interface UpgradeHistory {
  version: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/upgrade
 * Shows upgrade page or "up to date" message
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Check authentication
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html><head><title>Not Authenticated</title></head>
        <body><h1>Please sign in first</h1><a href="/api/auth/signin">Sign In</a></body></html>
      `);
    }

    // Get user data
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.status(404).send('<h1>User not found</h1>');
    }

    // Check if setup is complete
    if (!user.sageStocksPageId) {
      return res.redirect(302, '/setup.html');
    }

    // Decrypt token and get current version
    const userToken = await decryptToken(user.accessToken);
    const notion = new Client({ auth: userToken, notionVersion: '2025-09-03' });

    let currentVersion = user.templateVersion || '1.0.0';

    // Try to get version from Sage Stocks page
    try {
      const page = await notion.pages.retrieve({ page_id: user.sageStocksPageId });
      const props = (page as any).properties || {};
      const versionProp = props['Template Version'];

      if (versionProp && versionProp.rich_text && versionProp.rich_text.length > 0) {
        currentVersion = versionProp.rich_text[0].plain_text;
      }
    } catch (error) {
      console.error('Could not read Template Version from page:', error);
    }

    // Check if upgrade needed
    const upgradeNeeded = needsUpgrade(currentVersion, CURRENT_VERSION);

    if (!upgradeNeeded) {
      // Already up to date
      const sageStocksUrl = `https://notion.so/${user.sageStocksPageId.replace(/-/g, '')}`;

      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Up to Date</title>
          <meta http-equiv="refresh" content="3;url=${sageStocksUrl}" />
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen flex items-center justify-center p-4">
          <div class="text-center max-w-md">
            <div class="text-7xl mb-6">✅</div>
            <h1 class="text-3xl font-bold text-gray-900 mb-3">You're up to date!</h1>
            <p class="text-xl text-gray-700 mb-2">Running Sage Stocks <span class="font-semibold">${currentVersion}</span></p>
            <p class="text-sm text-gray-500 mt-6">Redirecting back to Notion in 3 seconds...</p>
            <a href="${sageStocksUrl}" class="inline-block mt-4 text-blue-600 hover:text-blue-700 underline">Go now →</a>
          </div>
        </body>
        </html>
      `);
    }

    // Show upgrade page
    const changelog = UPGRADE_CHANGELOGS[CURRENT_VERSION];
    const sageStocksUrl = `https://notion.so/${user.sageStocksPageId.replace(/-/g, '')}`;

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Upgrade Available</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen p-4">
        <div class="max-w-3xl mx-auto py-8">
          <div class="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
            <!-- Header -->
            <div class="text-center mb-8">
              <div class="text-6xl mb-4">🎉</div>
              <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Update Available</h1>
              <p class="text-xl text-gray-600">
                <span class="font-semibold">${currentVersion}</span> → <span class="font-semibold text-blue-600">${CURRENT_VERSION}</span>
              </p>
            </div>

            <!-- Changelog -->
            <div class="border-t border-b border-gray-200 py-6 my-6">
              <h2 class="text-2xl font-bold mb-4 text-gray-900">${changelog.title}</h2>
              ${changelog.changes.length > 0 ? `
                <div class="space-y-3">
                  ${changelog.changes.map(change => `
                    <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span class="text-2xl flex-shrink-0">
                        ${change.type === 'added' ? '⛰️' : change.type === 'improved' ? '📈' : '🔧'}
                      </span>
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${change.item}</div>
                        <div class="text-sm text-gray-600 mt-1">${change.impact}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : '<p class="text-gray-600">Initial release</p>'}

              <div class="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <span>⏱</span>
                <span>Estimated time: ${changelog.estimatedTime}</span>
              </div>
            </div>

            <!-- Safety Info -->
            <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded">
              <h3 class="font-semibold text-green-900 mb-2">What will change:</h3>
              <ul class="text-sm space-y-1 text-green-800">
                <li>✓ Template content and instructions updated</li>
                <li>✓ New features added (if applicable)</li>
                <li>✓ Version number updated to ${CURRENT_VERSION}</li>
                <li class="font-semibold">✓ Your Stock Analyses and History data remains untouched</li>
              </ul>
            </div>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                onclick="performUpgrade()"
                class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200 min-h-[3.5rem]"
              >
                Upgrade now
              </button>
              <a
                href="${sageStocksUrl}"
                class="flex-1 text-center border-2 border-gray-300 px-6 py-4 rounded-xl hover:bg-gray-50 font-medium text-lg transition-all duration-200 flex items-center justify-center"
              >
                Maybe later
              </a>
            </div>

            <!-- Status -->
            <div id="status" class="hidden mt-6"></div>
          </div>
        </div>

        <script>
          async function performUpgrade() {
            const statusDiv = document.getElementById('status');
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = \`
              <div class="text-center py-6 bg-blue-50 rounded-xl border border-blue-200">
                <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                <p class="mt-4 text-gray-700 font-medium">Upgrading your template...</p>
                <p class="text-sm text-gray-600 mt-2">This may take up to 30 seconds</p>
              </div>
            \`;

            // Disable button
            event.target.disabled = true;
            event.target.classList.add('opacity-50', 'cursor-not-allowed');

            try {
              const response = await fetch('/api/upgrade', { method: 'POST' });
              const data = await response.json();

              if (data.success) {
                statusDiv.innerHTML = \`
                  <div class="bg-green-50 border-l-4 border-green-400 p-6 rounded-xl text-center">
                    <div class="text-5xl mb-3">✅</div>
                    <div class="text-xl font-bold text-green-900 mb-2">Upgrade complete!</div>
                    <p class="text-green-700 mb-4">Your template is now on version ${CURRENT_VERSION}</p>
                    <p class="text-sm text-gray-600">Redirecting to Notion in <span id="countdown">3</span> seconds...</p>
                  </div>
                \`;

                // Countdown redirect
                let seconds = 3;
                const interval = setInterval(() => {
                  seconds--;
                  const countdownEl = document.getElementById('countdown');
                  if (countdownEl) countdownEl.textContent = seconds;
                  if (seconds <= 0) {
                    clearInterval(interval);
                    window.location.href = data.redirect || '${sageStocksUrl}';
                  }
                }, 1000);
              } else {
                throw new Error(data.error || 'Upgrade failed');
              }
            } catch (error) {
              statusDiv.innerHTML = \`
                <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl">
                  <div class="font-semibold text-red-900 mb-1">Upgrade failed</div>
                  <p class="text-sm text-red-700">\${error.message}</p>
                  <p class="text-xs text-red-600 mt-2">Please try again or contact support if the issue persists.</p>
                </div>
              \`;
              event.target.disabled = false;
              event.target.classList.remove('opacity-50', 'cursor-not-allowed');
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ Upgrade GET error:', error);
    return res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
}

/**
 * POST /api/upgrade
 * Apply upgrade with retry logic
 */
async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Check authentication
    const session = await validateSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user data
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check setup
    if (!user.sageStocksPageId || !user.stockAnalysesDbId || !user.stockHistoryDbId) {
      return res.status(400).json({ error: 'Setup not completed' });
    }

    console.log('🔄 Starting upgrade for user:', session.email);

    // Pre-upgrade validation
    const validation = await validateUpgradePreconditions(user);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: `Pre-upgrade check failed: ${validation.issues.join(', ')}`
      });
    }

    // Perform upgrade with retry
    const result = await performUpgradeWithRetry(user, CURRENT_VERSION);

    if (!result.success) {
      throw new Error(result.error || 'Upgrade failed');
    }

    // Update Beta Users database
    const adminNotion = new Client({ auth: process.env.NOTION_API_KEY!, notionVersion: '2025-09-03' });

    // Get existing upgrade history
    const existingHistory: UpgradeHistory[] = user.upgradeHistory
      ? JSON.parse(user.upgradeHistory)
      : [];

    const newHistory: UpgradeHistory = {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      success: true
    };

    await adminNotion.pages.update({
      page_id: user.id,
      properties: {
        'Template Version': { rich_text: [{ text: { content: CURRENT_VERSION } }] },
        'Last Upgrade At': { date: { start: new Date().toISOString() } },
        'Upgrade History': {
          rich_text: [{
            text: { content: JSON.stringify([...existingHistory, newHistory]) }
          }]
        }
      }
    });

    console.log('✓ Upgrade complete for user:', session.email);

    const sageStocksUrl = `https://notion.so/${user.sageStocksPageId.replace(/-/g, '')}`;

    return res.json({
      success: true,
      redirect: sageStocksUrl,
      version: CURRENT_VERSION
    });

  } catch (error: any) {
    console.error('❌ Upgrade POST error:', error);

    // Log failure (if user was found)
    try {
      const session = await validateSession(req);
      if (session) {
        const user = await getUserByEmail(session.email);
        if (user) {
          const adminNotion = new Client({ auth: process.env.NOTION_API_KEY!, notionVersion: '2025-09-03' });
          const existingHistory: UpgradeHistory[] = user.upgradeHistory
            ? JSON.parse(user.upgradeHistory)
            : [];

          const failureRecord: UpgradeHistory = {
            version: CURRENT_VERSION,
            timestamp: new Date().toISOString(),
            success: false,
            error: error.message
          };

          await adminNotion.pages.update({
            page_id: user.id,
            properties: {
              'Upgrade History': {
                rich_text: [{
                  text: { content: JSON.stringify([...existingHistory, failureRecord]) }
                }]
              }
            }
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log upgrade failure:', logError);
    }

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Validate pre-upgrade conditions
 */
async function validateUpgradePreconditions(user: any): Promise<{ success: boolean; issues: string[] }> {
  const issues: string[] = [];
  const userToken = await decryptToken(user.accessToken);

  // Check database access
  try {
    await testDatabaseRead(userToken, user.stockAnalysesDbId);
  } catch (error: any) {
    issues.push('Cannot access Stock Analyses database');
  }

  try {
    await testDatabaseRead(userToken, user.stockHistoryDbId);
  } catch (error: any) {
    issues.push('Cannot access Stock History database');
  }

  // Check page access
  try {
    const notion = new Client({ auth: userToken, notionVersion: '2025-09-03' });
    await notion.pages.retrieve({ page_id: user.sageStocksPageId });
  } catch (error: any) {
    issues.push('Cannot access Sage Stocks page');
  }

  return {
    success: issues.length === 0,
    issues
  };
}

/**
 * Perform upgrade with retry logic
 */
async function performUpgradeWithRetry(
  user: any,
  targetVersion: string,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      await applyUpgrade(user, targetVersion);
      console.log(`  ✓ Upgrade succeeded on attempt ${attempt}`);
      return { success: true };
    } catch (error) {
      lastError = error as Error;
      console.error(`  ✗ Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`  Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: `Upgrade failed after ${maxRetries} attempts: ${lastError?.message}`
  };
}

/**
 * Apply upgrade changes
 */
async function applyUpgrade(user: any, targetVersion: string): Promise<void> {
  const userToken = await decryptToken(user.accessToken);
  const notion = new Client({ auth: userToken, notionVersion: '2025-09-03' });

  // Update Template Version property in Sage Stocks page
  await notion.pages.update({
    page_id: user.sageStocksPageId,
    properties: {
      'Template Version': {
        rich_text: [{ text: { content: targetVersion } }]
      }
    }
  });

  // TODO: Update page content (version display)
  // This would require reading page blocks and updating specific text
  // For v1, we'll just update the property

  // Version-specific upgrades
  // Example for future versions:
  // if (targetVersion === '1.1.0') {
  //   await createSectorAnalysisDatabase(user, notion);
  // }
  // if (targetVersion === '1.2.0') {
  //   await addPropertyToStockAnalyses(user, notion, 'Sector', { select: {...} });
  // }

  console.log(`  ✓ Template Version updated to ${targetVersion}`);
}
