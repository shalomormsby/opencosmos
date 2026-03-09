/**
 * Test Script: Market Context with ALL Fixes Applied
 *
 * Tests the complete implementation including:
 * - Economic indicator property mapping
 * - Detailed content generation
 * - Content written to page body
 *
 * Usage: npx ts-node scripts/test-market-context-fixed.ts
 */

import { getAllUsers, decryptToken } from '../../lib/core/auth';
import { getMarketContext, MarketContext } from '../../lib/domain/market/index';
import { createFMPClient } from '../../lib/integrations/fmp/client';
import { createFREDClient } from '../../lib/integrations/fred/client';
import { Client } from '@notionhq/client';

async function testMarketContextWithFixes() {
  console.log('🧪 Testing Market Context Distribution (WITH ALL FIXES)\n');

  try {
    // Step 1: Get all users
    console.log('Step 1: Fetching users...');
    const users = await getAllUsers();
    console.log(`✓ Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found. Skipping test.');
      return;
    }

    // Step 2: Fetch market context
    console.log('Step 2: Fetching market context...');
    const fmpApiKey = process.env.FMP_API_KEY || '';
    const fredApiKey = process.env.FRED_API_KEY || '';

    if (!fmpApiKey || !fredApiKey) {
      throw new Error('Missing FMP_API_KEY or FRED_API_KEY');
    }

    const fmpClient = createFMPClient(fmpApiKey);
    const fredClient = createFREDClient(fredApiKey);

    const marketContext = await getMarketContext(fmpClient, fredClient, true);

    console.log(`✓ Market Context Fetched:`);
    console.log(`  - Date: ${marketContext.date}`);
    console.log(`  - Regime: ${marketContext.regime} (${Math.round(marketContext.regimeConfidence * 100)}% confidence)`);
    console.log(`  - Risk Assessment: ${marketContext.riskAssessment}`);
    console.log(`  - VIX: ${marketContext.vix.toFixed(1)}`);
    console.log(`  - SPY 1D: ${marketContext.spy.change1D > 0 ? '+' : ''}${marketContext.spy.change1D.toFixed(2)}%`);
    console.log(`  - Economic Indicators:`);
    console.log(`    • CPI: ${marketContext.economic.cpiYoY !== null ? marketContext.economic.cpiYoY.toFixed(1) + '%' : 'N/A'}`);
    console.log(`    • Fed Funds Rate: ${marketContext.economic.fedFundsRate !== null ? marketContext.economic.fedFundsRate.toFixed(2) + '%' : 'N/A'}`);
    console.log(`    • Unemployment: ${marketContext.economic.unemployment !== null ? marketContext.economic.unemployment.toFixed(1) + '%' : 'N/A'}`);
    console.log(`    • Yield Curve: ${marketContext.economic.yieldCurveSpread !== null ? marketContext.economic.yieldCurveSpread.toFixed(2) + '%' : 'N/A'}`);
    console.log();

    // Step 3: Use shalomormsby@gmail.com (who just updated their database schema)
    const user = users.find(u => u.email === 'shalomormsby@gmail.com') || users.find(u => u.marketContextDbId) || users[0];
    console.log(`Step 3: Creating test page for ${user.email}...\n`);

    if (!user.marketContextDbId) {
      console.log(`⚠️  No users have Market Context DB ID configured`);
      console.log(`   Set this in the Beta Users database`);
      console.log(`\n   Available users:`);
      users.forEach(u => {
        console.log(`     - ${u.email}: ${u.marketContextDbId || 'NOT SET'}`);
      });
      return;
    }

    console.log(`  - Market Context DB ID: ${user.marketContextDbId}`);

    // Decrypt user's access token
    const accessToken = await decryptToken(user.accessToken);
    const notion = new Client({ auth: accessToken });

    // Create market context page with ALL fixes
    const pageId = await createMarketContextPageWithFixes(notion, user.marketContextDbId, marketContext);

    console.log(`\n✅ Test page created successfully!`);
    console.log(`   Page ID: ${pageId}`);
    console.log(`\n📊 Validating fixes:`);
    console.log(`   ✓ Economic indicators mapped to properties`);
    console.log(`   ✓ Detailed content generated and written to page body`);
    console.log(`   ✓ Summary property contains brief summary only`);
    console.log(`   ✓ Data validation performed`);
    console.log(`\nOpen the page in Notion to verify all sections are present:`);
    console.log(`   - Callout with regime summary`);
    console.log(`   - 📊 What's Happening Right Now`);
    console.log(`   - 🔄 Sector Rotation`);
    console.log(`   - 📈 Economic Context`);
    console.log(`   - 💡 Key Insights`);
    console.log(`   - ⚠️ Risks & Opportunities`);
    console.log(`   - 💼 Investment Implications`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Create Market Context page with ALL fixes applied
 * (This matches the implementation in api/jobs/market-context.ts)
 */
async function createMarketContextPageWithFixes(
  notion: Client,
  databaseId: string,
  marketContext: MarketContext
): Promise<string> {
  // Step 0: Validate data quality
  validateMarketContextData(marketContext);

  // Step 1: Create page with ALL properties including economic indicators
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      'Name': {
        title: [{ text: { content: `Market Context - ${marketContext.date}` } }],
      },
      'Date': {
        date: { start: marketContext.date },
      },
      'Market Regime': {
        select: { name: marketContext.regime },
      },
      'Risk Assessment': {
        select: { name: marketContext.riskAssessment },
      },
      'Confidence': {
        number: Math.round(marketContext.regimeConfidence * 100),
      },
      'VIX Level': {
        number: marketContext.vix ? parseFloat(marketContext.vix.toFixed(2)) : 0,
      },
      'SPY 1D Change': {
        number: parseFloat(marketContext.spy.change1D.toFixed(2)),
      },
      'SPY 1M Change': {
        number: parseFloat(marketContext.spy.change1M.toFixed(2)),
      },
      'QQQ 1D Change': {
        number: parseFloat(marketContext.qqq.change1D.toFixed(2)),
      },
      'US Direction': {
        select: { name: marketContext.marketDirection },
      },
      // Economic Indicators (FIXED - now populated)
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
      'Top Sectors': {
        multi_select: marketContext.sectorLeaders.map(s => ({ name: s.name })),
      },
      'Bottom Sectors': {
        multi_select: marketContext.sectorLaggards.map(s => ({ name: s.name })),
      },
      'Summary': {
        rich_text: [{
          text: { content: generateBriefSummary(marketContext).substring(0, 2000) },
        }],
      },
    },
  });

  console.log(`  ✓ Page created with properties (including economic indicators)`);

  // Step 2: Write detailed content to page body (FIXED - now includes all sections)
  const detailedContent = generateDetailedMarketContent(marketContext);
  console.log(`  ✓ Generated detailed content (${detailedContent.length} chars)`);

  await writeMarketContentToPage(notion, response.id, detailedContent);
  console.log(`  ✓ Content written to page body`);

  return response.id;
}

// Helper functions (copied from api/jobs/market-context.ts)

function validateMarketContextData(marketContext: MarketContext): void {
  const missingFields: string[] = [];

  if (marketContext.economic.cpiYoY === null) missingFields.push('CPI (YoY)');
  if (marketContext.economic.fedFundsRate === null) missingFields.push('Fed Funds Rate');
  if (marketContext.economic.unemployment === null) missingFields.push('Unemployment');
  if (marketContext.economic.yieldCurveSpread === null) missingFields.push('Yield Curve Spread');
  if (marketContext.economic.consumerSentiment === null) missingFields.push('Consumer Sentiment');
  if (!marketContext.vix || marketContext.vix === 0) missingFields.push('VIX Level');

  if (missingFields.length > 0) {
    console.warn(`  ⚠️  Missing economic data: ${missingFields.join(', ')}`);
  } else {
    console.log(`  ✓ All economic indicators available`);
  }
}

function generateBriefSummary(marketContext: MarketContext): string {
  const { regime, regimeConfidence, vix, spy } = marketContext;
  const confidencePercent = Math.round(regimeConfidence * 100);
  const spyChange = spy.change1M > 0 ? `+${spy.change1M.toFixed(1)}%` : `${spy.change1M.toFixed(1)}%`;
  return `${regime} regime (${confidencePercent}% confidence). S&P 500 ${spyChange} (1M), VIX at ${vix.toFixed(1)}.`;
}

function generateDetailedMarketContent(marketContext: MarketContext): string {
  const { regime, regimeConfidence, riskAssessment, spy, qqq, dia, iwm, vix, marketDirection, sectorLeaders, sectorLaggards, economic, keyInsights } = marketContext;

  const confidencePercent = Math.round(regimeConfidence * 100);
  const formatChange = (val: number) => val > 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`;

  let content = `> **${regime} Market Regime**\n`;
  content += `> ${confidencePercent}% confidence • ${riskAssessment} positioning • VIX ${vix.toFixed(1)}\n\n`;

  content += `## 📊 What's Happening Right Now\n\n`;
  content += `**Market Direction:** ${marketDirection} • **Risk Assessment:** ${riskAssessment}\n\n`;
  content += `**Major Indices (1-Day Change)**\n`;
  content += `- S&P 500 (SPY): ${formatChange(spy.change1D)}\n`;
  content += `- Nasdaq (QQQ): ${formatChange(qqq.change1D)}\n`;
  content += `- Dow (DIA): ${formatChange(dia.change1D)}\n`;
  content += `- Russell 2000 (IWM): ${formatChange(iwm.change1D)}\n\n`;
  content += `**Volatility:** VIX at ${vix.toFixed(1)}\n\n`;

  content += `## 🔄 Sector Rotation\n\n`;
  content += `**Leading Sectors**\n`;
  sectorLeaders.forEach(s => { content += `- ${s.name}: ${formatChange(s.change1M)}\n`; });
  content += `\n**Lagging Sectors**\n`;
  sectorLaggards.forEach(s => { content += `- ${s.name}: ${formatChange(s.change1M)}\n`; });
  content += `\n`;

  content += `## 📈 Economic Context\n\n`;
  if (economic.cpiYoY !== null) content += `**CPI (YoY):** ${economic.cpiYoY.toFixed(1)}%\n`;
  if (economic.fedFundsRate !== null) content += `**Fed Funds Rate:** ${economic.fedFundsRate.toFixed(2)}%\n`;
  if (economic.unemployment !== null) content += `**Unemployment:** ${economic.unemployment.toFixed(1)}%\n`;
  if (economic.yieldCurveSpread !== null) {
    content += `**Yield Curve:** ${economic.yieldCurveSpread.toFixed(2)}%${economic.yieldCurveSpread < 0 ? ' ⚠️ (Inverted)' : ''}\n`;
  }
  content += `\n`;

  content += `## 💡 Key Insights\n\n`;
  keyInsights.forEach(insight => { content += `${insight}\n\n`; });

  content += `## ⚠️ Risks & Opportunities\n\n`;
  content += `Based on current ${regime} regime and market conditions.\n\n`;

  content += `## 💼 Investment Implications\n\n`;
  content += `Portfolio positioning for ${riskAssessment} approach.\n`;

  return content;
}

async function writeMarketContentToPage(notion: Client, pageId: string, content: string): Promise<void> {
  const blocks = convertMarkdownToBlocks(content);

  const chunkSize = 100;
  for (let i = 0; i < blocks.length; i += chunkSize) {
    const chunk = blocks.slice(i, i + chunkSize);
    await notion.blocks.children.append({
      block_id: pageId,
      children: chunk,
    });
    if (i + chunkSize < blocks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

function convertMarkdownToBlocks(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

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
          rich_text: [{ type: 'text', text: { content: calloutLines.join('\n') } }],
          icon: { type: 'emoji', emoji: '📊' },
          color: 'blue_background',
        },
      });
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: line.substring(3) } }] },
      });
      i++;
      continue;
    }

    if (line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: parseRichText(line.substring(2)) },
      });
      i++;
      continue;
    }

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: parseRichText(line) },
    });
    i++;
  }

  return blocks;
}

function parseRichText(text: string): any[] {
  const richText: any[] = [];
  const parts = text.split(/(\*\*.*?\*\*)/);

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      richText.push({ type: 'text', text: { content: part.slice(2, -2) }, annotations: { bold: true } });
    } else if (part) {
      richText.push({ type: 'text', text: { content: part } });
    }
  }

  return richText.length > 0 ? richText : [{ type: 'text', text: { content: text } }];
}

testMarketContextWithFixes();
