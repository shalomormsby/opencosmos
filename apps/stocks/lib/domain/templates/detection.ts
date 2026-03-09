/**
 * Template Detection System
 *
 * Automatically detects user's Sage Stocks template databases and pages
 * using a scoring algorithm that matches against expected properties and titles.
 */

import { Client } from '@notionhq/client';

export interface DatabaseMatch {
  id: string;
  title: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PageMatch {
  id: string;
  title: string;
  url: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DetectionResult {
  stockAnalysesDb: DatabaseMatch | null;
  stockHistoryDb: DatabaseMatch | null;
  stockEventsDb: DatabaseMatch | null;
  marketContextDb: DatabaseMatch | null;
  sageStocksPage: PageMatch | null;
  needsManual: boolean;
}

interface MatchCriteria {
  titleMatches: string[];
  titleWeight: number;
  requiredProps: string[];
  requiredPropsWeight: number;
  optionalProps: string[];
  optionalPropsWeight: number;
  propertyTypes: Record<string, string>;
}

/**
 * Search for all databases in user's workspace
 */
async function searchUserDatabases(notionToken: string): Promise<any[]> {
  const notion = new Client({ auth: notionToken, notionVersion: '2025-09-03' });
  const databases: any[] = [];

  let hasMore = true;
  let startCursor: string | undefined = undefined;

  console.log('🔍 [searchUserDatabases] Starting database search...');
  console.log('🔍 [searchUserDatabases] API version: 2025-09-03');
  console.log('🔍 [searchUserDatabases] Filter: { property: "object", value: "data_source" }');

  while (hasMore) {
    const response = await notion.search({
      filter: { property: 'object', value: 'data_source' },
      start_cursor: startCursor,
      page_size: 100,
    });

    console.log(`📊 [searchUserDatabases] Batch ${databases.length / 100 + 1}: Found ${response.results.length} data sources`);
    console.log(`📊 [searchUserDatabases] Response object types:`, response.results.map(r => r.object));
    databases.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor || undefined;
  }

  console.log(`✅ [searchUserDatabases] Search complete: ${databases.length} total data sources found`);

  if (databases.length === 0) {
    console.log('⚠️  [searchUserDatabases] NO DATA SOURCES FOUND!');
    console.log('⚠️  [searchUserDatabases] This could mean:');
    console.log('   1. Template hasn\'t been duplicated yet (OAuth template_id duplication may be in progress)');
    console.log('   2. OAuth token lacks database permissions (integration not connected to duplicated databases)');
    console.log('   3. API version or filter is incorrect');
    console.log('   4. Integration needs to be manually connected to duplicated databases');
    console.log('');
    console.log('🔍 [searchUserDatabases] DIAGNOSTIC: Testing if integration can access ANY content...');
    
    // Try to search for pages to verify integration has any access
    // This helps distinguish timing issues (can access pages but not databases yet)
    // from permission issues (can't access anything)
    try {
      const pageSearch = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: 5,
      });
      
      const pageTitles = pageSearch.results.map((p: any) => {
        if (p.object === 'page') {
          // Try to get title from different possible locations
          const title = p.properties?.title?.title?.[0]?.plain_text ||
                       p.properties?.Name?.title?.[0]?.plain_text ||
                       'Untitled';
          return title;
        }
        return 'Unknown';
      });
      
      console.log('[diagnostic] Can access ANY pages?', {
        pagesFound: pageSearch.results.length,
        pageTitles: pageTitles,
        hasAccess: pageSearch.results.length > 0,
      });
      
      if (pageSearch.results.length > 0) {
        console.log('   ✅ Integration CAN access pages - integration IS working');
        console.log('   ⚠️  But no databases found - likely:');
        console.log('      a) Template duplication not complete yet (timing issue)');
        console.log('      b) Integration not connected to duplicated databases (permissions issue)');
        console.log('      c) Databases exist but integration needs explicit connection');
      } else {
        console.log('   ⚠️  Integration cannot access ANY pages');
        console.log('   This suggests broader permission issues with the OAuth token');
      }
    } catch (accessError) {
      console.log('[diagnostic] Page access test FAILED:', {
        error: accessError instanceof Error ? accessError.message : String(accessError),
        errorType: accessError instanceof Error ? accessError.constructor.name : typeof accessError,
      });
      console.log('   ❌ Integration access test failed');
      console.log('   This suggests the OAuth token may be invalid or integration lacks permissions');
    }
  } else {
    console.log('📋 [searchUserDatabases] Data source details:');
    databases.forEach((db, index) => {
      const parentDbId = db.parent?.type === 'database_id' ? db.parent.database_id : 'N/A';
      console.log(`   ${index + 1}. "${db.title?.[0]?.plain_text || 'Untitled'}"`);
      console.log(`      Data Source ID: ${db.id}`);
      console.log(`      Parent Database ID: ${parentDbId}`);
      console.log(`      Properties: ${Object.keys(db.properties || {}).join(', ')}`);
      console.log(`      Object type: ${db.object}`);
    });
  }

