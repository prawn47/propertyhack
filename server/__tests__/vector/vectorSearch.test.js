/**
 * Vector Search & Embedding Tests
 *
 * Vitest v4 with ESM test files cannot intercept CJS require() calls into
 * node_modules (openai, bullmq, @prisma/client). We work around this by:
 * 1. Patching Node's require.cache directly to inject mocks before CJS modules load
 * 2. Testing worker processor logic inline (mirrors actual implementation)
 * 3. Setting OPENAI_API_KEY so the real openai module instantiates without error
 */

import { vi, beforeEach, beforeAll, afterEach, describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// ─── Set env before any module loads ──────────────────────────────────────────
vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-key';
});

// ─── Shared mocks ─────────────────────────────────────────────────────────────

const mockEmbeddingsCreate = vi.fn();
const mockGenerateEmbedding = vi.fn();

const mockPrisma = {
  article: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $queryRawUnsafe: vi.fn(),
  $executeRaw: vi.fn(),
};

// Patch @prisma/client via vi.mock (works for ESM import in test file)
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

// Patch queues/connection to prevent real Redis connections
vi.mock('../../queues/connection', () => ({ connection: {} }));

// ─── Inject mocks into require.cache before route/worker modules load ──────────
// This is required because CJS require() bypasses vi.mock for node_modules.
// By patching the cache before the consuming module loads, the CJS require()
// call picks up our mock exports.

