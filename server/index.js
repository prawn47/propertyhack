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
const { fetchCuratedNews } = require('./services/perplexityService');
// ALL OAuth/Passport infrastructure COMPLETELY REMOVED

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3004',
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

// Simple scheduled execution worker for due ScheduledPosts
async function postToLinkedInWithToken({ accessToken, text, imageUrl }) {
  // Get LinkedIn user id
  const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoResponse.ok) {
    throw new Error(`Failed to fetch LinkedIn user info: ${await userInfoResponse.text()}`);
  }
  const userInfo = await userInfoResponse.json();
  const linkedInUserId = userInfo.sub;

  let imageUrn = null;
  if (imageUrl) {
    // Register upload
    const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${linkedInUserId}`,
          serviceRelationships: [
            { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
          ],
        },
      }),
    });
    if (!registerResponse.ok) {
      throw new Error(`Failed to register image upload: ${await registerResponse.text()}`);
    }
    const registerData = await registerResponse.json();
    const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    imageUrn = registerData.value.asset;

    // Fetch image bytes and upload
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      throw new Error(`Failed to fetch image URL: ${await imgResp.text()}`);
    }
    const contentType = imgResp.headers.get('content-type') || 'image/png';
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: imgBuffer,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Image upload failed: ${await uploadResponse.text()}`);
    }
  }

  const postBody = {
    author: `urn:li:person:${linkedInUserId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: imageUrn ? 'IMAGE' : 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  if (imageUrn) {
    postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
      { status: 'READY', media: imageUrn },
    ];
  }

  const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });
  if (!postResponse.ok) {
    throw new Error(`LinkedIn post failed: ${await postResponse.text()}`);
  }
}

let scheduledWorkerInterval = null;
let newsWorkerInterval = null;
const userNewsLastFetch = new Map(); // Track last fetch time per user

/**
 * Fetch news for all active users at their 6 AM local time
 */
async function processNewsForUsers() {
  try {
    // Get all users with settings
    const users = await prisma.user.findMany({
      where: { settings: { isNot: null } },
      include: { settings: true },
    });

    if (users.length === 0) return;

    const now = new Date();
    
    for (const user of users) {
      try {
        if (!user.settings) continue;

        // Parse user's timezone (e.g., "America/New_York")
        const userTimezone = user.settings.timeZone || 'UTC';
        
        // Get current time in user's timezone
        const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        const userHour = userNow.getHours();
        
        // Check if it's 6 AM in user's timezone (within the current hour)
        if (userHour !== 6) continue;

        // Check if we already fetched news for this user today
        const lastFetch = userNewsLastFetch.get(user.id);
        if (lastFetch) {
          const hoursSinceLastFetch = (now - lastFetch) / (1000 * 60 * 60);
          if (hoursSinceLastFetch < 23) {
            // Already fetched within last 23 hours, skip
            continue;
          }
        }

        console.log(`[news-scheduler] Fetching news for user ${user.id} at their 6 AM (${userTimezone})`);

        // Fetch and save news articles
        const articles = await fetchCuratedNews(user.settings);
        
        if (articles.length > 0) {
          // Delete old articles (keep last 50)
          const existingCount = await prisma.newsArticle.count({ where: { userId: user.id } });
          if (existingCount > 50) {
            const toDelete = await prisma.newsArticle.findMany({
              where: { userId: user.id },
              orderBy: { fetchedAt: 'desc' },
              skip: 50,
              select: { id: true },
            });
            await prisma.newsArticle.deleteMany({
              where: { id: { in: toDelete.map(a => a.id) } },
            });
          }

          // Save new articles
          await Promise.all(
            articles.map(article =>
              prisma.newsArticle.create({
                data: {
                  userId: user.id,
                  title: article.title,
                  summary: article.summary,
                  content: article.content,
                  url: article.url,
                  source: article.source,
                  publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
                  category: article.category,
                  relevanceScore: article.relevanceScore,
                },
              })
            )
          );

          console.log(`[news-scheduler] Saved ${articles.length} articles for user ${user.id}`);
          userNewsLastFetch.set(user.id, now);
        }
      } catch (userErr) {
        console.error(`[news-scheduler] Failed to fetch news for user ${user.id}:`, userErr.message);
      }
    }
  } catch (error) {
    console.error('[news-scheduler] Unexpected error:', error);
  }
}

async function processDueScheduledPosts() {
  try {
    const now = new Date();
    const duePosts = await prisma.scheduledPost.findMany({
      where: { status: 'scheduled', scheduledFor: { lte: now } },
    });
    
    // Only log when there are due posts to avoid console spam
    if (duePosts.length === 0) return;
    
    console.log('[scheduler] Found', duePosts.length, 'due posts at', now.toISOString());
    duePosts.forEach(p => {
      console.log('  - Due post:', p.id, p.title, 'scheduled for', p.scheduledFor);
    });

    for (const post of duePosts) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: post.userId },
          select: {
            linkedinAccessToken: true,
            linkedinTokenExpiry: true,
            linkedinConnected: true,
          },
        });

        console.log('[scheduler] Processing post', post.id, 'for user', post.userId);
        console.log('[scheduler] User has token:', !!user?.linkedinAccessToken, 'connected:', user?.linkedinConnected);

        if (!user || !user.linkedinConnected || !user.linkedinAccessToken) {
          console.log('[scheduler] Skipping post', post.id, '- no valid user token');
          continue;
        }
        if (user.linkedinTokenExpiry && new Date() > new Date(user.linkedinTokenExpiry)) {
          console.log('[scheduler] Skipping post', post.id, '- token expired');
          continue;
        }

        console.log('[scheduler] Attempting to post to LinkedIn for post', post.id);
        try {
          await postToLinkedInWithToken({
            accessToken: user.linkedinAccessToken,
            text: post.text,
            imageUrl: post.imageUrl || undefined,
          });

          console.log('[scheduler] Successfully posted to LinkedIn, updating DB for post', post.id);
          await prisma.$transaction(async (tx) => {
            await tx.publishedPost.create({
              data: {
                userId: post.userId,
                title: post.title,
                text: post.text,
                imageUrl: post.imageUrl,
                publishedAt: new Date().toLocaleString(),
              },
            });
            await tx.scheduledPost.delete({
              where: { id: post.id },
            });
          });
          console.log('[scheduler] Post', post.id, 'published and removed from schedule');
        } catch (postErr) {
          console.error('[scheduler] LinkedIn post failed for', post.id, postErr.message);
          // leave as scheduled so user can reschedule; do not mark failed here
          continue;
        }
      } catch (err) {
        console.error('[scheduler] Failed to publish scheduled post', post.id, err.message);
        try {
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
        } catch (innerErr) {
          console.error('[scheduler] Failed to mark post as failed', post.id, innerErr.message);
        }
      }
    }
  } catch (error) {
    console.error('[scheduler] Unexpected error', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (scheduledWorkerInterval) clearInterval(scheduledWorkerInterval);
  if (newsWorkerInterval) clearInterval(newsWorkerInterval);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (scheduledWorkerInterval) clearInterval(scheduledWorkerInterval);
  if (newsWorkerInterval) clearInterval(newsWorkerInterval);
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3004'}`);
  
  if (!scheduledWorkerInterval) {
    scheduledWorkerInterval = setInterval(processDueScheduledPosts, 60 * 1000);
    console.log('⏱️  Scheduled posts worker started (interval 60s)');
  }
  
  if (!newsWorkerInterval) {
    // Check every 10 minutes for news to fetch
    newsWorkerInterval = setInterval(processNewsForUsers, 10 * 60 * 1000);
    console.log('📰 News curation worker started (interval 10m)');
    // Run once on startup after a short delay
    setTimeout(processNewsForUsers, 5000);
  }
});
