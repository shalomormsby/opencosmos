/**
 * Environment Variable Diagnostic
 *
 * Checks if all required environment variables are loaded correctly
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file first
dotenv.config();

// Also try .env.local if it exists
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('='.repeat(60));
console.log('Environment Variable Diagnostic');
console.log('='.repeat(60));
console.log();

// Check all required API keys
const requiredVars = [
  'FMP_API_KEY',
  'FRED_API_KEY',
  'GEMINI_API_KEY',
  'NOTION_BETA_USERS_DB_ID',
  'STOCK_ANALYSES_DB_ID',
  'STOCK_HISTORY_DB_ID',
  'ENCRYPTION_KEY',
  'LLM_PROVIDER',
  'LLM_MODEL_NAME',
];

let allPresent = true;

for (const varName of requiredVars) {
  const value = process.env[varName];
  const isPresent = !!value;
  const status = isPresent ? '✓' : '✗';
  const preview = isPresent ? `${value!.substring(0, 10)}...` : 'NOT SET';

  console.log(`${status} ${varName.padEnd(35)} ${preview}`);

  if (!isPresent) {
    allPresent = false;
  }
}

console.log();
console.log('='.repeat(60));

if (allPresent) {
  console.log('✅ All required environment variables are set');
  console.log();
  console.log('Gemini API Key Details:');
  console.log(`- Length: ${process.env.GEMINI_API_KEY?.length} characters`);
  console.log(`- First 10 chars: ${process.env.GEMINI_API_KEY?.substring(0, 10)}`);
  console.log(`- Provider: ${process.env.LLM_PROVIDER || 'gemini (default)'}`);
  console.log(`- Model: ${process.env.LLM_MODEL_NAME || 'gemini-2.0-flash-exp (default)'}`);
} else {
  console.log('❌ Some required environment variables are missing');
  console.log('Please check your .env file');
}

console.log('='.repeat(60));
