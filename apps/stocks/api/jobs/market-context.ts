/**
 * Market Context Job Endpoint (v1.1.0)
 *
 * Runs daily at 5:00 AM PT (13:00 UTC) via Vercel Cron
 * Creates Market Context pages in each user's Notion workspace
 *
 * Workflow:
 * 1. Verify cron secret (authentication)
 * 2. Check if today is a NYSE market day (skip weekends/holidays)
 * 3. Fetch market context from FMP + FRED APIs (once, cached)
 * 4. Get all beta users
 * 5. For each user, create Market Context page in their database
 * 6. Return execution summary
 *
 * Architecture: Per-user distribution (Option 2)
 * - Each user has their own Market Context database (from template)
 * - Cron creates one page per user
 * - Uses each user's OAuth access token
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from '@notionhq/client';
import { getAllUsers, decryptToken } from '../../lib/core/auth';
import { getMarketContext, MarketContext } from '../../lib/domain/market/index';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';

// Vercel function configuration
export const maxDuration = 120; // 2 minutes (need time for per-user distribution)

// Environment variables
const CRON_SECRET = process.env.CRON_SECRET || '';
const FMP_API_KEY = process.env.FMP_API_KEY || '';
const FRED_API_KEY = process.env.FRED_API_KEY || '';

/**
 * Main cron handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  console.log('[MARKET JOB] Market context distribution started');

  try {
    // 1. Verify cron secret
    const authHeader = req.headers.authorization;
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (!providedSecret || providedSecret !== CRON_SECRET) {
      console.error('[MARKET JOB] Unauthorized - invalid cron secret');
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid cron secret'
      });
      return;
    }

    console.log('[MARKET JOB] ✓ Cron secret verified');

    // 2. Check environment variables
    if (!FMP_API_KEY || !FRED_API_KEY) {
      console.error('[MARKET JOB] Missing required API keys');
      res.status(500).json({
        success: false,
        error: 'Configuration error',
        message: 'Missing FMP or FRED API keys',
      });
      return;
    }

    // 3. Check if today is a market day
    const isMarketDay = await checkNYSEMarketDay();

    if (!isMarketDay) {
      console.log('[MARKET JOB] Market closed today (weekend or holiday) - skipping execution');
      res.json({
        success: true,
        message: 'Market closed today',
        marketDay: false,
        created: 0,
        failed: 0,
      });
      return;
    }

    console.log('[MARKET JOB] ✓ Market is open today');

    // 4. Fetch market context ONCE (will be distributed to all users)
    const fmpClient = createFMPClient(FMP_API_KEY);
    const fredClient = createFREDClient(FRED_API_KEY);

    console.log('[MARKET JOB] Fetching market context...');
    const marketContext = await getMarketContext(fmpClient, fredClient, true); // Force refresh

    console.log(`[MARKET JOB] ✓ Market context fetched: ${marketContext.regime} regime (${Math.round(marketContext.regimeConfidence * 100)}% confidence)`);

    // 5. Get all users
    const users = await getAllUsers();
    console.log(`[MARKET JOB] Found ${users.length} users`);

    // 6. Distribute market context to each user's database
    const results = await distributeMarketContext(users, marketContext);

    // 7. Return success summary
    const summary = {
      success: true,
      marketDay: true,
      totalUsers: users.length,
      created: results.created,
      failed: results.failed,
      skipped: results.skipped,
      context: {
        date: marketContext.date,
        regime: marketContext.regime,
        confidence: Math.round(marketContext.regimeConfidence * 100),
        riskAssessment: marketContext.riskAssessment,
        vix: marketContext.vix.toFixed(1),
        spyChange1D: marketContext.spy.change1D.toFixed(2),
      }
    };

    console.log('[MARKET JOB] ✓ Market context distribution complete:', JSON.stringify(summary, null, 2));
    res.json(summary);

  } catch (error) {
    console.error('[MARKET JOB] Fatal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Distribute market context to all users
 */
