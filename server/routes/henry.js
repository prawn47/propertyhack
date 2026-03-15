const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const henryService = require('../services/henryService');

const router = express.Router();

// On CF Workers, in-memory rate limiting is useless (each request is isolated)
const isCloudflareWorker = typeof globalThis.__cf_env !== 'undefined';
function createLimiter(opts) {
  if (isCloudflareWorker) return (req, res, next) => next();
  return rateLimit(opts);
}

const anonChatLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.HENRY_RATE_LIMIT_ANON || '10'),
  message: { error: "You've sent a lot of messages recently. Please wait a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authChatLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.HENRY_RATE_LIMIT_AUTH || '60'),
  keyGenerator: (req) => req.user?.id || 'anon',
  message: { error: "You've sent a lot of messages recently. Please wait a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Optional auth — attaches req.user if token is valid, continues without it if not
const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, superAdmin: true, preferences: true, createdAt: true },
    });
    if (user) req.user = user;
  } catch (e) {
    // Invalid token — continue without user
  }
  next();
};

// Required auth — rejects if no valid token
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, superAdmin: true, preferences: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid access token' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Access token expired' });
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Shared validation helpers
const messageValidation = [
  body('message')
    .notEmpty().withMessage('Message is required')
    .isString()
    .isLength({ max: 2000 }).withMessage('Please keep your message under 2000 characters.')
    .customSanitizer((val) => val.replace(/<[^>]*>/g, '').trim()),
];

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
};

// SSE streaming helper
async function streamSse(req, res, genFn) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  let closed = false;
  req.on('close', () => { closed = true; });

  const timeout = setTimeout(() => {
    if (!closed) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Response timed out' })}\n\n`);
      res.end();
    }
  }, 60000);

  try {
    for await (const { event, data } of genFn()) {
      if (closed) break;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if (event === 'done' || event === 'error') break;
    }
  } catch (err) {
    console.error('[Henry] Stream error:', err);
    if (!closed) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: "I'm having trouble thinking right now. Please try again in a moment." })}\n\n`);
    }
  } finally {
    clearTimeout(timeout);
    if (!closed) res.end();
  }
}

// POST /api/henry/chat — anonymous one-off chat (SSE, no persistence)
router.post('/chat', anonChatLimiter, optionalAuth, messageValidation, async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;

  const { message } = req.body;

  await streamSse(req, res, () =>
    henryService.streamResponse({ message, user: req.user || null, prisma: req.prisma })
  );
});

// POST /api/henry/conversations — create new conversation
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const conversation = await req.prisma.conversation.create({
      data: {
        userId: req.user.id,
        title: 'New conversation',
      },
      select: { id: true, title: true, createdAt: true },
    });
    res.status(201).json(conversation);
  } catch (err) {
    console.error('[Henry] POST /conversations error:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/henry/conversations — list user's conversations
router.get(
  '/conversations',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      const [conversations, total] = await Promise.all([
        req.prisma.conversation.findMany({
          where: { userId: req.user.id },
          select: { id: true, title: true, createdAt: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        req.prisma.conversation.count({ where: { userId: req.user.id } }),
      ]);

      res.json({ conversations, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      console.error('[Henry] GET /conversations error:', err);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }
);

// GET /api/henry/conversations/:id — get conversation with messages
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conversation = await req.prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (err) {
    console.error('[Henry] GET /conversations/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// DELETE /api/henry/conversations/:id — delete conversation (cascade deletes messages)
router.delete('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conversation = await req.prisma.conversation.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await req.prisma.conversation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error('[Henry] DELETE /conversations/:id error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// POST /api/henry/conversations/:id/messages — send message, stream response
router.post(
  '/conversations/:id/messages',
  requireAuth,
  authChatLimiter,
  messageValidation,
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    const conversation = await req.prisma.conversation.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { message } = req.body;

    await streamSse(req, res, () =>
      henryService.streamResponse({ message, conversationId: req.params.id, user: req.user, prisma: req.prisma })
    );
  }
);

// PATCH /api/henry/messages/:id/rating — rate a message
router.patch(
  '/messages/:id/rating',
  requireAuth,
  [
    body('rating')
      .isIn([1, 5]).withMessage('Rating must be 1 or 5'),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const message = await req.prisma.message.findUnique({
        where: { id: req.params.id },
        include: { conversation: { select: { userId: true } } },
      });

      if (!message || message.conversation.userId !== req.user.id) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const updated = await req.prisma.message.update({
        where: { id: req.params.id },
        data: { rating: req.body.rating },
        select: { id: true, rating: true },
      });

      res.json(updated);
    } catch (err) {
      console.error('[Henry] PATCH /messages/:id/rating error:', err);
      res.status(500).json({ error: 'Failed to rate message' });
    }
  }
);

module.exports = router;
