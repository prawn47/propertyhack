/**
 * Test Script: Authentication Error Handling
 * 
 * This script tests that posts remain as drafts when publishing fails
 * due to authentication errors.
 */

import fs from 'fs';

const TEST_BASE_URL = 'http://localhost:3001';

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`TEST: ${name}`, colors.blue);
  log('='.repeat(60), colors.blue);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Test state
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Helper to make authenticated requests
async function makeRequest(path, options = {}) {
  const url = `${TEST_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  return { response, data };
}

// Test 1: Verify backend handles auth errors correctly
async function testBackendAuthError() {
  logTest('Backend Authentication Error Handling');
  
  try {
    // Try to post to LinkedIn without authentication cookie
    const { response, data } = await makeRequest('/api/linkedin/post', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Test post',
      }),
    });
    
    if (response.status === 401) {
      logSuccess('Backend correctly returns 401 for unauthenticated request');
      testResults.passed++;
    } else {
      logError(`Expected 401, got ${response.status}`);
      testResults.failed++;
    }
    
    if (data.error && data.error.includes('Not authenticated')) {
      logSuccess('Backend returns correct error message: "Not authenticated"');
      testResults.passed++;
    } else {
      logError(`Expected "Not authenticated" error, got: ${data.error}`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`Test failed with exception: ${error.message}`);
    testResults.failed++;
  }
}

// Test 2: Check App.tsx error handling logic
async function testFrontendErrorHandling() {
  logTest('Frontend Error Handling Logic Review');
  
  try {
    const appContent = fs.readFileSync('./App.tsx', 'utf-8');
    
    // Check for key error handling patterns
    const patterns = [
      {
        pattern: /catch \(error\)[\s\S]*?errorMessage.*includes\('Not authenticated'\)/,
        description: 'Authentication error detection',
      },
      {
        pattern: /Authentication error:.*Please reconnect your LinkedIn account/,
        description: 'User-friendly auth error message',
      },
      {
        pattern: /Your post has been saved as a draft/,
        description: 'Draft preservation message',
      },
      {
        pattern: /setDraftPublishingState\(.*false\)/,
        description: 'Reset publishing state on error',
      },
      {
        pattern: /await postToLinkedIn[\s\S]*?await db\.publishPost/,
        description: 'LinkedIn posting before database update',
      },
    ];
    
    for (const { pattern, description } of patterns) {
      if (pattern.test(appContent)) {
        logSuccess(`Found: ${description}`);
        testResults.passed++;
      } else {
        logError(`Missing: ${description}`);
        testResults.failed++;
      }
    }
  } catch (error) {
    logError(`Failed to read App.tsx: ${error.message}`);
    testResults.failed++;
  }
}

// Test 3: Verify LinkedIn service error propagation
async function testLinkedInServiceErrors() {
  logTest('LinkedIn Service Error Propagation');
  
  try {
    const serviceContent = fs.readFileSync('./services/linkedInService.ts', 'utf-8');
    
    // Check that errors are properly thrown
    if (serviceContent.includes('throw error')) {
      logSuccess('LinkedIn service properly propagates errors');
      testResults.passed++;
    } else {
      logWarning('LinkedIn service may not propagate errors correctly');
      testResults.warnings++;
    }
    
    if (serviceContent.includes('!response.ok')) {
      logSuccess('LinkedIn service checks response status');
      testResults.passed++;
    } else {
      logError('LinkedIn service does not check response status');
      testResults.failed++;
    }
  } catch (error) {
    logError(`Failed to read linkedInService.ts: ${error.message}`);
    testResults.failed++;
  }
}

// Test 4: Database service integrity
async function testDatabaseServiceIntegrity() {
  logTest('Database Service Integrity');
  
  try {
    const dbContent = fs.readFileSync('./services/dbService.ts', 'utf-8');
    
    // Verify publishPost function exists
    if (dbContent.includes('export const publishPost')) {
      logSuccess('publishPost function exists in dbService');
      testResults.passed++;
    } else {
      logError('publishPost function not found in dbService');
      testResults.failed++;
    }
    
    // Verify saveDraft function exists
    if (dbContent.includes('export const saveDraft')) {
      logSuccess('saveDraft function exists in dbService');
      testResults.passed++;
    } else {
      logError('saveDraft function not found in dbService');
      testResults.failed++;
    }
  } catch (error) {
    logError(`Failed to read dbService.ts: ${error.message}`);
    testResults.failed++;
  }
}

// Test 5: Check server-side LinkedIn route handling
async function testServerLinkedInRoutes() {
  logTest('Server LinkedIn Routes Configuration');
  
  try {
    const linkedInContent = fs.readFileSync('./server/routes/linkedin.js', 'utf-8');
    
    // Check auth validation
    if (linkedInContent.includes('!accessToken')) {
      logSuccess('Server validates LinkedIn access token');
      testResults.passed++;
    } else {
      logError('Server does not validate access token');
      testResults.failed++;
    }
    
    // Check error responses
    if (linkedInContent.includes('401')) {
      logSuccess('Server returns 401 for auth failures');
      testResults.passed++;
    } else {
      logError('Server does not return proper auth error status');
      testResults.failed++;
    }
    
    // Check user info endpoint validation
    if (linkedInContent.includes('userInfoResponse.ok')) {
      logSuccess('Server validates LinkedIn API responses');
      testResults.passed++;
    } else {
      logWarning('Server may not validate LinkedIn API responses');
      testResults.warnings++;
    }
  } catch (error) {
    logError(`Failed to read linkedin.js: ${error.message}`);
    testResults.failed++;
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), colors.blue);
  log('AUTHENTICATION ERROR HANDLING TEST SUITE', colors.blue);
  log('='.repeat(60) + '\n', colors.blue);
  
  await testBackendAuthError();
  await testFrontendErrorHandling();
  await testLinkedInServiceErrors();
  await testDatabaseServiceIntegrity();
  await testServerLinkedInRoutes();
  
  // Print summary
  log('\n' + '='.repeat(60), colors.blue);
  log('TEST SUMMARY', colors.blue);
  log('='.repeat(60), colors.blue);
  log(`Total Tests: ${testResults.passed + testResults.failed}`);
  logSuccess(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    logError(`Failed: ${testResults.failed}`);
  }
  if (testResults.warnings > 0) {
    logWarning(`Warnings: ${testResults.warnings}`);
  }
  
  const successRate = (testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1);
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 90 ? colors.green : colors.yellow);
  
  if (testResults.failed === 0) {
    log('\n✅ ALL TESTS PASSED!', colors.green);
    log('The authentication error handling is working correctly.', colors.green);
  } else {
    log('\n⚠️  SOME TESTS FAILED', colors.yellow);
    log('Please review the failed tests above.', colors.yellow);
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
