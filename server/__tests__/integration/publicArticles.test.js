import express from 'express';
import request from 'supertest';

// Prevent the embedding service from making real network calls
vi.mock('../../services/embeddingService', () => ({
  generateEmbedding: vi.fn().mockRejectedValue(new Error('embedding disabled in tests')),
}));

import publicArticlesRoutes from '../../routes/public/articles';
import publicCategoriesRoutes from '../../routes/public/categories';
import publicLocationsRoutes from '../../routes/public/locations';

function buildApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/articles', publicArticlesRoutes);
  app.use('/api/categories', publicCategoriesRoutes);
  app.use('/api/locations', publicLocationsRoutes);
  return app;
}

const sampleArticle = {
  id: 'article-1',
  sourceId: 'source-1',
  sourceUrl: 'https://example.com/article-1',
  title: 'Sydney Property Market Rises',
  shortBlurb: 'Prices up 5% in Q1',
  longSummary: 'The Sydney property market saw a 5% rise in Q1.',
  imageUrl: null,
  imageAltText: null,
  slug: 'sydney-property-market-rises',
  category: 'Market Trends',
  location: 'Sydney',
  market: 'AU',
  status: 'PUBLISHED',
  isFeatured: false,
  viewCount: 10,
  publishedAt: new Date('2026-01-01').toISOString(),
  metadata: null,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
  source: { id: 'source-1', name: 'Test Source', type: 'RSS' },
};

describe('GET /api/articles', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      article: {
        findMany: vi.fn().mockResolvedValue([sampleArticle]),
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $queryRawUnsafe: vi.fn(),
    };
    app = buildApp(mockPrisma);
  });

  it('returns paginated published articles', async () => {
    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('articles');
    expect(res.body).toHaveProperty('total', 1);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('totalPages', 1);
    expect(Array.isArray(res.body.articles)).toBe(true);
  });

  it('passes status PUBLISHED filter to Prisma', async () => {
    await request(app).get('/api/articles');

    const [findManyCall] = mockPrisma.article.findMany.mock.calls;
    expect(findManyCall[0].where.status).toBe('PUBLISHED');
  });

  it('respects page and limit query params', async () => {
    mockPrisma.article.count.mockResolvedValue(50);
    mockPrisma.article.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/articles?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);

    const [findManyCall] = mockPrisma.article.findMany.mock.calls;
    expect(findManyCall[0].skip).toBe(10);
    expect(findManyCall[0].take).toBe(10);
  });

  it('filters by category', async () => {
    await request(app).get('/api/articles?category=Finance');

    const [findManyCall] = mockPrisma.article.findMany.mock.calls;
    expect(findManyCall[0].where.category).toEqual({ equals: 'Finance', mode: 'insensitive' });
  });

  it('filters by location', async () => {
    await request(app).get('/api/articles?location=Melbourne');

    const [findManyCall] = mockPrisma.article.findMany.mock.calls;
    expect(findManyCall[0].where.location).toEqual({ contains: 'Melbourne', mode: 'insensitive' });
  });

  it('filters by dateFrom and dateTo', async () => {
    await request(app).get('/api/articles?dateFrom=2026-01-01&dateTo=2026-01-31');

    const [findManyCall] = mockPrisma.article.findMany.mock.calls;
    expect(findManyCall[0].where.publishedAt).toBeDefined();
    expect(findManyCall[0].where.publishedAt.gte).toBeInstanceOf(Date);
    expect(findManyCall[0].where.publishedAt.lte).toBeInstanceOf(Date);
  });

  it('returns 500 on prisma error', async () => {
    mockPrisma.article.findMany.mockRejectedValue(new Error('db error'));

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to fetch articles');
  });
});

describe('GET /api/articles/:slug', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      article: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns article by slug', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(sampleArticle);

    const res = await request(app).get('/api/articles/sydney-property-market-rises');

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('sydney-property-market-rises');
    expect(res.body.title).toBe('Sydney Property Market Rises');
  });

  it('increments viewCount after fetching', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(sampleArticle);

    await request(app).get('/api/articles/sydney-property-market-rises');

    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { viewCount: { increment: 1 } },
      })
    );
  });

  it('returns 404 for non-existent slug', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/articles/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Article not found');
  });

  it('returns 404 for non-published article', async () => {
    mockPrisma.article.findUnique.mockResolvedValue({ ...sampleArticle, status: 'DRAFT' });

    const res = await request(app).get('/api/articles/sydney-property-market-rises');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/articles/:slug/related', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
    };
    app = buildApp(mockPrisma);
  });

  it('returns 404 when article slug not found', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/articles/no-such-article/related');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Article not found');
  });

  it('returns related articles array', async () => {
    // First call: find the article; second call: find related
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'article-1', has_embedding: true }])
      .mockResolvedValueOnce([sampleArticle]);

    const res = await request(app).get('/api/articles/sydney-property-market-rises/related');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('articles');
    expect(Array.isArray(res.body.articles)).toBe(true);
  });
});

describe('GET /api/categories', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      article: {
        findMany: vi.fn().mockResolvedValue([
          { category: 'Finance' },
          { category: 'Market Trends' },
        ]),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns categories array', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('categories');
    expect(res.body.categories).toContain('Finance');
    expect(res.body.categories).toContain('Market Trends');
  });

  it('filters out null categories', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      { category: 'Finance' },
      { category: null },
    ]);

    const res = await request(app).get('/api/categories');

    expect(res.body.categories).not.toContain(null);
  });
});

describe('GET /api/locations', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      article: {
        findMany: vi.fn().mockResolvedValue([
          { location: 'Sydney' },
          { location: 'Melbourne' },
        ]),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns locations array', async () => {
    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('locations');
    expect(res.body.locations).toContain('Sydney');
    expect(res.body.locations).toContain('Melbourne');
  });

  it('filters out null locations', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      { location: 'Sydney' },
      { location: null },
    ]);

    const res = await request(app).get('/api/locations');

    expect(res.body.locations).not.toContain(null);
  });
});