async function distributeMarketContext(
  users: any[],
  marketContext: MarketContext
): Promise<{ created: number; failed: number; skipped: number }> {
  let created = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      // Skip if user doesn't have Market Context database configured
      if (!user.marketContextDbId) {
        console.log(`[MARKET JOB] Skipping ${user.email} - no Market Context DB ID`);
        skipped++;
        continue;
      }

      // Decrypt user's access token
      const accessToken = await decryptToken(user.accessToken);

      // Create Notion client with user's OAuth token
      const notion = new Client({ auth: accessToken });

      // Check if page already exists for today
      const today = marketContext.date;
      const existingPage = await checkExistingMarketContext(notion, user.marketContextDbId, today);

      if (existingPage) {
        console.log(`[MARKET JOB] Skipping ${user.email} - already has context for ${today}`);
        skipped++;
        continue;
      }

      // Create market context page
      await createMarketContextPage(notion, user.marketContextDbId, marketContext);

      console.log(`[MARKET JOB] ✓ Created market context for ${user.email}`);
      created++;

    } catch (error) {
      console.error(`[MARKET JOB] Failed to create market context for ${user.email}:`, error);
      failed++;
    }
  }

  return { created, failed, skipped };
}

/**
 * Check if market context already exists for today
 */
async function checkExistingMarketContext(
  notion: Client,
  databaseId: string,
  date: string
): Promise<boolean> {
  try {
    // Get data source ID (API v2025-09-03)
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const dataSourceId = (db as any).data_sources?.[0]?.id;

    if (!dataSourceId) {
      console.warn('[MARKET JOB] No data source found for database');
      return false;
    }

    // Query using data source API
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Date',
        date: {
          equals: date,
        },
      },
      page_size: 1,
    });

    return response.results.length > 0;
  } catch (error) {
    console.warn('[MARKET JOB] Error checking existing context:', error);
    return false; // Assume doesn't exist if check fails
  }
}

/**
 * Validate market context data quality and log warnings for missing fields
 */
function validateMarketContextData(marketContext: MarketContext): void {
  const missingFields: string[] = [];

  // Check economic indicators
  if (marketContext.economic.cpiYoY === null) {
    missingFields.push('CPI (YoY)');
  }
  if (marketContext.economic.fedFundsRate === null) {
    missingFields.push('Fed Funds Rate');
  }
  if (marketContext.economic.unemployment === null) {
    missingFields.push('Unemployment');
  }
  if (marketContext.economic.yieldCurveSpread === null) {
    missingFields.push('Yield Curve Spread');
  }
  if (marketContext.economic.consumerSentiment === null) {
    missingFields.push('Consumer Sentiment');
  }

  // Check VIX
  if (!marketContext.vix || marketContext.vix === 0) {
    missingFields.push('VIX Level');
  }

  // Log warnings for missing fields
  if (missingFields.length > 0) {
    console.warn(`[MARKET JOB] ⚠️  Missing economic data: ${missingFields.join(', ')}`);
    console.warn('[MARKET JOB]    These fields will be null in the Notion database');
  } else {
    console.log('[MARKET JOB] ✓ All economic indicators available');
  }
}

/**
 * Create Market Context page in user's Notion database
 */