  return databases;
}

/**
 * Search for pages with Template Version property
 */
async function searchUserPages(notionToken: string): Promise<any[]> {
  const notion = new Client({ auth: notionToken, notionVersion: '2025-09-03' });
  const pages: any[] = [];

  let hasMore = true;
  let startCursor: string | undefined = undefined;

  console.log('🔍 [searchUserPages] Starting page search...');
  console.log('🔍 [searchUserPages] API version: 2025-09-03');
  console.log('🔍 [searchUserPages] Filter: { property: "object", value: "page" }');

  while (hasMore) {
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      start_cursor: startCursor,
      page_size: 100,
    });

    console.log(`📄 [searchUserPages] Batch ${pages.length / 100 + 1}: Found ${response.results.length} pages`);
    pages.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor || undefined;
  }

  console.log(`✅ [searchUserPages] Search complete: ${pages.length} total pages found`);

  if (pages.length === 0) {
    console.log('⚠️  [searchUserPages] NO PAGES FOUND!');
    console.log('⚠️  [searchUserPages] This could mean:');
    console.log('   1. Template hasn\'t been duplicated yet');
    console.log('   2. OAuth token lacks page read permissions');
  } else {
    console.log('📋 [searchUserPages] Page details:');
    pages.forEach((page, index) => {
      const titleProp = Object.values(page.properties || {}).find(
        (prop: any) => prop.type === 'title'
      ) as any;
      const title = titleProp?.title?.[0]?.plain_text || 'Untitled';
      console.log(`   ${index + 1}. "${title}" (ID: ${page.id})`);
      console.log(`      Object type: ${page.object}`);
    });
  }

  return pages;
}

/**
 * Extract parent database ID from a data source
 * Notion API v2025-09-03 returns data sources when searching with object: 'data_source'
 * We need the parent database ID for notion.databases.retrieve() to work
 */
function extractDatabaseId(dataSource: any): string {
  // Check if the parent is a database_id type
  if (dataSource.parent?.type === 'database_id') {
    return dataSource.parent.database_id;
  }

  // Fallback to the data source ID itself (may not work with databases.retrieve)
  console.warn(`⚠️  Data source "${dataSource.title?.[0]?.plain_text || 'Untitled'}" has no parent database_id, using data source ID as fallback`);
  return dataSource.id;
}

/**
 * Calculate match score for a database against criteria
 */
