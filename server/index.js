require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
// session removed - using simple cookie-based auth
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const linkedInRoutes = require('./routes/linkedin');
const promptRoutes = require('./routes/prompts');
const subscriptionRoutes = require('./routes/subscription');
const superAdminRoutes = require('./routes/superAdmin');
const cronRoutes = require('./routes/cron');
const adminArticlesRoutes = require('./routes/admin/articles');
const adminMetaRoutes = require('./routes/admin/meta');
const adminNewsFetchRoutes = require('./routes/admin/newsFetch');
const publicArticlesRoutes = require('./routes/public/articles');
const { scheduledPostsQueue } = require('./queues/scheduledPostsQueue');
const { scheduledPostsWorker } = require('./workers/scheduledPostsWorker');
const { articleProcessingWorker } = require('./workers/articleProcessingWorker');
const { scheduleDailyNewsFetch } = require('./jobs/dailyNewsFetch');
// ALL OAuth/Passport infrastructure COMPLETELY REMOVED

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3004',
    'https://www.propertyhack.com',
    'https://app.propertyhack.com',
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004'
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// In development, disable global rate limiting to avoid blocking OAuth redirects
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  app.use(limiter);
}

// Auth rate limiting (more restrictive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased to 100 for development testing
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ALL OAuth/Passport/Session middleware COMPLETELY REMOVED

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Make Prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check endpoint (before auth)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// BullMQ diagnostics endpoint (before auth)
app.get('/system/queue-status', async (req, res) => {
  try {
    const { connection } = require('./queues/connection');
    
    // Check Redis connection
    let redisStatus = 'unknown';
    try {
      await connection.ping();
      redisStatus = 'connected';
    } catch (err) {
      redisStatus = `error: ${err.message}`;
    }
    
    // Get queue job counts
    const [scheduledPostsWaiting, scheduledPostsActive, scheduledPostsFailed] = await Promise.all([
      scheduledPostsQueue.getWaitingCount(),
      scheduledPostsQueue.getActiveCount(),
      scheduledPostsQueue.getFailedCount(),
    ]).catch(() => [null, null, null]);
    
    
    // Check for due posts
    const now = new Date();
    const duePosts = await prisma.scheduledPost.findMany({
      where: { status: 'scheduled', scheduledFor: { lte: now } },
      select: { id: true, title: true, scheduledFor: true, status: true },
    });
    
    res.json({
      redis: {
        status: redisStatus,
        url: process.env.REDIS_URL ? 'configured' : 'not configured',
      },
      queues: {
        scheduledPosts: {
          waiting: scheduledPostsWaiting,
          active: scheduledPostsActive,
          failed: scheduledPostsFailed,
        },
      },
      scheduledPosts: {
        dueNow: duePosts.length,
        posts: duePosts,
      },
      workers: {
        scheduledPostsWorker: 'running',
        articleProcessingWorker: 'running',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Queue status check error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Routes
// In development, do not rate limit auth routes to prevent throttling during testing
const noop = (req, res, next) => next();
app.use('/api/auth', isProduction ? authLimiter : noop, authRoutes);
app.use('/api', linkedInRoutes); // LinkedIn OAuth (legacy PropertyHack)
app.use('/api/prompts', promptRoutes); // Super admin prompt management
app.use('/api/subscription', subscriptionRoutes); // Stripe subscription management
app.use('/api/super-admin', superAdminRoutes); // Super admin system management
app.use('/api/cron', cronRoutes); // Cron job endpoints for external schedulers
app.use('/api/admin/articles', adminArticlesRoutes); // Property Hack article management
app.use('/api/admin/meta', adminMetaRoutes); // Property Hack categories & sources
app.use('/api/admin/news', adminNewsFetchRoutes); // Property Hack news fetch
app.use('/api/public/articles', publicArticlesRoutes); // Public articles feed (no auth)
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details || err.message
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }
  
  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start daily news fetch cron job
scheduleDailyNewsFetch();

const PORT = process.env.PORT || 3001;

/**
 * Check for due scheduled posts and add them to the queue
 */
async function checkAndQueueScheduledPosts() {
  try {
    const now = new Date();
    const duePosts = await prisma.scheduledPost.findMany({
      where: { status: 'scheduled', scheduledFor: { lte: now } },
    });
    
    if (duePosts.length === 0) {
      console.log('[scheduler] No due posts found at', now.toISOString());
      return;
    }
    
    console.log(`[scheduler] Found ${duePosts.length} due posts - adding to BullMQ queue`);
    
    for (const post of duePosts) {
      await scheduledPostsQueue.add('publish-post', 
        { postId: post.id },
        { 
          jobId: `post-${post.id}`,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      console.log(`[scheduler] ✓ Queued post ${post.id} (${post.title}) for worker processing`);
    }
  } catch (error) {
    console.error('[scheduler] Error checking scheduled posts:', error);
  }
}


let schedulerCheckInterval = null;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (schedulerCheckInterval) clearInterval(schedulerCheckInterval);
  await scheduledPostsWorker.close();
  await articleProcessingWorker.close();
  await scheduledPostsQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (schedulerCheckInterval) clearInterval(schedulerCheckInterval);
  await scheduledPostsWorker.close();
  await articleProcessingWorker.close();
  await scheduledPostsQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3004'}`);
  console.log('📦 BullMQ workers initialized');
  console.log('   - Scheduled posts worker: processing queue "scheduled-posts"');
  console.log('   - Article processing worker: processing queue "article-processing"');
  
  // Start checking for due posts every 60 seconds
  if (!schedulerCheckInterval) {
    schedulerCheckInterval = setInterval(checkAndQueueScheduledPosts, 60 * 1000);
    console.log('⏱️  Scheduled posts checker started (interval 60s)');
    // Check immediately on startup
    checkAndQueueScheduledPosts();
  }
});
