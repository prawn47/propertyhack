import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

const mockQueryRawUnsafe = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

const mockPrisma = {
  $queryRawUnsafe: mockQueryRawUnsafe,
  systemPrompt: { findUnique: mockFindUnique },
  newsletterGenerationConfig: { findFirst: mockFindFirst },
  newsletterDraft: { create: mockCreate, update: mockUpdate },
};

const mockGenerateText = vi.fn();
const mockGenerateHeroImage = vi.fn();
const mockGenerateEmbedding = vi.fn();

// Patch dependencies
const prismaClientPath = _require.resolve('@prisma/client');
_require.cache[prismaClientPath] = {
  id: prismaClientPath,
  filename: prismaClientPath,
  loaded: true,
  exports: { PrismaClient: function () { return mockPrisma; } },
};

const aiProviderPath = _require.resolve('../../services/aiProviderService.js');
_require.cache[aiProviderPath] = {
  id: aiProviderPath,
  filename: aiProviderPath,
  loaded: true,
  exports: { generateText: mockGenerateText },
};

const imagenPath = _require.resolve('../../services/imagenService.js');
_require.cache[imagenPath] = {
  id: imagenPath,
  filename: imagenPath,
  loaded: true,
  exports: { generateHeroImage: mockGenerateHeroImage },
};

const embeddingPath = _require.resolve('../../services/embeddingService.js');
_require.cache[embeddingPath] = {
  id: embeddingPath,
  filename: embeddingPath,
  loaded: true,
  exports: { generateEmbedding: mockGenerateEmbedding },
};

// Force fresh load
const svcPath = _require.resolve('../../services/newsletterService.js');
delete _require.cache[svcPath];
const newsletterService = _require('../../services/newsletterService.js');