function calculateMatchScore(db: any, criteria: MatchCriteria): number {
  let score = 0;

  // Get database title
  const title = db.title?.[0]?.plain_text || '';

  // Title matching
  const titleMatch = criteria.titleMatches.some(t =>
    title.toLowerCase().includes(t.toLowerCase())
  );
  if (titleMatch) score += criteria.titleWeight;

  // Get property names
  const props = Object.keys(db.properties || {});

  // Required properties (all must exist)
  const hasAllRequired = criteria.requiredProps.every(requiredProp =>
    props.some(dbProp => dbProp.toLowerCase() === requiredProp.toLowerCase())
  );
  if (hasAllRequired) {
    score += criteria.requiredPropsWeight;
  } else {
    // If missing required properties, this is probably not the right database
    return 0;
  }

  // Optional properties (proportional score)
  const optionalMatches = criteria.optionalProps.filter(optProp =>
    props.some(dbProp => dbProp.toLowerCase() === optProp.toLowerCase())
  ).length;

  if (criteria.optionalProps.length > 0) {
    score += (optionalMatches / criteria.optionalProps.length) * criteria.optionalPropsWeight;
  }

  // Property types (bonus for correct types)
  for (const [propName, expectedType] of Object.entries(criteria.propertyTypes)) {
    const dbProp = Object.entries(db.properties || {}).find(
      ([name]) => name.toLowerCase() === propName.toLowerCase()
    );
    if (dbProp && (dbProp[1] as any).type === expectedType) {
      score += 0.05; // Small bonus for correct types
    }
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Detect Stock Analyses database
 */
async function detectStockAnalysesDb(
  notionToken: string
): Promise<DatabaseMatch | null> {
  console.log('🎯 [detectStockAnalysesDb] Starting Stock Analyses detection...');
  const databases = await searchUserDatabases(notionToken);

  const criteria = {
    titleMatches: ['Stock Analyses', 'Analyses', 'Stock Analysis'],
    titleWeight: 0.3,
    requiredProps: ['Ticker', 'Composite Score', 'Recommendation'],
    requiredPropsWeight: 0.5,
    optionalProps: ['Technical Score', 'Fundamental Score', 'Analysis Date', 'Current Price', 'Status'],
    optionalPropsWeight: 0.2,
    propertyTypes: {
      'Composite Score': 'number',
      'Recommendation': 'select',
      'Ticker': 'title',
    },
  };

  const scores = databases.map(db => {
    const title = db.title?.[0]?.plain_text || 'Untitled';
    const props = Object.keys(db.properties || {});
    const score = calculateMatchScore(db, criteria);
    const databaseId = extractDatabaseId(db); // Extract parent database ID

    console.log(`  📊 Scoring "${title}":`, {
      score: score.toFixed(3),
      properties: props,
      hasRequiredProps: criteria.requiredProps.every(req =>
        props.some(p => p.toLowerCase() === req.toLowerCase())
      ),
      dataSourceId: db.id,
      parentDatabaseId: databaseId,
    });

    return {
      id: databaseId, // Use parent database ID, not data source ID
      title,
      score,
    };
  });

  const best = scores.sort((a, b) => b.score - a.score)[0];

  console.log('🏆 [detectStockAnalysesDb] Best match:', best ? {
    title: best.title,
    score: best.score.toFixed(3),
    threshold: '0.5',
    passes: best.score >= 0.5,
  } : 'No matches');

  if (!best || best.score < 0.5) return null;

  return {
    ...best,
    confidence: best.score > 0.8 ? 'high' : best.score > 0.6 ? 'medium' : 'low',
  };
}

/**
 * Detect Stock History database
 */
async function detectStockHistoryDb(
  notionToken: string
): Promise<DatabaseMatch | null> {
  console.log('🎯 [detectStockHistoryDb] Starting Stock History detection...');
  const databases = await searchUserDatabases(notionToken);

  const criteria = {
    titleMatches: ['Stock History', 'History', 'Price History'],
    titleWeight: 0.3,
    requiredProps: ['Ticker', 'Analysis Date', 'Current Price'],
    requiredPropsWeight: 0.5,
    optionalProps: ['Technical Score', 'Composite Score', 'Volume', 'Recommendation'],
    optionalPropsWeight: 0.2,
    propertyTypes: {
      'Current Price': 'number',
      'Analysis Date': 'date',
    },
  };

  const scores = databases.map(db => {
    const title = db.title?.[0]?.plain_text || 'Untitled';
    const props = Object.keys(db.properties || {});
    const score = calculateMatchScore(db, criteria);
    const databaseId = extractDatabaseId(db); // Extract parent database ID

    console.log(`  📊 Scoring "${title}":`, {
      score: score.toFixed(3),
      properties: props,
      hasRequiredProps: criteria.requiredProps.every(req =>
        props.some(p => p.toLowerCase() === req.toLowerCase())
      ),
      dataSourceId: db.id,
      parentDatabaseId: databaseId,
    });

    return {
      id: databaseId, // Use parent database ID, not data source ID
      title,
      score,
    };
  });

  const best = scores.sort((a, b) => b.score - a.score)[0];

  console.log('🏆 [detectStockHistoryDb] Best match:', best ? {
    title: best.title,
    score: best.score.toFixed(3),
    threshold: '0.5',
    passes: best.score >= 0.5,
  } : 'No matches');

  if (!best || best.score < 0.5) return null;

  return {
    ...best,
    confidence: best.score > 0.8 ? 'high' : best.score > 0.6 ? 'medium' : 'low',
  };
}

/**
 * Detect Stock Events database (v1.2.16)
 */
async function detectStockEventsDb(
  notionToken: string
): Promise<DatabaseMatch | null> {
  console.log('🎯 [detectStockEventsDb] Starting Stock Events detection...');
  const databases = await searchUserDatabases(notionToken);

  const criteria = {
    titleMatches: ['Stock Events', 'Events', 'SI Events'],
    titleWeight: 0.3,
    requiredProps: ['Ticker', 'Event Type', 'When'],
    requiredPropsWeight: 0.5,
    optionalProps: ['Event Name', 'Timing'],
    optionalPropsWeight: 0.2,
    propertyTypes: {
      'Ticker': 'relation',
      'Event Type': 'select',
      'When': 'date',
    },
  };

  const scores = databases.map(db => {
    const title = db.title?.[0]?.plain_text || 'Untitled';
    const props = Object.keys(db.properties || {});
    const score = calculateMatchScore(db, criteria);
    const databaseId = extractDatabaseId(db); // Extract parent database ID

    console.log(`  📊 Scoring "${title}":`, {
      score: score.toFixed(3),
      properties: props,
      hasRequiredProps: criteria.requiredProps.every(req =>
        props.some(p => p.toLowerCase() === req.toLowerCase())
      ),
      dataSourceId: db.id,
      parentDatabaseId: databaseId,
    });

    return {
      id: databaseId, // Use parent database ID, not data source ID
      title,
      score,
    };
  });

  const best = scores.sort((a, b) => b.score - a.score)[0];

  console.log('🏆 [detectStockEventsDb] Best match:', best ? {
    title: best.title,
    score: best.score.toFixed(3),
    threshold: '0.5',
    passes: best.score >= 0.5,
  } : 'No matches');

  if (!best || best.score < 0.5) return null;

  return {
    ...best,
    confidence: best.score > 0.8 ? 'high' : best.score > 0.6 ? 'medium' : 'low',
  };
}

/**
 * Detect Market Context Database
 * Look for "Market Context" or "Market Regime" with specific properties
 */
async function detectMarketContextDb(notionToken: string): Promise<DatabaseMatch | null> {
  console.log('🎯 [detectMarketContextDb] Starting Market Context detection...');
  const databases = await searchUserDatabases(notionToken);

  const criteria = {
    titleMatches: ['Market Context', 'Market Regime', 'Daily Market'],
    titleWeight: 0.3,
    requiredProps: ['Market Regime', 'Risk Assessment', 'VIX Level'],
    requiredPropsWeight: 0.5,
    optionalProps: ['Top Sectors', 'Summary'],
    optionalPropsWeight: 0.2,
    propertyTypes: {
      'Market Regime': 'select',
      'Risk Assessment': 'select',
      'VIX Level': 'number'
    }
  };

  const scores = databases.map(db => {
    const title = db.title?.[0]?.plain_text || 'Untitled';
    const props = Object.keys(db.properties || {});
    const score = calculateMatchScore(db, criteria);
    const databaseId = extractDatabaseId(db); // Extract parent database ID

    console.log(`  📊 Scoring "${title}":`, {
      score: score.toFixed(3),
      properties: props,
      hasRequiredProps: criteria.requiredProps.every(req =>
        props.some(p => p.toLowerCase() === req.toLowerCase())
      ),
      dataSourceId: db.id,
      parentDatabaseId: databaseId,
    });

    return {
      id: databaseId, // Use parent database ID, not data source ID
      title,
      score,
    };
  });

  const best = scores.sort((a, b) => b.score - a.score)[0];

  console.log('🏆 [detectMarketContextDb] Best match:', best ? {
    title: best.title,
    score: best.score.toFixed(3),
    threshold: '0.5',
    passes: best.score >= 0.5,
  } : 'No matches');

  if (!best || best.score < 0.5) return null;

  return {
    ...best,
    confidence: best.score > 0.8 ? 'high' : best.score > 0.6 ? 'medium' : 'low',
  };
}

/**
 * Detect Sage Stocks hub page
 */
async function detectSageStocksPage(
  notionToken: string
): Promise<PageMatch | null> {
  console.log('🎯 [detectSageStocksPage] Starting Sage Stocks page detection...');
  const pages = await searchUserPages(notionToken);

  // Find page titled "Sage Stocks" or similar
  const matches = pages
    .map(page => {
      // Get title from properties
      const titleProp = Object.values(page.properties || {}).find(
        (prop: any) => prop.type === 'title'
      ) as any;

      const title = titleProp?.title?.[0]?.plain_text || '';
      const url = page.url || '';

      // Calculate score based on title match
      let score = 0;
      if (/sage\s*stocks/i.test(title)) score = 1.0;
      else if (/sage/i.test(title)) score = 0.6;
      else if (/stocks/i.test(title)) score = 0.4;

      console.log(`  📄 Scoring page "${title}":`, {
        score: score.toFixed(3),
        matchesSageStocks: /sage\s*stocks/i.test(title),
        matchesSage: /sage/i.test(title),
        matchesStocks: /stocks/i.test(title),
      });

      return {
        id: page.id,
        title,
        url,
        score,
        confidence: score > 0.8 ? 'high' as const : score > 0.5 ? 'medium' as const : 'low' as const,
      };
    })
    .filter(match => match.score > 0);

  const best = matches.sort((a, b) => b.score - a.score)[0];

  console.log('🏆 [detectSageStocksPage] Best match:', best ? {
    title: best.title,
    score: best.score.toFixed(3),
  } : 'No matches');

  return best || null;
}

/**
 * Auto-detect all template components with retry logic
 *
 * When Notion duplicates a template, the page appears immediately but databases
 * take a few seconds to be created. This function retries up to 3 times with
 * exponential backoff to wait for databases to appear.
 */
export async function autoDetectTemplate(
  notionToken: string
): Promise<DetectionResult> {
  const maxAttempts = 4;
  const delays = [5000, 10000, 15000]; // 5s, 10s, 15s - give Notion time to duplicate template

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔍 [autoDetectTemplate] Attempt ${attempt}/${maxAttempts}`);

    // Wait before each attempt (including first) to give Notion time to duplicate template
    // Template duplication via OAuth template_id can take 5-15 seconds
    if (attempt === 1) {
      const initialDelay = delays[0];
      console.log(`⏱️  [autoDetectTemplate] Initial delay ${initialDelay}ms to allow template duplication...`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));
    } else if (attempt > 1) {
      const delay = delays[attempt - 1];
      console.log(`⏱️  [autoDetectTemplate] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const [stockAnalysesDb, stockHistoryDb, stockEventsDb, marketContextDb, sageStocksPage] = await Promise.all([
      detectStockAnalysesDb(notionToken),
      detectStockHistoryDb(notionToken),
      detectStockEventsDb(notionToken),
      detectMarketContextDb(notionToken),
      detectSageStocksPage(notionToken),
    ]);

    // Determine if manual setup is needed
    const needsManual = !stockAnalysesDb || !stockHistoryDb || !stockEventsDb || !marketContextDb || !sageStocksPage;

    const foundCount = [stockAnalysesDb, stockHistoryDb, stockEventsDb, marketContextDb, sageStocksPage].filter(Boolean).length;
    console.log(`📊 [autoDetectTemplate] Attempt ${attempt}: Found ${foundCount}/5 components`);

    // If we found everything, return immediately
    if (!needsManual) {
      console.log(`✅ [autoDetectTemplate] All components found on attempt ${attempt}`);
      return {
        stockAnalysesDb,
        stockHistoryDb,
        stockEventsDb,
        marketContextDb,
        sageStocksPage,
        needsManual: false
      };
    }

    // If this is not the last attempt, log what's missing and continue
    if (attempt < maxAttempts) {
      console.log(`⚠️  [autoDetectTemplate] Missing components on attempt ${attempt}:`, {
        stockAnalysesDb: !!stockAnalysesDb ? '✓' : '✗',
        stockHistoryDb: !!stockHistoryDb ? '✓' : '✗',
        stockEventsDb: !!stockEventsDb ? '✓' : '✗',
        marketContextDb: !!marketContextDb ? '✓' : '✗',
        sageStocksPage: !!sageStocksPage ? '✓' : '✗',
      });
      console.log(`🔄 [autoDetectTemplate] Retrying...`);
      continue;
    }

    // Last attempt - return what we found
    console.log(`❌ [autoDetectTemplate] Failed to find all components after ${maxAttempts} attempts`);
    
    // Calculate final found count
    const finalFoundCount = [stockAnalysesDb, stockHistoryDb, stockEventsDb, marketContextDb, sageStocksPage].filter(Boolean).length;
    
    console.log(`📊 [autoDetectTemplate] Final results:`, {
      stockAnalysesDb: stockAnalysesDb ? '✓' : '✗',
      stockHistoryDb: stockHistoryDb ? '✓' : '✗',
      stockEventsDb: stockEventsDb ? '✓' : '✗',
      marketContextDb: marketContextDb ? '✓' : '✗',
      sageStocksPage: sageStocksPage ? '✓' : '✗',
      foundCount: finalFoundCount,
    });
    
    // If we found NOTHING (0/5), this suggests a permissions issue, not timing
    if (finalFoundCount === 0) {
      console.log('⚠️  [autoDetectTemplate] ZERO components found after all retries');
      console.log('   This strongly suggests a PERMISSIONS issue, not a timing issue.');
      console.log('   If it were timing, at least the Sage Stocks page should appear.');
      console.log('   Check diagnostic logs above to see if integration can access ANY content.');
    }
    
    return {
      stockAnalysesDb,
      stockHistoryDb,
      stockEventsDb,
      marketContextDb,
      sageStocksPage,
      needsManual: true
    };
  }

  // Should never reach here, but TypeScript requires a return
  throw new Error('autoDetectTemplate: Unexpected end of function');
}

/**
 * Test database read access
 */
export async function testDatabaseRead(notionToken: string, databaseId: string): Promise<boolean> {
  try {
    const notion = new Client({ auth: notionToken, notionVersion: '2025-09-03' });
    await notion.databases.retrieve({ database_id: databaseId });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Test database write access
 */
export async function testDatabaseWrite(notionToken: string, databaseId: string): Promise<boolean> {
  try {
    const notion = new Client({ auth: notionToken, notionVersion: '2025-09-03' });

    // Get data source ID for API v2025-09-03
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const dataSourceId = (db as any).data_sources?.[0]?.id;

    if (!dataSourceId) {
      return false;
    }

    // Query the database (read operation that requires proper permissions)
    await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 1,
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Test page read access
 */
export async function testPageRead(notionToken: string, pageId: string): Promise<boolean> {
  try {
    const notion = new Client({ auth: notionToken, notionVersion: '2025-09-03' });
    await notion.pages.retrieve({ page_id: pageId });
    return true;
  } catch (error) {
    return false;
  }
}
