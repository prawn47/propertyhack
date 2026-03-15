/**
 * PropertyHack API — Express Application
 *
 * Runs in two modes:
 * 1. Traditional server (local dev / VPS / Fly.io): app.listen() at the bottom
 * 2. CF Workers: imported by worker-entry.js, app is exported, no app.listen()
 *
 * Ref: Beads workspace-8i6
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
// swagger-ui-express uses __dirname which doesn't exist on CF Workers
const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined' || typeof __dirname === 'undefined';
let swaggerUi, YAML;
if (!isCloudflareWorker) {
  swaggerUi = require('swagger-ui-express');
  YAML = require('yamljs');
}
const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/user/profile');
const adminSourcesRoutes = require('./routes/admin/sources');
const adminArticlesRoutes = require('./routes/admin/articles');
const adminMetaRoutes = require('./routes/admin/meta');
const adminSocialPostsRoutes = require('./routes/admin/socialPosts');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminSeoRoutes = require('./routes/admin/seo');
const adminSocialConfigRoutes = require('./routes/admin/socialConfig');
const adminSocialAccountsRoutes = require('./routes/admin/socialAccounts');
const adminSubscribersRoutes = require('./routes/admin/subscribers');
const adminNewslettersRoutes = require('./routes/admin/newsletters');
const adminAiModelsRoutes = require('./routes/admin/aiModels');
const adminAgentKeysRoutes = require('./routes/admin/agentKeys');
const publicArticlesRoutes = require('./routes/public/articles');
const publicCategoriesRoutes = require('./routes/public/categories');
const publicLocationsRoutes = require('./routes/public/locations');
const publicMarketsRoutes = require('./routes/public/markets');
const calculatorRoutes = require('./routes/public/calculators');
const scenarioRoutes = require('./routes/public/scenarios');
const henryRoutes = require('./routes/henry');
const publicSubscribeRoutes = require('./routes/public/subscribe');
const webhookNewsletterRoutes = require('./routes/webhooks/newsletter');
const { authenticateToken, requireSuperAdmin } = require('./middleware/auth');
const { authenticateAgentKey, auditLog } = require('./middleware/agentAuth');
const passport = require('./passport');
const { createCrawlerSsrMiddleware } = require('./middleware/crawlerSsr');
const { legacyRedirects } = require('./middleware/legacyRedirects');
const sitemapRoutes = require('./routes/sitemap');
const feedRoutes = require('./routes/feed');
// Workers are only loaded in traditional Node.js environments, not CF Workers
let sourceFetchWorker, articleProcessWorker, articleSummariseWorker, articleImageWorker;
let articleEmbedWorker, socialPublishWorker, socialGenerateWorker, newsletterGenerateWorker;
let articleAuditWorker, altTextBackfillWorker;
if (!isCloudflareWorker) {
  sourceFetchWorker = require('./workers/sourceFetchWorker').sourceFetchWorker;
  articleProcessWorker = require('./workers/articleProcessWorker').articleProcessWorker;
  articleSummariseWorker = require('./workers/articleSummariseWorker').articleSummariseWorker;
  articleImageWorker = require('./workers/articleImageWorker').articleImageWorker;
  articleEmbedWorker = require('./workers/articleEmbedWorker').articleEmbedWorker;
  socialPublishWorker = require('./workers/socialPublishWorker').socialPublishWorker;
  socialGenerateWorker = require('./workers/socialGenerateWorker').socialGenerateWorker;
  newsletterGenerateWorker = require('./workers/newsletterGenerateWorker').newsletterGenerateWorker;
  articleAuditWorker = require('./workers/articleAuditWorker').articleAuditWorker;
  altTextBackfillWorker = require('./workers/altTextBackfillWorker').altTextBackfillWorker;
}
// Fallback objects for CF Workers environment
if (isCloudflareWorker) {
  const mockWorker = { gracefulShutdown: () => {}, close: async () => {} };
  sourceFetchWorker = mockWorker;
  articleProcessWorker = mockWorker;
  articleSummariseWorker = mockWorker;
  articleImageWorker = mockWorker;
  articleEmbedWorker = mockWorker;
  socialPublishWorker = mockWorker;
  socialGenerateWorker = mockWorker;
  newsletterGenerateWorker = mockWorker;
  articleAuditWorker = mockWorker;
  altTextBackfillWorker = mockWorker;
}

const { sourceFetchQueue } = require('./queues/sourceFetchQueue');
const { articleProcessQueue } = require('./queues/articleProcessQueue');
const { articleSummariseQueue } = require('./queues/articleSummariseQueue');
const { articleImageQueue } = require('./queues/articleImageQueue');
const { articleEmbedQueue } = require('./queues/articleEmbedQueue');
const { socialPublishQueue } = require('./queues/socialPublishQueue');
const { socialGenerateQueue } = require('./queues/socialGenerateQueue');
const { newsletterGenerateQueue } = require('./queues/newsletterGenerateQueue');

// Schedulers are only loaded in traditional Node.js environments
let startScheduler, startSocialHealthCheck, startHenryCleanup, startNewsletterScheduler;
if (!isCloudflareWorker) {
  startScheduler = require('./jobs/ingestionScheduler').startScheduler;
  startSocialHealthCheck = require('./jobs/socialHealthCheck').startSocialHealthCheck;
  startHenryCleanup = require('./jobs/henryCleanup').startHenryCleanup;
  startNewsletterScheduler = require('./jobs/newsletterScheduler').startNewsletterScheduler;
} else {
  // No-op functions for CF Workers (cron handles these instead)
  const noop = () => {};
  startScheduler = noop;
  startSocialHealthCheck = noop;
  startHenryCleanup = noop;
  startNewsletterScheduler = noop;
}

const app = express();

// Local filesystem image directory (not used on CF Workers — uses R2 instead)
if (!isCloudflareWorker) {
  const imgDir = path.join(__dirname, 'public/images/articles');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
}

app.use(helmet());
const corsOptions = {
  origin: [
    ...(process.env.CORS_ORIGIN || 'http://localhost:3004').split(','),
    'https://propertyhack.vercel.app',
    'https://propertyhack-web.pages.dev',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004'
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('/{*path}', cors(corsOptions));

// On CF Workers, in-memory rate limiting is useless (each request is an isolated execution).
// Rate limiting should be handled by CF's built-in rate limiting rules instead.
function createLimiter(opts) {
  if (isCloudflareWorker) return (req, res, next) => next();
  return rateLimit(opts);
}

const limiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  app.use(limiter);
}

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
if (isCloudflareWorker) {
  // On CF Workers, worker-entry.js pre-parses JSON and sets req.body + req.rawBody.
  // Express's init middleware changes the prototype chain which can lose own properties.
  // This middleware re-parses from rawBody AFTER Express init runs, guaranteeing req.body is set.
  app.use((req, res, next) => {
    if (req.rawBody) {
      const ct = (req.get && req.get('content-type')) || req.headers?.['content-type'] || '';
      if (ct.includes('application/json')) {
        try { req.body = JSON.parse(req.rawBody); } catch (e) { /* leave as-is */ }
      } else if (ct.includes('urlencoded')) {
        req.body = Object.fromEntries(new URLSearchParams(req.rawBody));
      } else {
        req.body = req.rawBody;
      }
    }
    if (!req.body) req.body = {};
    next();
  });
} else {
  // Raw body capture for Resend webhook signature verification (must be before general JSON parser)
  app.use('/api/webhooks/newsletter', express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
}
app.use(cookieParser());
app.use(passport.initialize());

// R2 image serving (CF Workers) — must be before express.static fallback
// On CF Workers, this route serves images from the R2 bucket.
// On local dev, this route falls through to express.static below.
const imageRoutes = require('./routes/images');
app.use(imageRoutes);

// Static file serving only on local dev (CF Workers uses R2 via imageRoutes)
if (!isCloudflareWorker) {
  app.use('/images', express.static(path.join(__dirname, 'public/images')));
}

app.use((req, res, next) => {
  if (isCloudflareWorker) {
    // Hyperdrive connections are request-scoped — must create fresh client per request
    const { createRequestClient } = require('./lib/prisma');
    req.prisma = createRequestClient();
  } else {
    req.prisma = prisma;
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



app.get('/system/queue-status', async (req, res) => {
  try {
    const [
      sourceFetchCounts,
      articleProcessCounts,
      articleSummariseCounts,
      articleImageCounts,
      articleEmbedCounts,
      socialPublishCounts,
      socialGenerateCounts,
    ] = await Promise.all([
      sourceFetchQueue.getJobCounts(),
      articleProcessQueue.getJobCounts(),
      articleSummariseQueue.getJobCounts(),
      articleImageQueue.getJobCounts(),
      articleEmbedQueue.getJobCounts(),
      socialPublishQueue.getJobCounts(),
      socialGenerateQueue.getJobCounts(),
    ]);

    res.json({
      queues: {
        'source-fetch': sourceFetchCounts,
        'article-process': articleProcessCounts,
        'article-summarise': articleSummariseCounts,
        'article-image': articleImageCounts,
        'article-embed': articleEmbedCounts,
        'social-publish': socialPublishCounts,
        'social-generate': socialGenerateCounts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue status', message: err.message });
  }
});

const noop = (req, res, next) => next();

const agentRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.headers['x-agent-key']?.substring(0, 12) || req.ip,
  message: { error: 'Agent API rate limit exceeded. Max 60 requests per minute.' },
});

const calculatorLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many calculation requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', isProduction ? authLimiter : noop, authRoutes);
app.use('/api/user', authenticateToken, profileRoutes);
app.use('/api/calculators', isProduction ? calculatorLimiter : noop, calculatorRoutes);
app.use('/api/admin', authenticateToken, requireSuperAdmin, (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});
app.use('/api/admin/sources', adminSourcesRoutes);
app.use('/api/admin/articles', adminArticlesRoutes);
app.use('/api/admin/meta', adminMetaRoutes);
app.use('/api/admin/prompts', adminMetaRoutes);
app.use('/api/admin/social-posts', adminSocialPostsRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/seo', adminSeoRoutes);
app.use('/api/admin/social-config', adminSocialConfigRoutes);
app.use('/api/admin/social-accounts', adminSocialAccountsRoutes);
app.use('/api/admin/subscribers', adminSubscribersRoutes);
app.use('/api/admin/newsletters', adminNewslettersRoutes);
app.use('/api/admin/ai-models', adminAiModelsRoutes);
app.use('/api/admin/agent-keys', adminAgentKeysRoutes);
app.use('/api/admin/agent-audit', require('./routes/admin/agentAudit'));
// Agent API gateway — auth + rate limit + audit + no-cache
app.use('/api/agent/v1', agentRateLimiter, authenticateAgentKey, auditLog, (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});
app.use('/api/agent/v1/newsletters', require('./routes/agent/v1/newsletters'));
app.use('/api/agent/v1/prompts', require('./routes/agent/v1/prompts'));
app.use('/api/agent/v1/config', require('./routes/agent/v1/config'));
app.use('/api/agent/v1/articles', require('./routes/agent/v1/articles'));
app.use('/api/agent/v1/audit-log', require('./routes/agent/v1/auditLog'));
app.use('/api/scenarios', authenticateToken, scenarioRoutes);
app.use('/api/henry', henryRoutes);
// Spec-required public API paths
app.use('/api/articles', publicArticlesRoutes);
app.use('/api/categories', publicCategoriesRoutes);
app.use('/api/locations', publicLocationsRoutes);
app.use('/api/markets', publicMarketsRoutes);
app.use('/api/subscribe', publicSubscribeRoutes);
// Legacy path kept for existing frontend compatibility
app.use('/api/public/articles', publicArticlesRoutes);
// Webhooks (no auth, validated by x-webhook-secret header)
app.use('/api/webhooks/newsletter', webhookNewsletterRoutes);

// Sitemaps & RSS (public, no auth)
app.use(sitemapRoutes);
app.use(feedRoutes);

// Public location SEO endpoint
app.get('/api/locations/:slug/seo', async (req, res) => {
  try {
    const data = await prisma.locationSeo.findUnique({
      where: { slug: req.params.slug },
      select: { metaTitle: true, metaDescription: true, h1Title: true, introContent: true, focusKeywords: true },
    });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Swagger UI for Agent API documentation (disabled on CF Workers — __dirname not available)
if (!isCloudflareWorker) {
  try {
    const agentApiSpec = YAML.load(path.join(__dirname, 'docs/agent-api.yaml'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(agentApiSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'PropertyHack Agent API Documentation',
    }));
    app.get('/api/docs/openapi.json', (req, res) => res.json(agentApiSpec));
  } catch (err) {
    console.warn('[swagger] Failed to load API docs:', err.message);
  }
}

// Legacy AU-only URL redirects — 301 to country-prefixed paths
app.use(legacyRedirects);

// Crawler SSR middleware — serves dynamic meta tags to search engine bots
// On CF Workers, frontend is served by CF Pages, not this Worker
if (!isCloudflareWorker) {
  const indexHtmlPath = path.join(__dirname, '..', 'frontend-dist', 'index.html');
  app.use(createCrawlerSsrMiddleware(indexHtmlPath));
}

app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details || err.message
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

startScheduler();
startSocialHealthCheck();
startHenryCleanup();
startNewsletterScheduler();

const allWorkers = [
  sourceFetchWorker,
  articleProcessWorker,
  articleSummariseWorker,
  articleImageWorker,
  articleEmbedWorker,
  socialPublishWorker,
  socialGenerateWorker,
  newsletterGenerateWorker,
  articleAuditWorker,
  altTextBackfillWorker,
];

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  await Promise.all(allWorkers.map((w) => w.close()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Export app for CF Workers entry point ───────────────────────────
// worker-entry.js imports this to bridge Express ↔ CF Workers fetch()
module.exports.app = app;

// ── Start server (local dev / VPS / Fly.io only) ───────────────────
// When running on CF Workers, worker-entry.js handles incoming requests.
// The app is only started via app.listen() in traditional environments.
const isCFWorkers = !!globalThis.__cf_env;

if (!isCFWorkers) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Queue status: http://localhost:${PORT}/system/queue-status`);
    console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3004'}`);
    console.log('BullMQ workers initialized');
    console.log('  - source-fetch worker (concurrency: 3)');
    console.log('  - article-process worker (concurrency: 5)');
    console.log('  - article-summarise worker (concurrency: 2)');
    console.log('  - article-image worker (concurrency: 1)');
    console.log('  - article-embed worker (concurrency: 3)');
    console.log('  - social-publish worker (concurrency: 1)');
    console.log('  - social-generate worker (concurrency: 1)');
  });
}
