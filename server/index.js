require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const adminArticlesRoutes = require('./routes/admin/articles');
const adminMetaRoutes = require('./routes/admin/meta');
const adminNewsFetchRoutes = require('./routes/admin/newsFetch');
const adminSocialPostsRoutes = require('./routes/admin/socialPosts');
const publicArticlesRoutes = require('./routes/public/articles');
const { authenticateToken, requireSuperAdmin } = require('./middleware/auth');
const { articleProcessingWorker } = require('./workers/articleProcessingWorker');
const { scheduleDailyNewsFetch } = require('./jobs/dailyNewsFetch');

const app = express();
const prisma = new PrismaClient();

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

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const noop = (req, res, next) => next();
app.use('/api/auth', isProduction ? authLimiter : noop, authRoutes);
app.use('/api/admin', authenticateToken, requireSuperAdmin);
app.use('/api/admin/articles', adminArticlesRoutes);
app.use('/api/admin/meta', adminMetaRoutes);
app.use('/api/admin/news', adminNewsFetchRoutes);
app.use('/api/admin/social-posts', adminSocialPostsRoutes);
app.use('/api/public/articles', publicArticlesRoutes);

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

scheduleDailyNewsFetch();

const PORT = process.env.PORT || 3001;

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await articleProcessingWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await articleProcessingWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3004'}`);
  console.log('BullMQ workers initialized');
  console.log('  - Article processing worker: processing queue "article-processing"');
});
