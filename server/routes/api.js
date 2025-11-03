const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { generateEnhancedPost, generatePostVariations, optimizePost, isAvailable } = require('../services/openaiService');
const stripeService = require('../services/stripeService');

const router = express.Router();

// Apply authentication to all API routes
router.use(authenticateToken);

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Validation rules
const userSettingsValidation = [
  body('toneOfVoice').notEmpty().withMessage('Tone of voice is required'),
  body('industry').notEmpty().withMessage('Industry is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('audience').notEmpty().withMessage('Audience is required'),
  body('postGoal').notEmpty().withMessage('Post goal is required'),
  body('keywords').notEmpty().withMessage('Keywords are required'),
  body('contentExamples').isArray().withMessage('Content examples must be an array'),
  body('timeZone').notEmpty().withMessage('Time zone is required'),
  body('preferredTime').notEmpty().withMessage('Preferred time is required'),
  body('englishVariant').isIn(['American', 'British', 'Australian']).withMessage('Invalid English variant'),
];

const draftPostValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('text').notEmpty().withMessage('Text is required'),
];

const scheduledPostValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('text').notEmpty().withMessage('Text is required'),
  body('scheduledFor').isISO8601().withMessage('Scheduled time must be a valid ISO date'),
];

// Get user settings
router.get('/user/settings', async (req, res) => {
  try {
    const settings = await req.prisma.userSettings.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        toneOfVoice: true,
        industry: true,
        position: true,
        audience: true,
        postGoal: true,
        keywords: true,
        contentExamples: true,
        timeZone: true,
        preferredTime: true,
        profilePictureUrl: true,
        englishVariant: true,
        newsCategories: true,
        newsLanguages: true,
        newsSources: true,
        newsCountries: true,
        updatedAt: true,
      }
    });

    if (!settings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    // Parse JSON strings back to arrays
    const settingsWithParsedExamples = {
      ...settings,
      contentExamples: JSON.parse(settings.contentExamples || '[]'),
      newsCategories: JSON.parse(settings.newsCategories || '[]'),
      newsLanguages: JSON.parse(settings.newsLanguages || '["eng"]'),
      newsSources: JSON.parse(settings.newsSources || '[]'),
      newsCountries: JSON.parse(settings.newsCountries || '[]'),
    };

    res.json(settingsWithParsedExamples);
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

// Update user settings
router.put('/user/settings', userSettingsValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      toneOfVoice,
      industry,
      position,
      audience,
      postGoal,
      keywords,
      contentExamples,
      timeZone,
      preferredTime,
      profilePictureUrl,
      englishVariant,
      newsCategories,
      newsLanguages,
      newsSources,
      newsCountries,
    } = req.body;

    const updatedSettings = await req.prisma.userSettings.update({
      where: { userId: req.user.id },
      data: {
        toneOfVoice,
        industry,
        position,
        audience,
        postGoal,
        keywords,
        contentExamples: JSON.stringify(contentExamples),
        timeZone,
        preferredTime,
        profilePictureUrl,
        englishVariant,
        newsCategories: JSON.stringify(newsCategories || []),
        newsLanguages: JSON.stringify(newsLanguages || ['eng']),
        newsSources: JSON.stringify(newsSources || []),
        newsCountries: JSON.stringify(newsCountries || []),
      },
      select: {
        id: true,
        toneOfVoice: true,
        industry: true,
        position: true,
        audience: true,
        postGoal: true,
        keywords: true,
        contentExamples: true,
        timeZone: true,
        preferredTime: true,
        profilePictureUrl: true,
        englishVariant: true,
        newsCategories: true,
        newsLanguages: true,
        newsSources: true,
        newsCountries: true,
        updatedAt: true,
      }
    });

    // Parse JSON strings back to arrays
    const settingsWithParsedExamples = {
      ...updatedSettings,
      contentExamples: JSON.parse(updatedSettings.contentExamples || '[]'),
      newsCategories: JSON.parse(updatedSettings.newsCategories || '[]'),
      newsLanguages: JSON.parse(updatedSettings.newsLanguages || '["eng"]'),
      newsSources: JSON.parse(updatedSettings.newsSources || '[]'),
      newsCountries: JSON.parse(updatedSettings.newsCountries || '[]'),
    };

    res.json(settingsWithParsedExamples);
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Get user's draft posts
router.get('/posts/drafts', async (req, res) => {
  try {
    const drafts = await req.prisma.draftPost.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        isPublishing: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json(drafts);
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: 'Failed to fetch draft posts' });
  }
});

