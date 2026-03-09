/**
 * Test Script: Check Stock History Database Configuration
 *
 * Verifies if users have stockHistoryDbId configured in Beta Users database.
 * This is the suspected root cause of Stock History entries stopping.
 */

import { getAllUsers } from '../../lib/core/auth';

async function checkStockHistoryConfig() {
  console.log('='.repeat(60));
  console.log('Stock History Database Configuration Check');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Get all users
    const users = await getAllUsers();
    console.log(`Found ${users.length} users\n`);

    // Check each user's configuration
    let usersWithStockHistory = 0;
    let usersWithoutStockHistory = 0;
    const missingUsers: Array<{ email: string; id: string }> = [];

    for (const user of users) {
      const hasStockHistory = !!user.stockHistoryDbId;
      const hasStockAnalyses = !!user.stockAnalysesDbId;

      console.log(`User: ${user.email}`);
      console.log(`  Stock Analyses DB: ${hasStockAnalyses ? '✅ Configured' : '❌ Missing'}`);
      console.log(`  Stock History DB:  ${hasStockHistory ? '✅ Configured' : '❌ Missing'}`);

      if (user.stockHistoryDbId) {
        console.log(`    ID: ${user.stockHistoryDbId.substring(0, 8)}...`);
      }
      console.log('');

      if (hasStockHistory) {
        usersWithStockHistory++;
      } else {
        usersWithoutStockHistory++;
        missingUsers.push({ email: user.email, id: user.id });
      }
    }

    console.log('='.repeat(60));
    console.log('Summary:');
    console.log(`  Total Users: ${users.length}`);
    console.log(`  ✅ With Stock History DB: ${usersWithStockHistory}`);
    console.log(`  ❌ Without Stock History DB: ${usersWithoutStockHistory}`);
    console.log('='.repeat(60));

    if (usersWithoutStockHistory > 0) {
      console.log('');
      console.log('🔴 ROOT CAUSE IDENTIFIED:');
      console.log(`${usersWithoutStockHistory} user(s) missing stockHistoryDbId configuration`);
      console.log('');
      console.log('When orchestrator runs:');
      console.log('1. ✅ Collects stocks from users');
      console.log('2. ✅ Analyzes tickers successfully');
      console.log('3. ✅ Updates Stock Analyses pages');
      console.log('4. ❌ Fails to create Stock History (empty database ID)');
      console.log('5. ⚠️  Error caught and logged, but process continues');
      console.log('');
      console.log('Users without Stock History DB:');
      missingUsers.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
      });
    } else {
      console.log('');
      console.log('✅ All users have Stock History DB configured');
      console.log('The issue must be elsewhere.');
    }

  } catch (error) {
    console.error('Error checking configuration:', error);
    throw error;
  }
}

checkStockHistoryConfig()
  .then(() => {
    console.log('\n✅ Configuration check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Configuration check failed:', error);
    process.exit(1);
  });
