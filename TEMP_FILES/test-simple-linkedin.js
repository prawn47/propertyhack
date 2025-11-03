#!/usr/bin/env node

// Use built-in fetch (Node.js 18+) or fallback
const fetch = globalThis.fetch || (await import('node-fetch')).default;

// Test configuration
const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3004';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.blue}${colors.bold}🧪 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testServerHealth() {
  logTest('Server Health Check');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      logSuccess(`Server is running: ${data.status}`);
      return true;
    } else {
      logError(`Server health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Server is not running: ${error.message}`);
    return false;
  }
}

async function testLinkedInRoutes() {
  logTest('LinkedIn Routes Availability');
  
  const routes = [
    { path: '/api/linkedin/linkedin', method: 'GET', expectedStatus: 302, description: 'OAuth initiation' },
    { path: '/api/linkedin/status', method: 'GET', expectedStatus: 200, description: 'Auth status check' },
  ];

  let allPassed = true;

  for (const route of routes) {
    try {
      const response = await fetch(`${BASE_URL}${route.path}`, {
        method: route.method,
        redirect: 'manual' // Don't follow redirects
      });

      if (response.status === route.expectedStatus) {
        logSuccess(`${route.description}: ${route.method} ${route.path} → ${response.status}`);
      } else {
        logError(`${route.description}: Expected ${route.expectedStatus}, got ${response.status}`);
        allPassed = false;
      }
    } catch (error) {
      logError(`${route.description}: ${error.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function testEnvironmentVariables() {
  logTest('Environment Variables');
  
  // Check if the server can access LinkedIn credentials
  try {
    const response = await fetch(`${BASE_URL}/api/linkedin/linkedin`, {
      redirect: 'manual'
    });
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      if (location && location.includes('linkedin.com/oauth/v2/authorization')) {
        logSuccess('LinkedIn OAuth URL generated successfully');
        
        // Extract client ID from the URL
        const url = new URL(location);
        const clientId = url.searchParams.get('client_id');
        if (clientId) {
          logSuccess(`LinkedIn Client ID found: ${clientId}`);
        } else {
          logError('LinkedIn Client ID not found in OAuth URL');
          return false;
        }
        
        // Check redirect URI
        const redirectUri = url.searchParams.get('redirect_uri');
        if (redirectUri) {
          logSuccess(`Redirect URI: ${redirectUri}`);
        } else {
          logError('Redirect URI not found in OAuth URL');
          return false;
        }
        
        return true;
      } else {
        logError('Invalid OAuth URL generated');
        return false;
      }
    } else if (response.status === 500) {
      logError('LinkedIn client ID not configured');
      return false;
    } else {
      logError(`Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Environment test failed: ${error.message}`);
    return false;
  }
}

async function testAuthStatusUnauthenticated() {
  logTest('Auth Status (Unauthenticated)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/linkedin/status`);
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated === false) {
        logSuccess('Correctly returns unauthenticated status');
        return true;
      } else {
        logError(`Expected authenticated: false, got: ${data.authenticated}`);
        return false;
      }
    } else {
      logError(`Auth status check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Auth status test failed: ${error.message}`);
    return false;
  }
}

async function testPostWithoutAuth() {
  logTest('Post Without Authentication');
  
  try {
    const response = await fetch(`${BASE_URL}/api/linkedin/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Test post' })
    });
    
    if (response.status === 401) {
      const data = await response.json();
      if (data.error === 'Not authenticated') {
        logSuccess('Correctly rejects unauthenticated post requests');
        return true;
      } else {
        logError(`Expected "Not authenticated" error, got: ${data.error}`);
        return false;
      }
    } else {
      logError(`Expected 401 status, got: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Post without auth test failed: ${error.message}`);
    return false;
  }
}

async function testFrontendProxy() {
  logTest('Frontend Proxy Configuration');
  
  try {
    // Test if frontend can proxy to backend
    const response = await fetch(`${FRONTEND_URL}/api/linkedin/status`);
    if (response.ok) {
      const data = await response.json();
      logSuccess('Frontend proxy to backend is working');
      return true;
    } else {
      logWarning(`Frontend proxy might not be working: ${response.status}`);
      logInfo('This might be normal if Vite dev server is not running');
      return false;
    }
  } catch (error) {
    logWarning(`Frontend proxy test failed: ${error.message}`);
    logInfo('This is expected if frontend dev server is not running');
    return false;
  }
}

async function testCookieHandling() {
  logTest('Cookie Handling');
  
  try {
    const response = await fetch(`${BASE_URL}/api/linkedin/status`, {
      headers: {
        'Cookie': 'linkedin_access_token=fake_token'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated === false) {
        logSuccess('Correctly handles invalid LinkedIn tokens');
        return true;
      } else {
        logError('Should reject fake LinkedIn tokens');
        return false;
      }
    } else {
      logError(`Cookie test failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Cookie handling test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Simple LinkedIn Implementation Tests\n', 'bold');
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth, critical: true },
    { name: 'Environment Variables', fn: testEnvironmentVariables, critical: true },
    { name: 'LinkedIn Routes', fn: testLinkedInRoutes, critical: true },
    { name: 'Auth Status (Unauthenticated)', fn: testAuthStatusUnauthenticated, critical: true },
    { name: 'Post Without Auth', fn: testPostWithoutAuth, critical: true },
    { name: 'Cookie Handling', fn: testCookieHandling, critical: false },
    { name: 'Frontend Proxy', fn: testFrontendProxy, critical: false },
  ];

  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        if (test.critical) {
          criticalFailed++;
        }
      }
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      failed++;
      if (test.critical) {
        criticalFailed++;
      }
    }
  }

  // Summary
  log('\n📊 Test Results Summary', 'bold');
  log(`✅ Passed: ${passed}`);
  log(`❌ Failed: ${failed}`);
  
  if (criticalFailed === 0) {
    log('\n🎉 All critical tests passed! The LinkedIn implementation is ready for manual testing.', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('1. Open http://localhost:3004 in your browser');
    log('2. Add the SimpleLinkedInTest component to test the OAuth flow');
    log('3. Click "Connect LinkedIn" to test the OAuth flow');
    log('4. Try posting to LinkedIn after connecting');
  } else {
    log(`\n⚠️  ${criticalFailed} critical test(s) failed. Please fix these issues before manual testing.`, 'red');
    log('\n🔧 Common fixes:', 'yellow');
    log('- Make sure the server is running on port 3001');
    log('- Check that LinkedIn environment variables are set correctly');
    log('- Verify the simple-linkedin.js routes are loaded properly');
  }
}

// Run the tests
runAllTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
