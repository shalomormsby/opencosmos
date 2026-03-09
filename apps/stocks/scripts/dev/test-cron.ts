/**
 * Test script for scheduled-analyses cron endpoint
 *
 * Usage: ts-node scripts/test-cron.ts
 */

import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const CRON_SECRET = process.env.CRON_SECRET || 'test-secret-123';
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testCronEndpoint() {
  console.log('🧪 Testing scheduled-analyses cron endpoint...\n');

  try {
    // Test 1: Valid request
    console.log('Test 1: Valid authentication');
    const response1 = await axios.get(`${API_URL}/api/cron/scheduled-analyses`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });

    console.log('✅ Status:', response1.status);
    console.log('📊 Response:', JSON.stringify(response1.data, null, 2));
    console.log('\n');

    // Test 2: Invalid secret
    console.log('Test 2: Invalid authentication (should fail)');
    try {
      const response2 = await axios.get(`${API_URL}/api/cron/scheduled-analyses`, {
        headers: {
          'Authorization': 'Bearer wrong-secret'
        }
      });
      console.log('❌ Should have failed but got:', response2.status);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected with 401 Unauthorized');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testCronEndpoint();
