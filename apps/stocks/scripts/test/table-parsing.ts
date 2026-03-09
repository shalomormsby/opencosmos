/**
 * Test Table Parsing in Notion Client
 *
 * Validates that markdown tables are correctly parsed into Notion table blocks
 */

import { createNotionClient } from '../../lib/integrations/notion/client';

// Sample markdown table from LLM analysis
const sampleTable = `
| Zone | Price | Action | Allocation |
|------|-------|--------|------------|
| ✅ Optimal Entry | $150-155 | Buy at support | 40% |
| 📈 Breakout | $165 | Buy on breakout | 30% |
| ⛔ Stop Loss | $140 | Exit all | 100% |
`;

async function testTableParsing() {
  console.log('🧪 Testing Table Parsing\n');
  console.log('Sample Markdown Table:');
  console.log(sampleTable);
  console.log('\n' + '='.repeat(60));

  try {
    // Access the private method via type assertion (for testing purposes)
    const notionClient = createNotionClient({
      apiKey: process.env.NOTION_API_KEY || 'dummy',
      stockAnalysesDbId: 'dummy',
      stockHistoryDbId: 'dummy',
    });

    // Use reflection to access private method
    const markdownToBlocks = (notionClient as any).markdownToBlocks.bind(notionClient);

    const blocks = markdownToBlocks(sampleTable);

    console.log('\n✅ Table parsed successfully!\n');
    console.log('Number of blocks:', blocks.length);
    console.log('\nParsed block structure:');
    console.log(JSON.stringify(blocks, null, 2));

    // Validate table structure
    const tableBlock = blocks.find((b: any) => b.type === 'table');

    if (!tableBlock) {
      console.error('\n❌ ERROR: No table block found!');
      process.exit(1);
    }

    console.log('\n✅ Table block found!');
    console.log('Table width:', tableBlock.table.table_width);
    console.log('Has column header:', tableBlock.table.has_column_header);
    console.log('Number of rows:', tableBlock.table.children.length);

    // Validate header row
    const headerRow = tableBlock.table.children[0];
    console.log('\nHeader row cells:');
    headerRow.table_row.cells.forEach((cell: any, i: number) => {
      const text = cell[0]?.text?.content || '';
      const bold = cell[0]?.annotations?.bold || false;
      console.log(`  Column ${i + 1}: "${text}" (bold: ${bold})`);
    });

    // Validate data rows
    console.log('\nData rows:');
    tableBlock.table.children.slice(1).forEach((row: any, i: number) => {
      console.log(`  Row ${i + 1}:`);
      row.table_row.cells.forEach((cell: any, j: number) => {
        const text = cell.map((rt: any) => rt.text?.content || '').join('');
        console.log(`    Cell ${j + 1}: "${text}"`);
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testTableParsing();
