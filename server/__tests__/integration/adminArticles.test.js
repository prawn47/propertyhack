const { describe, it, expect, vi, beforeEach } = require('vitest');
const express = require('express');
const request = require('supertest');

// JWT mock so we can issue test tokens without real secrets
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

const adminArticlesRoutes = require('../../routes/admin/articles');
const { authenticateToken, requireSuperAdmin } = require('../../middleware/auth');

const sampleArticle = {
  id: 'article-1',
  sourceId: 'source-1',
  sourceUrl: 'https://example.com/article',
  title: 'Test Article',
  shortBlurb: 'A short blurb',
  longSummary: 'A longer summary',
  imageUrl: null,
  imageAltText: null,
  slug: 'test-article',
  category: 'Finance',
  location: 'Sydney',
  market: 'AU',
  status: 'DRAFT',
  isFeatured: false,
  viewCount: 0,
  publishedAt: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: { id: 'source-1', name: 'Test Source', type: 'RSS' },
};

const adminUser = {
  id: 'admin-user-1',
  email: 'admin@test.com',
  superAdmin: true,
  createdAt: new Date().toISOString(),
};

function buildApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  // Mirror the real middleware chain from index.js
  app.use('/api/admin', authenticateToken, requireSuperAdmin);
  app.use('/api/admin/articles', adminArticlesRoutes);
  return app;
}

describe('Admin articles — auth guard', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn() },
      article: { findMany: vi.fn(), count: vi.fn() },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 with no auth token', async () => {
    const res = await request(app).get('/api/admin/articles');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid auth token', async () => {
    const res = await request(app)
      .get('/api/admin/articles')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/articles', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      article: {
        findMany: vi.fn().mockResolvedValue([sampleArticle]),
        count: vi.fn().mockResolvedValue(1),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns paginated articles list', async () => {
    const res = await request(app)
      .get('/api/admin/articles')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('articles');
    expect(res.body).toHaveProperty('total', 1);
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('totalPages');
    expect(Array.isArray(res.body.articles)).toBe(true);
  });

  it('respects page and limit query params', async () => {
    mockPrisma.article.count.mockResolvedValue(100);
    mockPrisma.article.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/admin/articles?page=3&limit=10')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);

    const [findManyCall] = mockPrisma.article.findMany.mock.calls;
    expect(findManyCall[0].skip).toBe(20);
    expect(findManyCall[0].take).toBe(10);
  });

  it('filters by status when provided', async () => {
    await request(app)
      .get('/api/admin/articles?status=PUBLISHED')
      .set('Authorization', 'Bearer valid-admin-token');

    const [findManyCall] = mockPrisma.article.findMany.mock.calls;
    expect(findManyCall[0].where.status).toBe('PUBLISHED');
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .get('/api/admin/articles?status=INVALID')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/admin/articles/:id', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      article: {
        findUnique: vi.fn().mockResolvedValue(sampleArticle),
        update: vi.fn().mockResolvedValue({ ...sampleArticle, title: 'Updated Title' }),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/admin/articles/article-1')
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(401);
  });

  it('updates article fields', async () => {
    const res = await request(app)
      .put('/api/admin/articles/article-1')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ title: 'Updated Title', category: 'Finance' });

    expect(res.status).toBe(200);
    expect(mockPrisma.article.update).toHaveBeenCalled();
  });

  it('returns 404 for non-existent article', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/admin/articles/no-such-id')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Article not found');
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .put('/api/admin/articles/article-1')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ status: 'INVALID' });

    expect(res.status).toBe(400);
  });

  it('sets publishedAt when status changes to PUBLISHED for first time', async () => {
    mockPrisma.article.findUnique.mockResolvedValue({ ...sampleArticle, publishedAt: null });
    mockPrisma.article.update.mockResolvedValue({ ...sampleArticle, status: 'PUBLISHED' });

    await request(app)
      .put('/api/admin/articles/article-1')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ status: 'PUBLISHED' });

    const [updateCall] = mockPrisma.article.update.mock.calls;
    expect(updateCall[0].data.publishedAt).toBeInstanceOf(Date);
  });
});

describe('POST /api/admin/articles/manual', () => {
  let app;
  let mockPrisma;

  const manualSource = {
    id: 'source-manual',
    name: 'Manual Entry',
    type: 'MANUAL',
    config: {},
    market: 'AU',
    isActive: true,
  };

  const createdArticle = {
    ...sampleArticle,
    id: 'article-new',
    slug: 'test-manual-article',
    title: 'Test Manual Article',
  };

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        findFirst: vi.fn().mockResolvedValue(manualSource),
        create: vi.fn().mockResolvedValue(manualSource),
      },
      article: {
        create: vi.fn().mockResolvedValue(createdArticle),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/admin/articles/manual')
      .send({ title: 'Test' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when neither url nor title provided', async () => {
    const res = await request(app)
      .post('/api/admin/articles/manual')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ shortBlurb: 'no title or url' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Either url or title is required');
  });

  it('creates article from title input', async () => {
    const res = await request(app)
      .post('/api/admin/articles/manual')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({
        title: 'Test Manual Article',
        shortBlurb: 'A blurb',
        category: 'Finance',
      });

    expect(res.status).toBe(201);
    expect(mockPrisma.article.create).toHaveBeenCalled();
  });

  it('creates article from URL input when no title provided', async () => {
    const res = await request(app)
      .post('/api/admin/articles/manual')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ url: 'https://example.com/article' });

    expect(res.status).toBe(201);
    expect(mockPrisma.article.create).toHaveBeenCalled();

    const [createCall] = mockPrisma.article.create.mock.calls;
    expect(createCall[0].data.sourceUrl).toBe('https://example.com/article');
  });

  it('creates MANUAL ingestion source if none exists', async () => {
    mockPrisma.ingestionSource.findFirst.mockResolvedValue(null);

    await request(app)
      .post('/api/admin/articles/manual')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ title: 'Some Article' });

    expect(mockPrisma.ingestionSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'MANUAL' }),
      })
    );
  });
});
