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
const newsRoutes = require('./routes/news');
const subscriptionRoutes = require('./routes/subscription');
const superAdminRoutes = require('./routes/superAdmin');
const { scheduledPostsQueue } = require('./queues/scheduledPostsQueue');
const { newsCurationQueue } = require('./queues/newsCurationQueue');
const { scheduledPostsWorker } = require('./workers/scheduledPostsWorker');
const { newsCurationWorker } = require('./workers/newsCurationWorker');
// ALL OAuth/Passport infrastructure COMPLETELY REMOVED

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3004',
    'https://www.quord.ai',
    'https://app.quord.ai',
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

// Routes
// In development, do not rate limit auth routes to prevent throttling during testing
const noop = (req, res, next) => next();
app.use('/api/auth', isProduction ? authLimiter : noop, authRoutes);
// app.use('/api/oauth', oauthRoutes); // DISABLED - using clean LinkedIn implementation
app.use('/api', linkedInRoutes); // Clean LinkedIn routes - exact copy from working app
app.use('/api/prompts', promptRoutes); // Super admin prompt management
app.use('/api/news', newsRoutes); // News curation routes
app.use('/api/subscription', subscriptionRoutes); // Stripe subscription management
app.use('/api/super-admin', superAdminRoutes); // Super admin system management
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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

/**
 * Check all users and queue news curation jobs for those at their 6 AM local time
 */
async function checkAndQueueNewsCuration() {
  try {
    const users = await prisma.user.findMany({
      where: { settings: { isNot: null } },
      include: { settings: true },
    });

    if (users.length === 0) return;

    const now = new Date();
    
    for (const user of users) {
      if (!user.settings) continue;

      const userTimezone = user.settings.timeZone || 'UTC';
      const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const userHour = userNow.getHours();
      
      // Check if it's 6 AM in user's timezone
      if (userHour !== 6) continue;

      console.log(`[news-scheduler] Queueing news curation for user ${user.id} at their 6 AM (${userTimezone})`);
      
      await newsCurationQueue.add('fetch-news',
        { userId: user.id },
        {
          jobId: `news-${user.id}-${now.toISOString().split('T')[0]}`,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    }
  } catch (error) {
    console.error('[news-scheduler] Error checking news curation:', error);
  }
}

let schedulerCheckInterval = null;
let newsCheckInterval = null;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (schedulerCheckInterval) clearInterval(schedulerCheckInterval);
  if (newsCheckInterval) clearInterval(newsCheckInterval);
  await scheduledPostsWorker.close();
  await newsCurationWorker.close();
  await scheduledPostsQueue.close();
  await newsCurationQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (schedulerCheckInterval) clearInterval(schedulerCheckInterval);
  if (newsCheckInterval) clearInterval(newsCheckInterval);
  await scheduledPostsWorker.close();
  await newsCurationWorker.close();
  await scheduledPostsQueue.close();
  await newsCurationQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3004'}`);
  console.log('📦 BullMQ workers initialized');
  console.log('   - Scheduled posts worker: processing queue "scheduled-posts"');
  console.log('   - News curation worker: processing queue "news-curation"');
  
  // Start checking for due posts every 60 seconds
  if (!schedulerCheckInterval) {
    schedulerCheckInterval = setInterval(checkAndQueueScheduledPosts, 60 * 1000);
    console.log('⏱️  Scheduled posts checker started (interval 60s)');
    // Check immediately on startup
    checkAndQueueScheduledPosts();
  }
  
  // Start checking for news curation every 10 minutes
  if (!newsCheckInterval) {
    newsCheckInterval = setInterval(checkAndQueueNewsCuration, 10 * 60 * 1000);
    console.log('📰 News curation checker started (interval 10m)');
    // Check after 5 seconds on startup
    setTimeout(checkAndQueueNewsCuration, 5000);
  }
});
