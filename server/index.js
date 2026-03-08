require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

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
const publicArticlesRoutes = require('./routes/public/articles');
const publicCategoriesRoutes = require('./routes/public/categories');
const publicLocationsRoutes = require('./routes/public/locations');
const publicMarketsRoutes = require('./routes/public/markets');
const calculatorRoutes = require('./routes/public/calculators');
const scenarioRoutes = require('./routes/public/scenarios');
const webhookNewsletterRoutes = require('./routes/webhooks/newsletter');
const { authenticateToken, requireSuperAdmin } = require('./middleware/auth');
const passport = require('./passport');
const { createCrawlerSsrMiddleware } = require('./middleware/crawlerSsr');
const sitemapRoutes = require('./routes/sitemap');
const feedRoutes = require('./routes/feed');
const { sourceFetchWorker } = require('./workers/sourceFetchWorker');
const { articleProcessWorker } = require('./workers/articleProcessWorker');
const { articleSummariseWorker } = require('./workers/articleSummariseWorker');
const { articleImageWorker } = require('./workers/articleImageWorker');
const { articleEmbedWorker } = require('./workers/articleEmbedWorker');
const { socialPublishWorker } = require('./workers/socialPublishWorker');
const { socialGenerateWorker } = require('./workers/socialGenerateWorker');

const { sourceFetchQueue } = require('./queues/sourceFetchQueue');
const { articleProcessQueue } = require('./queues/articleProcessQueue');
const { articleSummariseQueue } = require('./queues/articleSummariseQueue');
const { articleImageQueue } = require('./queues/articleImageQueue');
const { articleEmbedQueue } = require('./queues/articleEmbedQueue');
const { socialPublishQueue } = require('./queues/socialPublishQueue');
const { socialGenerateQueue } = require('./queues/socialGenerateQueue');

const { startScheduler } = require('./jobs/ingestionScheduler');
const { startSocialHealthCheck } = require('./jobs/socialHealthCheck');

const app = express();
const prisma = new PrismaClient();

const imgDir = path.join(__dirname, 'public/images/articles');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

app.use(helmet());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3004',
    'https://propertyhack.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004'
  ],
  credentials: true,
}));

const limiter = rateLimit({
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.use((req, res, next) => {
  req.prisma = prisma;
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

const calculatorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many calculation requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', isProduction ? authLimiter : noop, authRoutes);
app.use('/api/user', authenticateToken, profileRoutes);
app.use('/api/calculators', isProduction ? calculatorLimiter : noop, calculatorRoutes);
app.use('/api/admin', authenticateToken, requireSuperAdmin);
app.use('/api/admin/sources', adminSourcesRoutes);
app.use('/api/admin/articles', adminArticlesRoutes);
app.use('/api/admin/meta', adminMetaRoutes);
app.use('/api/admin/prompts', adminMetaRoutes);
app.use('/api/admin/social-posts', adminSocialPostsRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/seo', adminSeoRoutes);
app.use('/api/admin/social-config', adminSocialConfigRoutes);
app.use('/api/admin/social-accounts', adminSocialAccountsRoutes);
app.use('/api/scenarios', authenticateToken, scenarioRoutes);
// Spec-required public API paths
app.use('/api/articles', publicArticlesRoutes);
app.use('/api/categories', publicCategoriesRoutes);
app.use('/api/locations', publicLocationsRoutes);
app.use('/api/markets', publicMarketsRoutes);
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

// Crawler SSR middleware — serves dynamic meta tags to search engine bots
const indexHtmlPath = path.join(__dirname, '..', 'frontend-dist', 'index.html');
app.use(createCrawlerSsrMiddleware(indexHtmlPath));

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

const allWorkers = [
  sourceFetchWorker,
  articleProcessWorker,
  articleSummariseWorker,
  articleImageWorker,
  articleEmbedWorker,
  socialPublishWorker,
  socialGenerateWorker,
];

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  await Promise.all(allWorkers.map((w) => w.close()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
