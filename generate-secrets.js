#!/usr/bin/env node

/**
 * Generate random secrets for production deployment
 * Run: node generate-secrets.js
 */

const crypto = require('crypto');

const generateSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

console.log('='.repeat(60));
console.log('Production Secrets for Render Deployment');
console.log('='.repeat(60));
console.log('\nCopy these to your Render environment variables:\n');

console.log('JWT_ACCESS_SECRET=' + generateSecret());
console.log('JWT_REFRESH_SECRET=' + generateSecret());

console.log('\n' + '='.repeat(60));
console.log('\n⚠️  Keep these secrets safe and never commit them to git!');
console.log('✅ Use different secrets for each environment (dev/staging/prod)\n');