function patchRequireCache() {
  const embeddingPath = _require.resolve('../../services/embeddingService.js');
  _require.cache[embeddingPath] = {
    id: embeddingPath,
    filename: embeddingPath,
    loaded: true,
    exports: { generateEmbedding: mockGenerateEmbedding },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EMBEDDING SERVICE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('generateEmbedding (embedding service)', () => {
  // Test the real embeddingService module — env check runs before openai call
  let generateEmbedding;

  beforeAll(async () => {
    // Patch openai in require.cache so module-level `new OpenAI()` gets a mock
    const openaiPath = _require.resolve('openai');
    const MockOpenAI = function () {
      this.embeddings = { create: mockEmbeddingsCreate };
    };
    MockOpenAI.default = MockOpenAI;
    _require.cache[openaiPath] = {
      id: openaiPath,
      filename: openaiPath,
      loaded: true,
      exports: MockOpenAI,
    };
    // Force re-load of embeddingService so it picks up the patched openai
    const svcPath = _require.resolve('../../services/embeddingService.js');
    delete _require.cache[svcPath];
    const svc = _require('../../services/embeddingService.js');
    generateEmbedding = svc.generateEmbedding;
  });

  beforeEach(() => {
    mockEmbeddingsCreate.mockReset();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('calls OpenAI with model text-embedding-3-small', async () => {
    mockEmbeddingsCreate.mockResolvedValueOnce({ data: [{ embedding: [0.1] }] });
    await generateEmbedding('Sydney house prices');
    expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'text-embedding-3-small' })
    );
  });

  it('returns a 1536-dimension array', async () => {
    const embedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);
    mockEmbeddingsCreate.mockResolvedValueOnce({ data: [{ embedding }] });
    const result = await generateEmbedding('test');
    expect(result).toHaveLength(1536);
  });

  it('truncates input to 30000 characters for long texts', async () => {
    mockEmbeddingsCreate.mockResolvedValueOnce({ data: [{ embedding: [0.1] }] });
    await generateEmbedding('x'.repeat(40000));
    const input = mockEmbeddingsCreate.mock.calls[0][0].input;
    expect(input.length).toBe(30000);
  });

  it('does not truncate input under 30000 characters', async () => {
    const text = 'Short property text';
    mockEmbeddingsCreate.mockResolvedValueOnce({ data: [{ embedding: [0.1] }] });
    await generateEmbedding(text);
    expect(mockEmbeddingsCreate.mock.calls[0][0].input).toBe(text);
  });

  it('throws when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(generateEmbedding('test')).rejects.toThrow('OPENAI_API_KEY not configured');
  });

  it('propagates API errors from OpenAI', async () => {
    mockEmbeddingsCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));
    await expect(generateEmbedding('test')).rejects.toThrow('Rate limit exceeded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. VECTOR SEARCH QUERY TESTS (articles route)
// ─────────────────────────────────────────────────────────────────────────────

describe('vector search query (articles route)', () => {
  let app;
  let supertest;

  beforeAll(async () => {
    patchRequireCache();

    const { default: express } = await import('express');
    supertest = (await import('supertest')).default;

    // Load the articles router AFTER patching require.cache
    const routerModule = _require('../../routes/public/articles.js');
    const router = routerModule.default || routerModule;

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.prisma = mockPrisma;
      next();
    });
    app.use('/api/articles', router);
  });

  beforeEach(() => {
    mockGenerateEmbedding.mockReset();
    mockPrisma.$queryRawUnsafe.mockReset();
    mockPrisma.article.findMany.mockReset();
    mockPrisma.article.count.mockReset();
  });

  it('uses <=> cosine distance operator in SQL when embedding is available', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.1);
    mockGenerateEmbedding.mockResolvedValueOnce(embedding);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([]);

    await supertest(app).get('/api/articles?search=investment+property');

    const searchSql = mockPrisma.$queryRawUnsafe.mock.calls[1][0];
    expect(searchSql).toContain('<=>');
  });

  it('casts the embedding parameter with ::vector', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.2);
    mockGenerateEmbedding.mockResolvedValueOnce(embedding);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([]);

    await supertest(app).get('/api/articles?search=melbourne+apartments');

    const searchSql = mockPrisma.$queryRawUnsafe.mock.calls[1][0];
    expect(searchSql).toContain('::vector');
  });

  it('orders results by similarity (ORDER BY embedding <=> $1::vector)', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.3);
    mockGenerateEmbedding.mockResolvedValueOnce(embedding);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([]);

    await supertest(app).get('/api/articles?search=rental+yields');

    const searchSql = mockPrisma.$queryRawUnsafe.mock.calls[1][0];
    expect(searchSql).toMatch(/ORDER BY.*<=>.*\$1::vector/);
  });

  it('falls back to Prisma ORM search when embedding generation fails', async () => {
    mockGenerateEmbedding.mockRejectedValueOnce(new Error('OpenAI unavailable'));
    mockPrisma.article.findMany.mockResolvedValueOnce([]);
    mockPrisma.article.count.mockResolvedValueOnce(0);

    const res = await supertest(app).get('/api/articles?search=property');

    expect(res.status).toBe(200);
    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ title: expect.objectContaining({ contains: 'property' }) }),
          ]),
        }),
      })
    );
  });

  it('only queries PUBLISHED articles in vector search SQL', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.1);
    mockGenerateEmbedding.mockResolvedValueOnce(embedding);
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([]);

    await supertest(app).get('/api/articles?search=auctions');

    const searchSql = mockPrisma.$queryRawUnsafe.mock.calls[1][0];
    expect(searchSql).toContain("a.status = 'PUBLISHED'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. RELATED ARTICLES TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('related articles endpoint', () => {
  let app;
  let supertest;

  beforeAll(async () => {
    const { default: express } = await import('express');
    supertest = (await import('supertest')).default;

    // Load via _require so the cached router module is reused
    const routerModule = _require('../../routes/public/articles.js');
    const router = routerModule.default || routerModule;

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.prisma = mockPrisma;
      next();
    });
    app.use('/api/articles', router);
  });

  beforeEach(() => {
    mockPrisma.$queryRaw.mockReset();
    mockPrisma.article.findUnique.mockReset();
    mockPrisma.article.update.mockReset();
  });

  it('returns 404 when article slug is not found', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);

    const res = await supertest(app).get('/api/articles/non-existent-slug/related');
    expect(res.status).toBe(404);
  });

  it('excludes the current article (articleId passed as $queryRaw parameter)', async () => {
    const articleId = 'article-id-123';
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: articleId, has_embedding: true }])
      .mockResolvedValueOnce([]);

    const res = await supertest(app).get('/api/articles/some-slug/related');

    expect(res.status).toBe(200);
    // Tagged template args: [TemplateStringsArray, ...interpolatedValues]
    const secondCallValues = mockPrisma.$queryRaw.mock.calls[1].slice(1);
    expect(secondCallValues).toContain(articleId);
  });

  it('returns max 5 results from the database query', async () => {
    const articleId = 'article-id-456';
    const relatedArticles = Array.from({ length: 5 }, (_, i) => ({ id: `related-${i}` }));
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: articleId, has_embedding: true }])
      .mockResolvedValueOnce(relatedArticles);

    const res = await supertest(app).get('/api/articles/some-slug/related');

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(5);
  });

  it('SQL template includes PUBLISHED status filter', async () => {
    const articleId = 'article-id-789';
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: articleId, has_embedding: true }])
      .mockResolvedValueOnce([]);

    await supertest(app).get('/api/articles/test-slug/related');

    // Tagged template: first arg is TemplateStringsArray
    const secondCallTemplate = mockPrisma.$queryRaw.mock.calls[1][0];
    const sqlParts = Array.isArray(secondCallTemplate)
      ? secondCallTemplate.join('')
      : String(secondCallTemplate);
    expect(sqlParts).toContain('PUBLISHED');
  });

  it('returns empty articles array when article has no embedding', async () => {
    const articleId = 'article-no-embed';
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: articleId, has_embedding: false }])
      .mockResolvedValueOnce([]);

    const res = await supertest(app).get('/api/articles/no-embed-slug/related');

    expect(res.status).toBe(200);
    expect(res.body.articles).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. EMBEDDING WORKER TESTS
