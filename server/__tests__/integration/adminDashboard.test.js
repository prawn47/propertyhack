const { describe, it, expect, vi, beforeEach } = require('vitest');
const express = require('express');
const request = require('supertest');

vi.mock('jsonwebtoken', async () => {
  const actual = await vi.importActual('jsonwebtoken');
  return {
    ...actual,
    verify: vi.fn((token) => {
      if (token === 'valid-admin-token') return { userId: 'admin-user-1' };
      const err = new Error('invalid token');
      err.name = 'JsonWebTokenError';
      throw err;
    }),
    sign: vi.fn(() => 'mock-token'),
  };
});

const adminDashboardRoutes = require('../../routes/admin/dashboard');
const { authenticateToken, requireSuperAdmin } = require('../../middleware/auth');

const adminUser = {
  id: 'admin-user-1',
  email: 'admin@test.com',
  superAdmin: true,
  createdAt: new Date().toISOString(),
};

function buildMockPrisma() {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(adminUser),
    },
    article: {
      count: vi.fn().mockResolvedValue(42),
      groupBy: vi.fn()
        .mockResolvedValueOnce([
          { status: 'PUBLISHED', _count: { status: 30 } },
          { status: 'DRAFT', _count: { status: 10 } },
          { status: 'ARCHIVED', _count: { status: 2 } },
        ])
        .mockResolvedValueOnce([
          { category: 'Finance', _count: { category: 15 } },
          { category: 'Market Trends', _count: { category: 12 } },
        ]),
    },
    ingestionSource: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn()
        .mockResolvedValueOnce([
          { id: 'source-1', name: 'Top Source', articleCount: 20 },
        ])
        .mockResolvedValueOnce([
          {
            id: 'source-1',
            name: 'Top Source',
            isActive: true,
            lastFetchAt: new Date().toISOString(),
            lastError: null,
            errorCount: 0,
            articleCount: 20,
          },
        ])
        .mockResolvedValueOnce([]),
    },
    ingestionLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'log-1',
          sourceId: 'source-1',
          status: 'SUCCESS',
          articlesFound: 5,
          articlesNew: 2,
          errorMessage: null,
          duration: 800,
          createdAt: new Date().toISOString(),
          source: { name: 'Top Source' },
        },
      ]),
    },
  };
}

function buildApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/admin', authenticateToken, requireSuperAdmin);
  app.use('/api/admin/dashboard', adminDashboardRoutes);
  return app;
}

describe('GET /api/admin/dashboard', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = buildMockPrisma();
    app = buildApp(mockPrisma);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 200 with expected top-level shape', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('articles');
    expect(res.body).toHaveProperty('sources');
    expect(res.body).toHaveProperty('ingestionHealth');
    expect(res.body).toHaveProperty('health');
  });

  it('articles stats have expected shape', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-admin-token');

    const { articles } = res.body;
    expect(articles).toHaveProperty('total');
    expect(articles).toHaveProperty('last24h');
    expect(articles).toHaveProperty('last7d');
    expect(articles).toHaveProperty('last30d');
    expect(articles).toHaveProperty('byStatus');
    expect(articles.byStatus).toHaveProperty('DRAFT');
    expect(articles.byStatus).toHaveProperty('PUBLISHED');
    expect(articles.byStatus).toHaveProperty('ARCHIVED');
    expect(articles).toHaveProperty('byCategory');
    expect(Array.isArray(articles.byCategory)).toBe(true);
  });

  it('sources stats have expected shape', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-admin-token');

    const { sources } = res.body;
    expect(sources).toHaveProperty('total');
    expect(sources).toHaveProperty('active');
    expect(sources).toHaveProperty('paused');
    expect(sources).toHaveProperty('withErrors');
    expect(sources).toHaveProperty('topByArticleCount');
    expect(Array.isArray(sources.topByArticleCount)).toBe(true);
  });

  it('ingestionHealth has perSource and recentLogs arrays', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-admin-token');

    const { ingestionHealth } = res.body;
    expect(Array.isArray(ingestionHealth.perSource)).toBe(true);
    expect(Array.isArray(ingestionHealth.recentLogs)).toBe(true);

    if (ingestionHealth.perSource.length > 0) {
      const src = ingestionHealth.perSource[0];
      expect(src).toHaveProperty('id');
      expect(src).toHaveProperty('name');
      expect(src).toHaveProperty('isActive');
      expect(src).toHaveProperty('consecutiveFailures');
    }

    if (ingestionHealth.recentLogs.length > 0) {
      const log = ingestionHealth.recentLogs[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('sourceId');
      expect(log).toHaveProperty('sourceName');
      expect(log).toHaveProperty('status');
    }
  });

  it('health section has staleSources array and sourcesWithErrors count', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-admin-token');

    const { health } = res.body;
    expect(Array.isArray(health.staleSources)).toBe(true);
    expect(health).toHaveProperty('sourcesWithErrors');
  });

  it('returns 500 on prisma error', async () => {
    mockPrisma.article.count.mockRejectedValue(new Error('db error'));

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to fetch dashboard stats');
  });
});
