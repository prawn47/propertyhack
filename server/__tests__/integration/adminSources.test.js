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

// sourceFetchQueue.add would try to connect to Redis in tests
vi.mock('../../queues/sourceFetchQueue', () => ({
  sourceFetchQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
}));

const adminSourcesRoutes = require('../../routes/admin/sources');
const { authenticateToken, requireSuperAdmin } = require('../../middleware/auth');

const adminUser = {
  id: 'admin-user-1',
  email: 'admin@test.com',
  superAdmin: true,
  createdAt: new Date().toISOString(),
};

const sampleSource = {
  id: 'source-1',
  name: 'Test RSS Source',
  type: 'RSS',
  config: { feedUrl: 'https://example.com/rss' },
  market: 'AU',
  category: null,
  schedule: null,
  isActive: true,
  lastFetchAt: null,
  lastError: null,
  errorCount: 0,
  articleCount: 0,
  createdAt: new Date().toISOString(),
};

function buildApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/admin', authenticateToken, requireSuperAdmin);
  app.use('/api/admin/sources', adminSourcesRoutes);
  return app;
}

describe('Admin sources — auth guard', () => {
  let app;

  beforeEach(() => {
    app = buildApp({ user: { findUnique: vi.fn() } });
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/admin/sources');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/sources', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        findMany: vi.fn().mockResolvedValue([sampleSource]),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns list of sources', async () => {
    const res = await request(app)
      .get('/api/admin/sources')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id', 'source-1');
    expect(res.body[0]).toHaveProperty('name', 'Test RSS Source');
  });

  it('filters by type when provided', async () => {
    await request(app)
      .get('/api/admin/sources?type=RSS')
      .set('Authorization', 'Bearer valid-admin-token');

    const [findManyCall] = mockPrisma.ingestionSource.findMany.mock.calls;
    expect(findManyCall[0].where.type).toBe('RSS');
  });

  it('returns 400 for invalid type', async () => {
    const res = await request(app)
      .get('/api/admin/sources?type=INVALID')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/sources', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        create: vi.fn().mockResolvedValue(sampleSource),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('creates a new RSS source', async () => {
    const res = await request(app)
      .post('/api/admin/sources')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({
        name: 'Test RSS Source',
        type: 'RSS',
        config: { feedUrl: 'https://example.com/rss' },
        market: 'AU',
      });

    expect(res.status).toBe(201);
    expect(mockPrisma.ingestionSource.create).toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/admin/sources')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ type: 'RSS', config: { feedUrl: 'https://example.com/rss' } });

    expect(res.status).toBe(400);
  });

  it('returns 400 when type is invalid', async () => {
    const res = await request(app)
      .post('/api/admin/sources')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ name: 'Test', type: 'INVALID', config: {} });

    expect(res.status).toBe(400);
  });

  it('returns 400 when RSS config is missing feedUrl', async () => {
    const res = await request(app)
      .post('/api/admin/sources')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ name: 'Test', type: 'RSS', config: {} });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/sources/:id', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        findUnique: vi.fn().mockResolvedValue({ ...sampleSource, logs: [] }),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns source with logs', async () => {
    const res = await request(app)
      .get('/api/admin/sources/source-1')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'source-1');
    expect(res.body).toHaveProperty('logs');
  });

  it('returns 404 for unknown source id', async () => {
    mockPrisma.ingestionSource.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/admin/sources/no-such-id')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Source not found');
  });
});

describe('PUT /api/admin/sources/:id', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        findUnique: vi.fn().mockResolvedValue(sampleSource),
        update: vi.fn().mockResolvedValue({ ...sampleSource, name: 'Updated Source' }),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('updates source fields', async () => {
    const res = await request(app)
      .put('/api/admin/sources/source-1')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ name: 'Updated Source', isActive: false });

    expect(res.status).toBe(200);
    expect(mockPrisma.ingestionSource.update).toHaveBeenCalled();
  });

  it('returns 404 for unknown source id', async () => {
    mockPrisma.ingestionSource.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/admin/sources/no-such-id')
      .set('Authorization', 'Bearer valid-admin-token')
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/sources/:id', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        findUnique: vi.fn().mockResolvedValue(sampleSource),
        delete: vi.fn().mockResolvedValue({}),
      },
      ingestionLog: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('deletes source and its logs', async () => {
    const res = await request(app)
      .delete('/api/admin/sources/source-1')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(mockPrisma.ingestionLog.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.ingestionSource.delete).toHaveBeenCalled();
  });

  it('returns 404 for unknown source id', async () => {
    mockPrisma.ingestionSource.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/admin/sources/no-such-id')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/admin/sources/:id/fetch', () => {
  let app;
  let mockPrisma;
  const { sourceFetchQueue } = require('../../queues/sourceFetchQueue');

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        findUnique: vi.fn().mockResolvedValue(sampleSource),
      },
    };
    app = buildApp(mockPrisma);
    sourceFetchQueue.add.mockClear();
  });

  it('queues a fetch job for an active source', async () => {
    const res = await request(app)
      .post('/api/admin/sources/source-1/fetch')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('queued', true);
    expect(sourceFetchQueue.add).toHaveBeenCalledWith(
      'manual-fetch',
      expect.objectContaining({ sourceId: 'source-1' })
    );
  });

  it('returns 400 when source is not active', async () => {
    mockPrisma.ingestionSource.findUnique.mockResolvedValue({ ...sampleSource, isActive: false });

    const res = await request(app)
      .post('/api/admin/sources/source-1/fetch')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Source is not active');
  });

  it('returns 404 for unknown source id', async () => {
    mockPrisma.ingestionSource.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/admin/sources/no-such-id/fetch')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/admin/sources/:id/logs', () => {
  let app;
  let mockPrisma;

  const sampleLog = {
    id: 'log-1',
    sourceId: 'source-1',
    status: 'SUCCESS',
    articlesFound: 10,
    articlesNew: 3,
    errorMessage: null,
    duration: 1200,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(adminUser) },
      ingestionSource: {
        findUnique: vi.fn().mockResolvedValue(sampleSource),
      },
      ingestionLog: {
        findMany: vi.fn().mockResolvedValue([sampleLog]),
        count: vi.fn().mockResolvedValue(1),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns paginated logs for a source', async () => {
    const res = await request(app)
      .get('/api/admin/sources/source-1/logs')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('logs');
    expect(res.body).toHaveProperty('total', 1);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('totalPages', 1);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it('returns 404 for unknown source id', async () => {
    mockPrisma.ingestionSource.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/admin/sources/no-such-id/logs')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.status).toBe(404);
  });
});