// Create new draft post
router.post('/posts/drafts', draftPostValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, text, imageUrl } = req.body;

    const draft = await req.prisma.draftPost.create({
      data: {
        userId: req.user.id,
        title,
        text,
        imageUrl: imageUrl || null,
        isPublishing: false,
      },
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        isPublishing: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.status(201).json(draft);
  } catch (error) {
    console.error('Create draft error:', error);
    res.status(500).json({ error: 'Failed to create draft post' });
  }
});

// Update draft post
router.put('/posts/drafts/:id', draftPostValidation, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text, imageUrl, isPublishing } = req.body;

    // Check if draft belongs to user
    const existingDraft = await req.prisma.draftPost.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingDraft) {
      return res.status(404).json({ error: 'Draft post not found' });
    }

    const updatedDraft = await req.prisma.draftPost.update({
      where: { id },
      data: {
        title,
        text,
        imageUrl: imageUrl || null,
        isPublishing: isPublishing !== undefined ? isPublishing : existingDraft.isPublishing,
      },
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        isPublishing: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json(updatedDraft);
  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({ error: 'Failed to update draft post' });
  }
});

// Delete draft post
router.delete('/posts/drafts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if draft belongs to user
    const existingDraft = await req.prisma.draftPost.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingDraft) {
      return res.status(404).json({ error: 'Draft post not found' });
    }

    await req.prisma.draftPost.delete({
      where: { id }
    });

    res.json({ message: 'Draft post deleted successfully' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Failed to delete draft post' });
  }
});

// Get user's published posts
router.get('/posts/published', async (req, res) => {
  try {
    const published = await req.prisma.publishedPost.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        publishedAt: true,
        createdAt: true,
      }
    });

    res.json(published);
  } catch (error) {
    console.error('Get published posts error:', error);
    res.status(500).json({ error: 'Failed to fetch published posts' });
  }
});