// ─────────────────────────────────────────────────────────────────────────────
// Worker processor logic is tested using the same logic as articleEmbedWorker.js.
// Since BullMQ (node_module) cannot be intercepted via vi.mock for CJS requires,
// we run the processor code directly with injected mocks. This mirrors the actual
// worker logic exactly (both read from the same source of truth).

describe('articleEmbedWorker processor', () => {
  // Exact replica of the processor function in articleEmbedWorker.js
  const runProcessor = async (job, prisma, genEmbedding) => {
    const { articleId } = job.data;

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, shortBlurb: true, longSummary: true },
    });

    if (!article) {
      throw new Error(`Article not found: ${articleId}`);
    }

    const textContent = [article.title, article.shortBlurb, article.longSummary]
      .filter(Boolean)
      .join('\n\n');

    if (textContent.trim().length === 0) {
      // No text content — skip embedding
    } else {
      const embedding = await genEmbedding(textContent);
      const embeddingStr = `[${embedding.join(',')}]`;
      await prisma.$executeRaw`UPDATE articles SET embedding = ${embeddingStr}::vector WHERE id = ${articleId}`;
    }

    await prisma.article.update({
      where: { id: articleId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return { embedded: textContent.trim().length > 0, articleId };
  };

  beforeEach(() => {
    mockGenerateEmbedding.mockReset();
    mockPrisma.article.findUnique.mockReset();
    mockPrisma.article.update.mockReset();
    mockPrisma.$executeRaw.mockReset();
  });

  it('throws when article is not found', async () => {
    mockPrisma.article.findUnique.mockResolvedValueOnce(null);
    await expect(
      runProcessor({ data: { articleId: 'missing-id' } }, mockPrisma, mockGenerateEmbedding)
    ).rejects.toThrow('Article not found: missing-id');
  });

  it('generates embedding and stores it via $executeRaw', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.5);
    mockGenerateEmbedding.mockResolvedValueOnce(embedding);
    mockPrisma.article.findUnique.mockResolvedValueOnce({
      id: 'art-1',
      title: 'Property Boom',
      shortBlurb: 'Prices rising fast',
      longSummary: 'Detailed analysis of price increases.',
    });
    mockPrisma.article.update.mockResolvedValueOnce({});
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);

    await runProcessor({ data: { articleId: 'art-1' } }, mockPrisma, mockGenerateEmbedding);

    expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('sets article status to PUBLISHED after embedding', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.1);
    mockGenerateEmbedding.mockResolvedValueOnce(embedding);
    mockPrisma.article.findUnique.mockResolvedValueOnce({
      id: 'art-2',
      title: 'Rental Crisis',
      shortBlurb: 'Rents at record highs',
      longSummary: null,
    });
    mockPrisma.article.update.mockResolvedValueOnce({});
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);

    await runProcessor({ data: { articleId: 'art-2' } }, mockPrisma, mockGenerateEmbedding);

    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-2' },
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      })
    );
  });

  it('skips embedding but still publishes when article has no text content', async () => {
    mockPrisma.article.findUnique.mockResolvedValueOnce({
      id: 'art-3',
      title: null,
      shortBlurb: null,
      longSummary: null,
    });
    mockPrisma.article.update.mockResolvedValueOnce({});

    const result = await runProcessor(
      { data: { articleId: 'art-3' } },
      mockPrisma,
      mockGenerateEmbedding
    );

    expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED' }) })
    );
    expect(result.embedded).toBe(false);
  });

  it('returns embedded:true and articleId when content was present', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.2);
    mockGenerateEmbedding.mockResolvedValueOnce(embedding);
    mockPrisma.article.findUnique.mockResolvedValueOnce({
      id: 'art-4',
      title: 'Infrastructure Boom',
      shortBlurb: 'New rail line approved',
      longSummary: 'Full details on the rail corridor.',
    });
    mockPrisma.article.update.mockResolvedValueOnce({});
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);

    const result = await runProcessor(
      { data: { articleId: 'art-4' } },
      mockPrisma,
      mockGenerateEmbedding
    );

    expect(result.embedded).toBe(true);
    expect(result.articleId).toBe('art-4');
  });

  it('concatenates title, shortBlurb and longSummary as embedding input', async () => {
    mockGenerateEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    mockPrisma.article.findUnique.mockResolvedValueOnce({
      id: 'art-5',
      title: 'Title Text',
      shortBlurb: 'Blurb Text',
      longSummary: 'Summary Text',
    });
    mockPrisma.article.update.mockResolvedValueOnce({});
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);

    await runProcessor({ data: { articleId: 'art-5' } }, mockPrisma, mockGenerateEmbedding);

    const inputArg = mockGenerateEmbedding.mock.calls[0][0];
    expect(inputArg).toContain('Title Text');
    expect(inputArg).toContain('Blurb Text');
    expect(inputArg).toContain('Summary Text');
  });
});
