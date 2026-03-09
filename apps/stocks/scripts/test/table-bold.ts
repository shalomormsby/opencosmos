/**
 * Test Bold Formatting in Table Cells
 */

import { createNotionClient } from '../../lib/integrations/notion/client';

const tableWithBold = `
| Target | Price | Action | Rationale |
|--------|-------|--------|-----------|
| T1 | $180 | Trim **50%** | **Resistance** at 52-week high |
| T2 | $200 | Trim **30%** | **Bull case** target |
| T3 | $220 | Hold **20%** | **Long-term** upside |
`;

async function testBoldInTables() {
  console.log('🧪 Testing Bold Formatting in Tables\n');
  console.log('Sample Table with Bold:');
  console.log(tableWithBold);
  console.log('\n' + '='.repeat(60));

  try {
    const notionClient = createNotionClient({
      apiKey: 'dummy',
      stockAnalysesDbId: 'dummy',
      stockHistoryDbId: 'dummy',
    });

    const markdownToBlocks = (notionClient as any).markdownToBlocks.bind(notionClient);
    const blocks = markdownToBlocks(tableWithBold);

    const tableBlock = blocks.find((b: any) => b.type === 'table');

    if (!tableBlock) {
      console.error('\n❌ ERROR: No table block found!');
      process.exit(1);
    }

    console.log('\n✅ Testing bold formatting in cells:\n');

    // Check first data row (T1)
    const firstDataRow = tableBlock.table.children[1]; // Skip header
    const rationaleCell = firstDataRow.table_row.cells[3]; // Last column

    console.log('Rationale cell for T1:');
    rationaleCell.forEach((richText: any, i: number) => {
      console.log(`  Part ${i + 1}:`);
      console.log(`    Text: "${richText.text?.content}"`);
      console.log(`    Bold: ${richText.annotations?.bold || false}`);
    });

    // Verify bold formatting works
    const hasBoldText = rationaleCell.some((rt: any) => rt.annotations?.bold === true);
    const hasNormalText = rationaleCell.some((rt: any) => !rt.annotations?.bold);

    if (hasBoldText && hasNormalText) {
      console.log('\n✅ Bold formatting in table cells works correctly!');
    } else {
      console.error('\n❌ ERROR: Bold formatting not working correctly');
      console.error('Has bold text:', hasBoldText);
      console.error('Has normal text:', hasNormalText);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testBoldInTables();