// Publish a draft post (move from drafts to published)
router.post('/posts/publish', async (req, res) => {
  try {
    const { draftId, publishedAt } = req.body;

    if (!draftId) {
      return res.status(400).json({ error: 'Draft ID is required' });
    }

    // Check free tier limits
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        monthlyPostCount: true,
        lastPostCountReset: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has exceeded free tier limits
    if (stripeService.hasExceededFreeLimit(user)) {
      const remainingPosts = stripeService.getRemainingPosts(user);
      return res.status(403).json({
        error: 'Free tier limit exceeded',
        message: `You have reached your free tier limit of ${stripeService.FREE_TIER_LIMITS.monthlyPosts} posts per month. Upgrade to Pro for unlimited posts.`,
        remainingPosts,
        tier: user.subscriptionTier,
        upgradeUrl: '/subscription/checkout',
      });
    }

    // Check if draft belongs to user
    const draft = await req.prisma.draftPost.findFirst({
      where: { id: draftId, userId: req.user.id }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft post not found' });
    }

    // Use transaction to ensure atomicity
    const result = await req.prisma.$transaction(async (prisma) => {
      // Create published post
      const publishedPost = await prisma.publishedPost.create({
        data: {
          userId: req.user.id,
          title: draft.title,
          text: draft.text,
          imageUrl: draft.imageUrl,
          publishedAt: publishedAt || new Date().toLocaleString(),
        },
        select: {
          id: true,
          title: true,
          text: true,
          imageUrl: true,
          publishedAt: true,
          createdAt: true,
        }
      });

      // Delete draft post
      await prisma.draftPost.delete({
        where: { id: draftId }
      });

      // Increment post count for free tier users
      await stripeService.incrementPostCount(req.user.id, prisma);

      return publishedPost;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// Get user's scheduled posts
router.get('/posts/scheduled', async (req, res) => {
  try {
    const scheduled = await req.prisma.scheduledPost.findMany({
      where: { userId: req.user.id },
      orderBy: { scheduledFor: 'asc' },
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        scheduledFor: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    console.log('[api] GET /posts/scheduled found', scheduled.length, 'posts for user', req.user.id);
    scheduled.forEach(p => {
      console.log('  -', p.id, p.status, 'scheduled for', p.scheduledFor, 'now:', new Date());
    });

    res.json(scheduled);
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

// Create new scheduled post
router.post('/posts/scheduled', scheduledPostValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, text, imageUrl, scheduledFor } = req.body;

    // Validate that scheduled time is in the future
    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    console.log('[api] Creating scheduled post:', title, 'for', scheduledDate, 'user:', req.user.id);

    const scheduledPost = await req.prisma.scheduledPost.create({
      data: {
        userId: req.user.id,
        title,
        text,
        imageUrl: imageUrl || null,
        scheduledFor: scheduledDate,
        status: 'scheduled',
      },
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        scheduledFor: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    console.log('[api] Scheduled post created with ID:', scheduledPost.id);

    // Enforce 30-day max window for cookie-based posting reliability
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (scheduledDate > maxDate) {
      console.warn('[schedule] Scheduled date exceeds 30 days; worker may not have a valid token then');
    }

    res.status(201).json(scheduledPost);
  } catch (error) {
    console.error('Create scheduled post error:', error);
    res.status(500).json({ error: 'Failed to create scheduled post' });
  }
});

// Update scheduled post (reschedule)
router.patch('/posts/scheduled/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledFor, title, text, imageUrl } = req.body;

    // Check if scheduled post belongs to user
    const existingPost = await req.prisma.scheduledPost.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

  // Allow rescheduling for 'scheduled' or 'failed' or 'cancelled' (re-queues it)
  if (!['scheduled', 'failed', 'cancelled'].includes(existingPost.status)) {
    return res.status(400).json({ error: 'Can only update scheduled/failed/cancelled posts' });
  }

  const updateData = {};
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled time must be in the future' });
      }
    updateData.scheduledFor = scheduledDate;
    // Re-queue if previously failed/cancelled
    updateData.status = 'scheduled';
    }
    if (title !== undefined) updateData.title = title;
    if (text !== undefined) updateData.text = text;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const updatedPost = await req.prisma.scheduledPost.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        text: true,
        imageUrl: true,
        scheduledFor: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    res.json(updatedPost);
  } catch (error) {
    console.error('Update scheduled post error:', error);
    res.status(500).json({ error: 'Failed to update scheduled post' });
  }
});

// Cancel scheduled post
router.delete('/posts/scheduled/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if scheduled post belongs to user
    const existingPost = await req.prisma.scheduledPost.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }

    // Only allow cancellation of scheduled posts
    if (existingPost.status !== 'scheduled') {
      return res.status(400).json({ error: 'Can only cancel scheduled posts' });
    }

    // Within a transaction: mark cancelled and create a draft copy
    const result = await req.prisma.$transaction(async (tx) => {
      await tx.scheduledPost.update({
        where: { id },
        data: { status: 'cancelled' }
      });

      const draft = await tx.draftPost.create({
        data: {
          userId: req.user.id,
          title: existingPost.title,
          text: existingPost.text,
          imageUrl: existingPost.imageUrl || null,
          isPublishing: false,
        },
        select: {
          id: true,
          title: true,
          text: true,
          imageUrl: true,
          isPublishing: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      return draft;
    });

    res.status(200).json({ draft: result });
  } catch (error) {
    console.error('Cancel scheduled post error:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled post' });
  }
});

// Get user profile
router.get('/user/profile', async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        linkedinConnected: true,
        settings: {
          select: {
            profilePictureUrl: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user,
      profilePictureUrl: user.settings?.profilePictureUrl || null,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Enhanced content generation endpoints

// Generate enhanced post with OpenAI
router.post('/content/enhanced', async (req, res) => {
  try {
    if (!isAvailable()) {
      return res.status(503).json({ error: 'OpenAI service not available' });
    }

    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Get user settings
    const settings = await req.prisma.userSettings.findUnique({
      where: { userId: req.user.id }
    });

    if (!settings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    // Parse content examples
    const userSettings = {
      ...settings,
      contentExamples: JSON.parse(settings.contentExamples || '[]')
    };

    const enhancedPost = await generateEnhancedPost(topic, userSettings);
    res.json(enhancedPost);
  } catch (error) {
    console.error('Enhanced post generation error:', error);
    res.status(500).json({ error: 'Failed to generate enhanced post' });
  }
});

// Generate post variations
router.post('/content/variations', async (req, res) => {
  try {
    if (!isAvailable()) {
      return res.status(503).json({ error: 'OpenAI service not available' });
    }

    const { topic, count = 3 } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Get user settings
    const settings = await req.prisma.userSettings.findUnique({
      where: { userId: req.user.id }
    });

    if (!settings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    // Parse content examples
    const userSettings = {
      ...settings,
      contentExamples: JSON.parse(settings.contentExamples || '[]')
    };

    const variations = await generatePostVariations(topic, userSettings, Math.min(count, 5));
    res.json({ variations });
  } catch (error) {
    console.error('Post variations generation error:', error);
    res.status(500).json({ error: 'Failed to generate post variations' });
  }
});

// Optimize existing post
router.post('/content/optimize', async (req, res) => {
  try {
    if (!isAvailable()) {
      return res.status(503).json({ error: 'OpenAI service not available' });
    }

    const { title, text } = req.body;
    if (!title || !text) {
      return res.status(400).json({ error: 'Title and text are required' });
    }

    // Get user settings
    const settings = await req.prisma.userSettings.findUnique({
      where: { userId: req.user.id }
    });

    if (!settings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    // Parse content examples
    const userSettings = {
      ...settings,
      contentExamples: JSON.parse(settings.contentExamples || '[]')
    };

    const optimizedPost = await optimizePost({ title, text }, userSettings);
    res.json(optimizedPost);
  } catch (error) {
    console.error('Post optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize post' });
  }
});

// Check OpenAI availability
router.get('/content/openai-status', (req, res) => {
  res.json({ 
    available: isAvailable(),
    message: isAvailable() ? 'OpenAI service is available' : 'OpenAI API key not configured'
  });
});

// Get user's LinkedIn access token
router.get('/user/linkedin-token', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: {
        linkedinAccessToken: true,
        linkedinTokenExpiry: true,
        linkedinConnected: true,
      }
    });

    if (!user || !user.linkedinConnected || !user.linkedinAccessToken) {
      return res.status(404).json({ error: 'LinkedIn account not connected' });
    }

    // Check if token is expired
    if (user.linkedinTokenExpiry && new Date() > new Date(user.linkedinTokenExpiry)) {
      return res.status(401).json({ error: 'LinkedIn token expired. Please reconnect your account.' });
    }

    res.json({
      linkedinAccessToken: user.linkedinAccessToken,
      linkedinConnected: user.linkedinConnected,
    });

  } catch (error) {
    console.error('Get LinkedIn token error:', error);
    res.status(500).json({ error: 'Failed to get LinkedIn token' });
  }
});

// Persist LinkedIn cookie token to the authenticated user's DB record
router.post('/user/linkedin-sync', async (req, res) => {
  try {
    const accessToken = req.cookies && req.cookies.linkedin_access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'LinkedIn cookie token not found' });
    }

    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days to align with cookie

    const updated = await req.prisma.user.update({
      where: { id: req.user.id },
      data: {
        linkedinAccessToken: accessToken,
        linkedinTokenExpiry: expiry,
        linkedinConnected: true,
      },
      select: { id: true, linkedinConnected: true, linkedinTokenExpiry: true },
    });

    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('LinkedIn sync error:', error);
    res.status(500).json({ error: 'Failed to sync LinkedIn token' });
  }
});

// Disconnect LinkedIn account
router.post('/user/linkedin-disconnect', async (req, res) => {
  try {
    const userId = req.user.id;
    
    await req.prisma.user.update({
      where: { id: userId },
      data: {
        linkedinId: null,
        linkedinAccessToken: null,
        linkedinTokenExpiry: null,
        linkedinConnected: false,
      }
    });

    res.json({ success: true, message: 'LinkedIn account disconnected successfully' });

  } catch (error) {
    console.error('Disconnect LinkedIn error:', error);
    res.status(500).json({ error: 'Failed to disconnect LinkedIn account' });
  }
});

// Get user streak and weekly stats
router.get('/stats/streak', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all published posts for the user, ordered by creation date
    const publishedPosts = await req.prisma.publishedPost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
      }
    });

    if (publishedPosts.length === 0) {
      return res.json({
        currentStreak: 0,
        longestStreak: 0,
        weeklyProgress: 0,
        weeklyTarget: 7, // Default weekly target
        postsThisWeek: 0,
        lastPostDate: null,
      });
    }

    // Calculate streaks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate = null;

    // Group posts by date (ignoring time)
    const postsByDate = new Map();
    publishedPosts.forEach(post => {
      const dateKey = new Date(post.createdAt).toDateString();
      if (!postsByDate.has(dateKey)) {
        postsByDate.set(dateKey, true);
      }
    });

    const sortedDates = Array.from(postsByDate.keys())
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b - a); // Most recent first

    // Calculate current streak
    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (currentDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    tempStreak = 1;
    longestStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const previousDate = sortedDates[i - 1];
      
      const dayDiff = Math.floor((previousDate - currentDate) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    // Calculate weekly progress
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    const postsThisWeek = publishedPosts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate >= startOfWeek;
    }).length;

    const weeklyTarget = 7; // Could be made configurable per user
    const weeklyProgress = Math.min(100, Math.round((postsThisWeek / weeklyTarget) * 100));

    res.json({
      currentStreak,
      longestStreak,
      weeklyProgress,
      weeklyTarget,
      postsThisWeek,
      lastPostDate: publishedPosts[0]?.createdAt || null,
    });

  } catch (error) {
    console.error('Get streak stats error:', error);
    res.status(500).json({ error: 'Failed to fetch streak statistics' });
  }
});

module.exports = router;