async function createMarketContextPage(
  notion: Client,
  databaseId: string,
  marketContext: MarketContext
): Promise<string> {
  // Step 0: Validate data quality
  validateMarketContextData(marketContext);

  // Step 1: Create page with properties
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      // Title (Date) - matches schema name
      'Name': {
        title: [
          {
            text: {
              content: `Market Context - ${marketContext.date}`,
            },
          },
        ],
      },

      // Analysis Date (matches schema) - when analysis was run
      'Date': {
        date: {
          start: marketContext.date,
        },
      },

      // Market Regime (Select)
      'Market Regime': {
        select: {
          name: marketContext.regime,
        },
      },

      // Risk Assessment (Select)
      'Risk Assessment': {
        select: {
          name: marketContext.riskAssessment,
        },
      },

      // Confidence (Number as percentage) - custom field
      'Confidence': {
        number: Math.round(marketContext.regimeConfidence * 100),
      },

      // VIX Level (Number)
      'VIX Level': {
        number: marketContext.vix ? parseFloat(marketContext.vix.toFixed(2)) : 0,
      },

      // S&P 500 Change 1D (Number as percentage)
      'SPY 1D Change': {
        number: parseFloat(marketContext.spy.change1D.toFixed(2)),
      },

      // S&P 500 Change 1M (Number as percentage)
      'SPY 1M Change': {
        number: parseFloat(marketContext.spy.change1M.toFixed(2)),
      },

      // QQQ Change 1D (NEW - was missing)
      'QQQ 1D Change': {
        number: parseFloat(marketContext.qqq.change1D.toFixed(2)),
      },

      // Market Direction (Select)
      'Market Direction': {
        select: {
          name: marketContext.marketDirection,
        },
      },

      // Economic Indicators (NEW - were missing)
      'CPI (YoY)': {
        number: marketContext.economic.cpiYoY ? parseFloat(marketContext.economic.cpiYoY.toFixed(2)) : null,
      },

      'Fed Funds Rate': {
        number: marketContext.economic.fedFundsRate ? parseFloat(marketContext.economic.fedFundsRate.toFixed(2)) : null,
      },

      'Unemployment': {
        number: marketContext.economic.unemployment ? parseFloat(marketContext.economic.unemployment.toFixed(2)) : null,
      },

      'Yield Curve Spread': {
        number: marketContext.economic.yieldCurveSpread ? parseFloat(marketContext.economic.yieldCurveSpread.toFixed(2)) : null,
      },

      'Consumer Sentiment': {
        number: marketContext.economic.consumerSentiment ? parseFloat(marketContext.economic.consumerSentiment.toFixed(2)) : null,
      },

      // Top Sectors (Multi-select)
      'Top Sectors': {
        multi_select: marketContext.sectorLeaders.map((sector: any) => ({
          name: sector.name,
        })),
      },

      // Bottom Sectors (Multi-select)
      'Bottom Sectors': {
        multi_select: marketContext.sectorLaggards.map((sector: any) => ({
          name: sector.name,
        })),
      },

      // Summary (Rich Text) - brief summary for property
      'Summary': {
        rich_text: [
          {
            text: {
              content: generateBriefSummary(marketContext).substring(0, 2000), // Notion limit
            },
          },
        ],
      },
    },
  });

  // Step 2: Write detailed content to page body
  const detailedContent = generateDetailedMarketContent(marketContext);
  await writeMarketContentToPage(notion, response.id, detailedContent);

  return response.id;
}

/**
 * Generate brief summary for the Summary property
 */
function generateBriefSummary(marketContext: MarketContext): string {
  const { regime, regimeConfidence, vix, spy } = marketContext;
  const confidencePercent = Math.round(regimeConfidence * 100);
  const spyChange = spy.change1M > 0 ? `+${spy.change1M.toFixed(1)}%` : `${spy.change1M.toFixed(1)}%`;

  return `${regime} regime (${confidencePercent}% confidence). S&P 500 ${spyChange} (1M), VIX at ${vix.toFixed(1)}.`;
}

/**
 * Generate detailed markdown content for page body
 */
