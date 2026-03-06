#!/usr/bin/env node
/**
 * PropertyHack Load Test
 * Tests public API endpoints with configurable concurrency and duration.
 * No external dependencies — uses native fetch (Node 18+).
 *
 * Usage:
 *   node tests/load/loadTest.js [options]
 *   BASE_URL=https://api.propertyhack.com node tests/load/loadTest.js
 *
 * Options (env vars):
 *   BASE_URL     Target server (default: http://localhost:3001)
 *   DURATION_S   Test duration in seconds per phase (default: 15)
 *   ARTICLE_SLUG A known article slug for detail endpoint (optional — auto-fetched)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const PHASE_DURATION_MS = (parseInt(process.env.DURATION_S) || 15) * 1000;

// Performance targets from spec F4
const TARGETS = {
  '/api/articles':                    { p95: 2000, label: 'Homepage feed' },
  '/api/articles?search=property+sydney': { p95: 3000, label: 'Semantic search' },
  '/api/articles/:slug':              { p95: 1000, label: 'Article detail' },
  '/api/categories':                  { p95: 500,  label: 'Categories filter' },
  '/api/locations':                   { p95: 500,  label: 'Locations filter' },
};

// Concurrency ramp phases
const PHASES = [
  { concurrency: 10,  label: 'Warm-up  (10 users)' },
  { concurrency: 50,  label: 'Ramp     (50 users)' },
  { concurrency: 100, label: 'Peak    (100 users)' },
];

const results = {};

function initResult(key) {
  if (!results[key]) {
    results[key] = { times: [], errors: 0, requests: 0 };
  }
}

async function timedFetch(url) {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const elapsed = performance.now() - start;
    return { elapsed, status: res.status, ok: res.ok };
  } catch {
    const elapsed = performance.now() - start;
    return { elapsed, status: 0, ok: false };
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
}

async function runWorker(endpoints, durationMs, resultKey) {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    const url = endpoints[Math.floor(Math.random() * endpoints.length)];
    const key = resultKey || url.replace(BASE_URL, '');
    initResult(key);
    const { elapsed, ok } = await timedFetch(url);
    results[key].times.push(elapsed);
    results[key].requests++;
    if (!ok) results[key].errors++;
  }
}

async function runPhase(concurrency, durationMs, endpoints, resultKey) {
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(runWorker(endpoints, durationMs, resultKey));
  }
  await Promise.all(workers);
}

function printTable() {
  const colWidths = { endpoint: 40, label: 22, req: 8, rps: 8, p50: 8, p95: 8, p99: 8, err: 8 };
  const totalWidth = Object.values(colWidths).reduce((a, b) => a + b + 3, 0);

  const pad = (s, w) => String(s).padEnd(w);
  const padL = (s, w) => String(s).padStart(w);

  const header = [
    pad('Endpoint', colWidths.endpoint),
    pad('Label', colWidths.label),
    padL('Reqs', colWidths.req),
    padL('req/s', colWidths.rps),
    padL('p50ms', colWidths.p50),
    padL('p95ms', colWidths.p95),
    padL('p99ms', colWidths.p99),
    padL('Errors', colWidths.err),
  ].join(' | ');

  console.log('\n' + '='.repeat(totalWidth));
  console.log('  PropertyHack Load Test Results');
  console.log('='.repeat(totalWidth));
  console.log('  ' + header);
  console.log('  ' + '-'.repeat(totalWidth - 2));

  let allPassed = true;

  for (const [rawKey, data] of Object.entries(results)) {
    const sorted = [...data.times].sort((a, b) => a - b);
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const p99 = percentile(sorted, 99);
    const totalSecs = (PHASES.length * PHASE_DURATION_MS) / 1000;
    const rps = (data.requests / totalSecs).toFixed(1);

    const target = TARGETS[rawKey];
    const targetP95 = target?.p95 ?? null;
    const pass = targetP95 === null || p95 <= targetP95;
    if (!pass) allPassed = false;
    const status = targetP95 === null ? '    ' : (pass ? ' OK ' : 'FAIL');
    const label = target?.label || '';

    const row = [
      pad(rawKey.substring(0, colWidths.endpoint), colWidths.endpoint),
      pad(label, colWidths.label),
      padL(data.requests, colWidths.req),
      padL(rps, colWidths.rps),
      padL(p50, colWidths.p50),
      padL(p95, colWidths.p95),
      padL(p99, colWidths.p99),
      padL(data.errors, colWidths.err),
    ].join(' | ');

    console.log(`  [${status}] ${row}`);
  }

  console.log('='.repeat(totalWidth));

  if (allPassed) {
    console.log('  RESULT: All targets met.\n');
  } else {
    console.log('  RESULT: One or more targets FAILED — see FAIL rows above.\n');
    process.exitCode = 1;
  }
}

async function fetchFirstSlug() {
  try {
    const res = await fetch(`${BASE_URL}/api/articles?limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.articles?.[0]?.slug ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`\nPropertyHack Load Test`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Phase duration: ${PHASE_DURATION_MS / 1000}s per phase\n`);

  // Verify server is reachable
  try {
    await fetch(`${BASE_URL}/api/articles`);
  } catch {
    console.error(`ERROR: Cannot connect to ${BASE_URL}. Is the server running?\n`);
    process.exit(1);
  }

  // Discover a real slug for the article detail endpoint
  const slug = process.env.ARTICLE_SLUG || (await fetchFirstSlug());
  const detailUrl = slug
    ? `${BASE_URL}/api/articles/${slug}`
    : null;

  if (!slug) {
    console.warn('WARN: No published articles found — article detail endpoint will be skipped.\n');
  }

  // Build endpoint map: canonical key -> full URL
  const endpointMap = {
    '/api/articles':                        `${BASE_URL}/api/articles`,
    '/api/articles?search=property+sydney': `${BASE_URL}/api/articles?search=property+sydney`,
    '/api/categories':                      `${BASE_URL}/api/categories`,
    '/api/locations':                       `${BASE_URL}/api/locations`,
  };
  if (detailUrl) {
    endpointMap['/api/articles/:slug'] = detailUrl;
  }

  const keys = Object.keys(endpointMap);
  const urls = Object.values(endpointMap);

  // Map from URL back to canonical key for result bucketing
  const urlToKey = Object.fromEntries(urls.map((u, i) => [u, keys[i]]));

  // Initialize result buckets
  keys.forEach(initResult);

  for (const phase of PHASES) {
    console.log(`Phase: ${phase.label} — ${PHASE_DURATION_MS / 1000}s ...`);

    // Run all endpoints in parallel, each with `concurrency` workers
    const phaseWorkers = urls.map((url) => {
      const key = urlToKey[url];
      return runPhase(phase.concurrency, PHASE_DURATION_MS, [url], key);
    });

    await Promise.all(phaseWorkers);
    console.log(`  done. total requests so far: ${Object.values(results).reduce((s, r) => s + r.requests, 0)}`);
  }

  printTable();
}

main().catch((err) => {
  console.error('Load test error:', err);
  process.exit(1);
});
