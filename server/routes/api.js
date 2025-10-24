const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { generateEnhancedPost, generatePostVariations, optimizePost, isAvailable } = require('../services/openaiService');

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
        updatedAt: true,
      }
    });

    if (!settings) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    // Parse contentExamples JSON string back to array
    const settingsWithParsedExamples = {
      ...settings,
      contentExamples: JSON.parse(settings.contentExamples || '[]')
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
        updatedAt: true,
      }
    });

    // Parse contentExamples JSON string back to array
    const settingsWithParsedExamples = {
      ...updatedSettings,
      contentExamples: JSON.parse(updatedSettings.contentExamples || '[]')
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

      return publishedPost;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({ error: 'Failed to publish post' });
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

module.exports = router;