describe('newsletterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);
  });

  describe('selectGlobalHighlights', () => {
    it('returns articles from other markets', async () => {
      const mockRows = [
        { id: '1', title: 'UK Housing Boom', shortBlurb: 'Blurb', slug: 'uk-boom', market: 'UK', publishedAt: new Date() },
        { id: '2', title: 'US Rate Cut', shortBlurb: 'Blurb', slug: 'us-rate', market: 'US', publishedAt: new Date() },
      ];
      mockQueryRawUnsafe.mockResolvedValue(mockRows);

      const result = await newsletterService.selectGlobalHighlights('au', 7, 3, { prisma: mockPrisma });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('UK Housing Boom');
      expect(result[1].market).toBe('US');
      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('market != $2'),
        expect.any(Date),
        'AU',
        3
      );
    });
  });

  describe('selectWeekArticles', () => {
    it('returns articles within date range', async () => {
      const mockRows = [
        {
          id: '1', title: 'Weekly Story', shortBlurb: 'Blurb', longSummary: 'Long',
          slug: 'weekly', category: 'Prices', publishedAt: new Date(),
          sourceUrl: 'https://example.com', relevanceScore: 8,
        },
      ];
      mockQueryRawUnsafe.mockResolvedValue(mockRows);

      const result = await newsletterService.selectWeekArticles('au', 6, 30, { prisma: mockPrisma });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Weekly Story');
      expect(result[0].relevanceScore).toBe(8);
      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('published_at >= $1'),
        expect.any(Date),
        'AU',
        30
      );
    });
  });

  describe('identifyTrendingTopic', () => {
    it('returns a topic object', async () => {
      const weekArticles = [
        { title: 'Rate Rise Impact', category: 'Rates', relevanceScore: 9, shortBlurb: 'test' },
        { title: 'Mortgage Changes', category: 'Rates', relevanceScore: 8, shortBlurb: 'test' },
        { title: 'New Suburb Guide', category: 'Lifestyle', relevanceScore: 5, shortBlurb: 'test' },
      ];

      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ topic: 'Interest Rate Impacts on Housing' }),
      });

      const result = await newsletterService.identifyTrendingTopic(weekArticles, { prisma: mockPrisma });

      expect(result.topic).toBe('Interest Rate Impacts on Housing');
      expect(result.sourceArticles).toHaveLength(2); // the Rates category articles
      expect(mockGenerateText).toHaveBeenCalledWith(
        'newsletter-editorial',
        expect.stringContaining('Rates'),
        expect.objectContaining({ jsonMode: true })
      );
    });

    it('returns fallback topic when no articles provided', async () => {
      const result = await newsletterService.identifyTrendingTopic([], { prisma: mockPrisma });
      expect(result.topic).toBe('Property Market This Week');
      expect(result.sourceArticles).toEqual([]);
    });
  });

  describe('buildEditorialPrompt', () => {
    it('includes topic and historical context', async () => {
      mockFindUnique.mockResolvedValue(null);

      const articleData = {
        topic: 'Housing Affordability Crisis',
        weekArticles: [
          { title: 'Test Article', slug: 'test', longSummary: 'Summary', category: 'Prices' },
        ],
        historicalArticles: [
          { title: 'Old Article', slug: 'old', shortBlurb: 'Old blurb', publishedAt: new Date('2026-01-01') },
        ],
        globalHighlights: [],
        trendClusters: [],
      };

      const { userPrompt } = await newsletterService.buildEditorialPrompt('au', articleData, { prisma: mockPrisma });

      expect(userPrompt).toContain('Housing Affordability Crisis');
      expect(userPrompt).toContain('Old Article');
      expect(userPrompt).toContain('Australia');
    });
  });

  describe('buildRoundupPrompt', () => {
    it('includes week articles and global highlights', async () => {
      mockFindUnique.mockResolvedValue(null);

      const articleData = {
        weekArticles: [
          { title: 'Week Story', slug: 'week-story', shortBlurb: 'Blurb', relevanceScore: 8, category: 'Prices' },
        ],
        globalHighlights: [
          { title: 'Global Story', slug: 'global-story', market: 'UK' },
        ],
        historicalArticles: [],
      };

      const { userPrompt } = await newsletterService.buildRoundupPrompt('nz', articleData, { prisma: mockPrisma });

      expect(userPrompt).toContain('Week Story');
      expect(userPrompt).toContain('Global Story');
      expect(userPrompt).toContain('New Zealand');
      expect(userPrompt).toContain('Weekly Roundup');
    });
  });

  describe('generateNewsletter', () => {
    const mockAiResponse = JSON.stringify({
      subject: 'Test Newsletter Subject',
      sections: [{ type: 'intro', heading: 'Intro', html: '<p>Hello</p>' }],
      articleSlugs: ['test-slug'],
    });

    beforeEach(() => {
      mockQueryRawUnsafe.mockResolvedValue([]);
      mockGenerateText.mockResolvedValue({ text: mockAiResponse });
      mockGenerateEmbedding.mockResolvedValue(new Array(1536).fill(0));
      mockGenerateHeroImage.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'draft-1', status: 'DRAFT' });
    });

    it('dispatches correctly for DAILY cadence', async () => {
      await newsletterService.generateNewsletter('au', 'DAILY');

      expect(mockGenerateText).toHaveBeenCalledWith(
        'newsletter-generation',
        expect.any(String),
        expect.objectContaining({ jsonMode: true })
      );
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jurisdiction: 'AU',
          cadence: 'DAILY',
          status: 'DRAFT',
        }),
      });
    });

    it('dispatches correctly for WEEKLY_ROUNDUP cadence', async () => {
      await newsletterService.generateNewsletter('uk', 'WEEKLY_ROUNDUP');

      expect(mockGenerateText).toHaveBeenCalledWith(
        'newsletter-roundup',
        expect.any(String),
        expect.objectContaining({ jsonMode: true })
      );
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jurisdiction: 'UK',
          cadence: 'WEEKLY_ROUNDUP',
        }),
      });
    });

    it('dispatches correctly for EDITORIAL cadence', async () => {
      // Provide week articles so identifyTrendingTopic calls AI
      const weekRows = [
        { id: '1', title: 'Rate Story', shortBlurb: 'b', longSummary: 'l', slug: 'rate', category: 'Rates', publishedAt: new Date(), sourceUrl: 'http://x.com', relevanceScore: 9 },
      ];
      mockQueryRawUnsafe
        .mockResolvedValueOnce(weekRows)  // selectWeekArticles
        .mockResolvedValueOnce([])        // selectHistoricalContext
        .mockResolvedValueOnce([]);       // selectGlobalHighlights

      mockGenerateText
        .mockResolvedValueOnce({ text: JSON.stringify({ topic: 'Test Topic' }) }) // identifyTrendingTopic
        .mockResolvedValueOnce({ text: mockAiResponse }); // editorial generation

      await newsletterService.generateNewsletter('us', 'EDITORIAL');

      expect(mockGenerateText).toHaveBeenCalledWith(
        'newsletter-editorial',
        expect.any(String),
        expect.objectContaining({ jsonMode: true })
      );
    });
  });
});