function generateDetailedMarketContent(marketContext: MarketContext): string {
  const {
    regime,
    regimeConfidence,
    riskAssessment,
    spy,
    qqq,
    dia,
    iwm,
    vix,
    marketDirection,
    sectorLeaders,
    sectorLaggards,
    economic,
    keyInsights,
  } = marketContext;

  const confidencePercent = Math.round(regimeConfidence * 100);

  // Callout with market conditions summary
  let content = `> **${regime} Market Regime**\n`;
  content += `> ${confidencePercent}% confidence • ${riskAssessment} positioning • VIX ${vix.toFixed(1)}\n\n`;

  // Section 1: What's Happening Right Now
  content += `## 📊 What's Happening Right Now\n\n`;
  content += `**Market Direction:** ${marketDirection} • **Risk Assessment:** ${riskAssessment}\n\n`;

  content += `**Major Indices (1-Day Change)**\n`;
  content += `- S&P 500 (SPY): ${formatChange(spy.change1D)}\n`;
  content += `- Nasdaq (QQQ): ${formatChange(qqq.change1D)}\n`;
  content += `- Dow (DIA): ${formatChange(dia.change1D)}\n`;
  content += `- Russell 2000 (IWM): ${formatChange(iwm.change1D)}\n\n`;

  content += `**Major Indices (1-Month Change)**\n`;
  content += `- S&P 500: ${formatChange(spy.change1M)}\n`;
  content += `- Nasdaq: ${formatChange(qqq.change1M)}\n`;
  content += `- Dow: ${formatChange(dia.change1M)}\n`;
  content += `- Russell 2000: ${formatChange(iwm.change1M)}\n\n`;

  content += `**Volatility:** VIX at ${vix.toFixed(1)} (${getVixInterpretation(vix)})\n\n`;

  // Section 2: Sector Rotation
  content += `## 🔄 Sector Rotation\n\n`;
  content += `**Leading Sectors (Top 3)**\n`;
  sectorLeaders.forEach((sector: any) => {
    content += `- ${sector.name}: ${formatChange(sector.change1M)} (1M)\n`;
  });
  content += `\n`;

  content += `**Lagging Sectors (Bottom 3)**\n`;
  sectorLaggards.forEach((sector: any) => {
    content += `- ${sector.name}: ${formatChange(sector.change1M)} (1M)\n`;
  });
  content += `\n`;

  content += interpretSectorRotation(sectorLeaders, sectorLaggards, regime);
  content += `\n\n`;

  // Section 3: Economic Context
  content += `## 📈 Economic Context\n\n`;

  if (economic.cpiYoY !== null) {
    content += `**Inflation (CPI Year-over-Year):** ${economic.cpiYoY.toFixed(1)}%\n`;
  }
  if (economic.fedFundsRate !== null) {
    content += `**Fed Funds Rate:** ${economic.fedFundsRate.toFixed(2)}%\n`;
  }
  if (economic.unemployment !== null) {
    content += `**Unemployment Rate:** ${economic.unemployment.toFixed(1)}%\n`;
  }
  if (economic.yieldCurveSpread !== null) {
    const inverted = economic.yieldCurveSpread < 0;
    content += `**Yield Curve Spread (10Y-2Y):** ${economic.yieldCurveSpread.toFixed(2)}% ${inverted ? '⚠️ (Inverted - Recession Risk)' : ''}\n`;
  }
  if (economic.consumerSentiment !== null) {
    content += `**Consumer Sentiment:** ${economic.consumerSentiment.toFixed(1)}\n`;
  }
  content += `\n`;

  // Section 4: Key Insights
  content += `## 💡 Key Insights\n\n`;
  keyInsights.forEach((insight: string) => {
    content += `${insight}\n\n`;
  });

  // Section 5: Risks & Opportunities
  content += `## ⚠️ Risks & Opportunities\n\n`;
  content += generateRisksAndOpportunities(regime, vix, spy, economic);
  content += `\n`;

  // Section 6: Investment Implications
  content += `## 💼 Investment Implications\n\n`;
  content += generateInvestmentImplications(regime, riskAssessment, sectorLeaders, sectorLaggards);

  return content;
}

/**
 * Format percentage change with +/- sign
 */
