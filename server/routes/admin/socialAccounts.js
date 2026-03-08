const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const { encrypt, decrypt } = require('../../utils/encryption');

const router = express.Router();
const prisma = new PrismaClient();

const VALID_PLATFORMS = ['facebook', 'twitter', 'instagram'];

// GET /api/admin/social-accounts — list all accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.socialAccount.findMany({
      orderBy: { platform: 'asc' },
    });

    // Don't send actual tokens to frontend — just connection status
    const sanitized = accounts.map(a => ({
      id: a.id,
      platform: a.platform,
      accountName: a.accountName,
      accountId: a.accountId,
      isConnected: a.isConnected,
      autoPublish: a.autoPublish,
      lastError: a.lastError,
      lastCheckedAt: a.lastCheckedAt,
      tokenExpiry: a.tokenExpiry,
      hasAccessToken: !!a.accessToken,
      hasRefreshToken: !!a.refreshToken,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    // Ensure all 3 platforms are represented
    for (const platform of VALID_PLATFORMS) {
      if (!sanitized.find(a => a.platform === platform)) {
        sanitized.push({
          platform,
          isConnected: false,
          autoPublish: true,
          hasAccessToken: false,
          hasRefreshToken: false,
        });
      }
    }

    sanitized.sort((a, b) => a.platform.localeCompare(b.platform));
    res.json(sanitized);
  } catch (err) {
    console.error('[social-accounts] GET error:', err);
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
});

// PUT /api/admin/social-accounts/:platform — update config (e.g. toggle autoPublish)
router.put('/:platform',
  param('platform').isIn(VALID_PLATFORMS),
  body('autoPublish').optional().isBoolean(),
  body('accountName').optional().isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { platform } = req.params;
      const updateData = {};
      if (req.body.autoPublish !== undefined) updateData.autoPublish = req.body.autoPublish;
      if (req.body.accountName !== undefined) updateData.accountName = req.body.accountName;

      const account = await prisma.socialAccount.upsert({
        where: { platform },
        update: updateData,
        create: { platform, ...updateData },
      });

      res.json({ platform: account.platform, autoPublish: account.autoPublish, accountName: account.accountName });
    } catch (err) {
      console.error('[social-accounts] PUT error:', err);
      res.status(500).json({ error: 'Failed to update social account' });
    }
  }
);

// POST /api/admin/social-accounts/:platform/connect — save credentials
router.post('/:platform/connect',
  param('platform').isIn(VALID_PLATFORMS),
  body('accessToken').isString().trim().notEmpty(),
  body('accessSecret').optional().isString().trim(),
  body('refreshToken').optional().isString().trim(),
  body('accountName').optional().isString().trim(),
  body('accountId').optional().isString().trim(),
  body('apiKey').optional().isString().trim(),
  body('apiSecret').optional().isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { platform } = req.params;
      const { accessToken, accessSecret, refreshToken, accountName, accountId, apiKey, apiSecret } = req.body;

      let encryptedToken, encryptedRefresh;

      if (platform === 'twitter') {
        const tokenData = JSON.stringify({
          apiKey: apiKey || process.env.TWITTER_API_KEY,
          apiSecret: apiSecret || process.env.TWITTER_API_SECRET,
          accessToken,
          accessSecret,
        });
        encryptedToken = encrypt(tokenData);
      } else {
        encryptedToken = encrypt(accessToken);
        if (refreshToken) encryptedRefresh = encrypt(refreshToken);
      }

      const account = await prisma.socialAccount.upsert({
        where: { platform },
        update: {
          accessToken: encryptedToken,
          refreshToken: encryptedRefresh || null,
          accountName: accountName || null,
          accountId: accountId || null,
          isConnected: true,
          lastError: null,
          lastCheckedAt: new Date(),
        },
        create: {
          platform,
          accessToken: encryptedToken,
          refreshToken: encryptedRefresh || null,
          accountName: accountName || null,
          accountId: accountId || null,
          isConnected: true,
        },
      });

      res.json({
        platform: account.platform,
        isConnected: account.isConnected,
        accountName: account.accountName,
        message: `${platform} connected successfully`,
      });
    } catch (err) {
      console.error('[social-accounts] connect error:', err);
      res.status(500).json({ error: 'Failed to connect social account' });
    }
  }
);

// POST /api/admin/social-accounts/:platform/disconnect
router.post('/:platform/disconnect',
  param('platform').isIn(VALID_PLATFORMS),
  async (req, res) => {
    try {
      const { platform } = req.params;

      await prisma.socialAccount.upsert({
        where: { platform },
        update: {
          isConnected: false,
          accessToken: null,
          refreshToken: null,
          lastError: null,
        },
        create: {
          platform,
          isConnected: false,
        },
      });

      res.json({ platform, isConnected: false, message: `${platform} disconnected` });
    } catch (err) {
      console.error('[social-accounts] disconnect error:', err);
      res.status(500).json({ error: 'Failed to disconnect social account' });
    }
  }
);

// POST /api/admin/social-accounts/:platform/test — test connection
router.post('/:platform/test',
  param('platform').isIn(VALID_PLATFORMS),
  async (req, res) => {
    try {
      const { platform } = req.params;
      const account = await prisma.socialAccount.findUnique({ where: { platform } });

      if (!account || !account.accessToken) {
        return res.status(400).json({ error: `${platform} is not connected` });
      }

      let testResult;
      try {
        if (platform === 'twitter') {
          const creds = JSON.parse(decrypt(account.accessToken));
          const { TwitterApi } = require('twitter-api-v2');
          const client = new TwitterApi({
            appKey: creds.apiKey,
            appSecret: creds.apiSecret,
            accessToken: creds.accessToken,
            accessSecret: creds.accessSecret,
          });
          const me = await client.v2.me();
          testResult = { username: me.data.username };
        } else if (platform === 'facebook') {
          const token = decrypt(account.accessToken);
          const response = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
          testResult = await response.json();
          if (testResult.error) throw new Error(testResult.error.message);
        } else if (platform === 'instagram') {
          const token = decrypt(account.accessToken);
          const igId = account.accountId;
          const response = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${token}`);
          testResult = await response.json();
          if (testResult.error) throw new Error(testResult.error.message);
        }

        await prisma.socialAccount.update({
          where: { platform },
          data: { lastCheckedAt: new Date(), lastError: null },
        });

        res.json({ platform, healthy: true, details: testResult });
      } catch (testErr) {
        await prisma.socialAccount.update({
          where: { platform },
          data: { lastCheckedAt: new Date(), lastError: testErr.message, isConnected: false },
        });
        res.json({ platform, healthy: false, error: testErr.message });
      }
    } catch (err) {
      console.error('[social-accounts] test error:', err);
      res.status(500).json({ error: 'Failed to test connection' });
    }
  }
);

module.exports = router;