function formatChange(value: number): string {
  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Get VIX interpretation
 */
function getVixInterpretation(vix: number): string {
  if (vix < 15) return 'Very Low - Complacency Risk';
  if (vix < 20) return 'Low - Calm Markets';
  if (vix < 25) return 'Moderate - Normal Volatility';
  if (vix < 30) return 'Elevated - Uncertainty';
  return 'Very High - Fear/Panic';
}

/**
 * Interpret sector rotation patterns
 */
function interpretSectorRotation(leaders: any[], _laggards: any[], regime: string): string {
  const growthSectors = ['Technology', 'Consumer Discretionary', 'Communication Services'];
  const defensiveSectors = ['Utilities', 'Consumer Staples', 'Healthcare'];
  const cyclicalSectors = ['Industrials', 'Materials', 'Financials'];

  const leaderNames = leaders.map(s => s.name);

  const growthLeading = leaderNames.some(name => growthSectors.includes(name));
  const defensiveLeading = leaderNames.some(name => defensiveSectors.includes(name));
  const cyclicalLeading = leaderNames.some(name => cyclicalSectors.includes(name));

  let interpretation = '**Interpretation:** ';

  if (regime === 'Risk-On') {
    if (growthLeading || cyclicalLeading) {
      interpretation += 'Classic risk-on rotation with growth/cyclical sectors leading. Investors are embracing risk.';
    } else {
      interpretation += 'Unusual pattern - defensive sectors leading in a risk-on regime may signal transition ahead.';
    }
  } else if (regime === 'Risk-Off') {
    if (defensiveLeading) {
      interpretation += 'Classic risk-off rotation with defensive sectors leading. Investors seeking safety.';
    } else {
      interpretation += 'Unusual pattern - growth/cyclical sectors showing strength despite risk-off regime. Watch for regime shift.';
    }
  } else {
    interpretation += 'Mixed sector performance reflects transition period. No clear directional bias.';
  }

  return interpretation;
}

/**
 * Generate risks and opportunities based on market context
 */
function generateRisksAndOpportunities(
  regime: string,
  vix: number,
  spy: any,
  economic: any
): string {
  let content = '';

  if (regime === 'Risk-On') {
    content += '**Opportunities:**\n';
    content += '- Growth stocks and high-beta names likely to outperform\n';
    content += '- Cyclical sectors (Tech, Discretionary, Financials) favored\n';
    content += '- Consider adding risk on pullbacks\n\n';

    content += '**Risks:**\n';
    if (vix < 15) {
      content += '- Very low volatility suggests complacency - potential for sudden reversals\n';
    }
    if (economic.yieldCurveSpread !== null && economic.yieldCurveSpread < 0) {
      content += '- Inverted yield curve signals recession risk ahead\n';
    }
    content += '- Extended valuations may limit upside\n';
  } else if (regime === 'Risk-Off') {
    content += '**Opportunities:**\n';
    content += '- Quality defensive stocks may offer stability\n';
    content += '- Counter-trend bounces can be traded tactically\n';
    content += '- Building watchlists for eventual regime shift\n\n';

    content += '**Risks:**\n';
    content += '- Continued selling pressure in growth names\n';
    content += '- High volatility creates challenging trading environment\n';
    if (spy.change1M < -10) {
      content += '- Deep correction underway - risk of further downside\n';
    }
  } else {
    content += '**Opportunities:**\n';
    content += '- Stock-specific opportunities as sector rotation creates volatility\n';
    content += '- Potential to position ahead of next regime shift\n\n';

    content += '**Risks:**\n';
    content += '- Lack of clear trend makes directional bets challenging\n';
    content += '- Whipsaws possible as market searches for direction\n';
  }

  return content;
}

/**
 * Generate investment implications based on market regime
 */
function generateInvestmentImplications(
  regime: string,
  _riskAssessment: string,
  leaders: any[],
  laggards: any[]
): string {
  let content = '';

  if (regime === 'Risk-On') {
    content += '**Recommended Approach:** Aggressive to Neutral\n\n';
    content += '- ✅ **Favor:** Growth stocks, momentum names, cyclical sectors\n';
    content += '- ✅ **Sectors:** ' + leaders.map(s => s.name).join(', ') + '\n';
    content += '- ⚠️ **Reduce:** Defensive positions, low-volatility strategies\n';
    content += '- 📊 **Portfolio Positioning:** Can increase beta and sector concentration\n';
  } else if (regime === 'Risk-Off') {
    content += '**Recommended Approach:** Defensive to Neutral\n\n';
    content += '- ✅ **Favor:** Quality names, dividend stocks, defensive sectors\n';
    content += '- ✅ **Sectors:** ' + leaders.map(s => s.name).join(', ') + '\n';
    content += '- ⚠️ **Reduce:** Speculative positions, high-beta stocks\n';
    content += '- 📊 **Portfolio Positioning:** Reduce beta, raise cash, focus on capital preservation\n';
  } else {
    content += '**Recommended Approach:** Balanced and Selective\n\n';
    content += '- ✅ **Favor:** Stock-specific opportunities, both growth and defensive\n';
    content += '- ✅ **Strong Sectors:** ' + leaders.map(s => s.name).join(', ') + '\n';
    content += '- ⚠️ **Weak Sectors:** ' + laggards.map(s => s.name).join(', ') + '\n';
    content += '- 📊 **Portfolio Positioning:** Maintain balance, avoid large directional bets until regime clarity\n';
  }

  return content;
}

/**
 * Write detailed content to page body using Notion blocks API
 */
async function writeMarketContentToPage(
  notion: Client,
  pageId: string,
  content: string
): Promise<void> {
  try {
    // Convert markdown to Notion blocks (simplified version)
    const blocks = convertMarkdownToBlocks(content);

    // Write blocks to page in chunks (max 100 blocks per request)
    const chunkSize = 100;
    for (let i = 0; i < blocks.length; i += chunkSize) {
      const chunk = blocks.slice(i, i + chunkSize);
      await notion.blocks.children.append({
        block_id: pageId,
        children: chunk,
      });

      // Add small delay between chunks to avoid rate limits
      if (i + chunkSize < blocks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[MARKET JOB] ✓ Wrote ${blocks.length} blocks to page ${pageId}`);
  } catch (error) {
    console.error(`[MARKET JOB] Failed to write content to page:`, error);
    throw error;
  }
}

/**
 * Convert markdown to Notion blocks
 * (Simplified - handles common markdown patterns)
 */
function convertMarkdownToBlocks(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Callout (blockquote)
    if (line.startsWith('> ')) {
      const calloutLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        calloutLines.push(lines[i].substring(2));
        i++;
      }
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{
            type: 'text',
            text: { content: calloutLines.join('\n') },
          }],
          icon: { type: 'emoji', emoji: '📊' },
          color: 'blue_background',
        },
      });
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{
            type: 'text',
            text: { content: line.substring(3) },
          }],
        },
      });
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: parseRichText(line.substring(2)),
        },
      });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: parseRichText(line),
      },
    });
    i++;
  }

  return blocks;
}

/**
 * Parse markdown text into Notion rich text format
 * Handles **bold** and basic text
 */
function parseRichText(text: string): any[] {
  const richText: any[] = [];
  const parts = text.split(/(\*\*.*?\*\*)/);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      richText.push({
        type: 'text',
        text: { content: part.slice(2, -2) },
        annotations: { bold: true },
      });
    } else if (part) {
      // Regular text
      richText.push({
        type: 'text',
        text: { content: part },
      });
    }
  }

  return richText.length > 0 ? richText : [{ type: 'text', text: { content: text } }];
}

/**
 * Check if today is a NYSE market day
 * (Same logic as scheduled-analyses.ts)
 */
async function checkNYSEMarketDay(): Promise<boolean> {
  const today = new Date();

  // Check if weekend
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log('[MARKET JOB] Weekend detected - market closed');
    return false;
  }

  // Check hardcoded 2025 holidays
  const dateStr = today.toISOString().split('T')[0];
  const holidays2025 = [
    '2025-01-01', // New Year's Day
    '2025-01-20', // MLK Day
    '2025-02-17', // Presidents Day
    '2025-04-18', // Good Friday
    '2025-05-26', // Memorial Day
    '2025-07-04', // Independence Day
    '2025-09-01', // Labor Day
    '2025-11-27', // Thanksgiving
    '2025-12-25'  // Christmas
  ];

  if (holidays2025.includes(dateStr)) {
    console.log(`[MARKET JOB] Holiday detected (${dateStr}) - market closed`);
    return false;
  }

  return true;
}
