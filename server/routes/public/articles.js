const express = require('express');
const router = express.Router();
const { generateEmbedding } = require('../../services/embeddingService');
const aiProviderService = require('../../services/aiProviderService');

const VALID_COUNTRIES = ['AU', 'US', 'UK', 'CA', 'NZ', 'GLOBAL'];

const ARTICLE_SELECT = {
  id: true,
  sourceId: true,
  sourceUrl: true,
  title: true,
  shortBlurb: true,
  longSummary: true,
  imageUrl: true,
  imageAltText: true,
  slug: true,
  category: true,
  location: true,
  market: true,
  markets: true,
  isEvergreen: true,
  status: true,
  isFeatured: true,
  viewCount: true,
  publishedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  source: {
    select: { id: true, name: true, type: true },
  },
};

// GET /api/articles
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=300');
  try {
    const {
      search,
      location,
      category,
      dateFrom,
      dateTo,
      sort = 'newest',
      page = 1,
      limit = 20,
      country,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const countryUpper = country && VALID_COUNTRIES.includes(country.toUpperCase()) ? country.toUpperCase() : null;
    const applyCountryFilter = countryUpper && countryUpper !== 'GLOBAL';

    const where = { status: 'PUBLISHED' };

    if (applyCountryFilter) {
      where.OR = [
        { markets: { has: countryUpper } },
        { markets: { has: 'ALL' } },
      ];
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }
    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) where.publishedAt.gte = new Date(dateFrom);
      if (dateTo) where.publishedAt.lte = new Date(dateTo);
    }

    if (search) {
      let embedding;
      try {
        embedding = await generateEmbedding(search);
      } catch (err) {
        console.error('[Articles] Embedding generation failed, falling back to text search:', err.message);
      }

      if (embedding) {
        const embeddingStr = `[${embedding.join(',')}]`;

        const filterClauses = [`a.status = 'PUBLISHED'`];
        const filterValues = [];
        let paramIdx = 2;

        if (applyCountryFilter) {
          filterClauses.push(`($${paramIdx} = ANY(a.markets) OR 'ALL' = ANY(a.markets))`);
          filterValues.push(countryUpper);
          paramIdx++;
        }
        if (location) {
          filterClauses.push(`LOWER(a.location) LIKE LOWER($${paramIdx})`);
          filterValues.push(`%${location}%`);
          paramIdx++;
        }
        if (category) {
          filterClauses.push(`LOWER(a.category) = LOWER($${paramIdx})`);
          filterValues.push(category);
          paramIdx++;
        }
        if (dateFrom) {
          filterClauses.push(`a.published_at >= $${paramIdx}`);
          filterValues.push(new Date(dateFrom));
          paramIdx++;
        }
        if (dateTo) {
          filterClauses.push(`a.published_at <= $${paramIdx}`);
          filterValues.push(new Date(dateTo));
          paramIdx++;
        }

        const whereClause = filterClauses.join(' AND ');

        // Count query: rebuild filter clauses without $1 (embedding not needed for count)
        const countClauses = [`a.status = 'PUBLISHED'`, `a.embedding IS NOT NULL`];
        const countValues = [];
        let countIdx = 1;
        if (applyCountryFilter) {
          countClauses.push(`($${countIdx} = ANY(a.markets) OR 'ALL' = ANY(a.markets))`);
          countValues.push(countryUpper);
          countIdx++;
        }
        if (location) {
          countClauses.push(`LOWER(a.location) LIKE LOWER($${countIdx})`);
          countValues.push(`%${location}%`);
          countIdx++;
        }
        if (category) {
          countClauses.push(`LOWER(a.category) = LOWER($${countIdx})`);
          countValues.push(category);
          countIdx++;
        }
        if (dateFrom) {
          countClauses.push(`a.published_at >= $${countIdx}`);
          countValues.push(new Date(dateFrom));
          countIdx++;
        }
        if (dateTo) {
          countClauses.push(`a.published_at <= $${countIdx}`);
          countValues.push(new Date(dateTo));
          countIdx++;
        }
        const countResult = await req.prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM articles a WHERE ${countClauses.join(' AND ')}`,
          ...countValues
        );
        const total = countResult[0]?.count ?? 0;

        const articles = await req.prisma.$queryRawUnsafe(
          `SELECT
            a.id, a.source_id as "sourceId", a.source_url as "sourceUrl",
            a.title, a.short_blurb as "shortBlurb", a.long_summary as "longSummary",
            a.image_url as "imageUrl", a.image_alt_text as "imageAltText",
            a.slug, a.category, a.location, a.market, a.status,
            a.is_featured as "isFeatured", a.view_count as "viewCount",
            a.published_at as "publishedAt", a.metadata,
            a.created_at as "createdAt", a.updated_at as "updatedAt",
            s.id as "source.id", s.name as "source.name", s.type as "source.type",
            1 - (a.embedding <=> $1::vector) as similarity
          FROM articles a
          LEFT JOIN ingestion_sources s ON s.id = a.source_id
          WHERE ${whereClause} AND a.embedding IS NOT NULL
          ORDER BY a.embedding <=> $1::vector
          LIMIT ${limitNum} OFFSET ${skip}`,
          embeddingStr,
          ...filterValues
        );

        const shaped = articles.map((row) => ({
          id: row.id,
          sourceId: row.sourceId,
          sourceUrl: row.sourceUrl,
          title: row.title,
          shortBlurb: row.shortBlurb,
          longSummary: row.longSummary,
          imageUrl: row.imageUrl,
          imageAltText: row.imageAltText,
          slug: row.slug,
          category: row.category,
          location: row.location,
          market: row.market,
          status: row.status,
          isFeatured: row['isFeatured'],
          viewCount: row['viewCount'],
          publishedAt: row['publishedAt'],
          metadata: row.metadata,
          createdAt: row['createdAt'],
          updatedAt: row['updatedAt'],
          similarity: row.similarity,
          source: {
            id: row['source.id'],
            name: row['source.name'],
            type: row['source.type'],
          },
        }));

        return res.json({
          articles: shaped,
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
        });
      }

      // Fallback: keyword search on title/blurb if embedding failed
      const keywordOr = [
        { title: { contains: search, mode: 'insensitive' } },
        { shortBlurb: { contains: search, mode: 'insensitive' } },
      ];
      if (applyCountryFilter) {
        // country filter already set where.OR — combine both via AND
        where.AND = [
          { OR: where.OR },
          { OR: keywordOr },
        ];
        delete where.OR;
      } else {
        where.OR = keywordOr;
      }
    }

    const orderBy = sort === 'newest' ? [{ isFeatured: 'desc' }, { publishedAt: 'desc' }] : [{ publishedAt: 'desc' }];

    const [articles, total] = await Promise.all([
      req.prisma.article.findMany({
        where,
        select: ARTICLE_SELECT,
        orderBy,
        skip,
        take: limitNum,
      }),
      req.prisma.article.count({ where }),
    ]);

    return res.json({
      articles,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('[Articles] Error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/articles/search-overview
router.get('/search-overview', async (req, res) => {
  try {
    const { search, country } = req.query;

    if (!search) {
      return res.status(400).json({ error: 'search query parameter is required' });
    }

    const countryUpper = country && VALID_COUNTRIES.includes(country.toUpperCase()) ? country.toUpperCase() : null;
    const applyCountryFilter = countryUpper && countryUpper !== 'GLOBAL';

    let embedding;
    try {
      embedding = await generateEmbedding(search);
    } catch (err) {
      console.error('[SearchOverview] Embedding generation failed:', err.message);
      return res.json({ overview: null, articles: [], query: search });
    }

    const embeddingStr = `[${embedding.join(',')}]`;

    const filterClauses = [`a.status = 'PUBLISHED'`, `a.embedding IS NOT NULL`];
    const filterValues = [embeddingStr];
    let paramIdx = 2;

    if (applyCountryFilter) {
      filterClauses.push(`($${paramIdx} = ANY(a.markets) OR 'ALL' = ANY(a.markets))`);
      filterValues.push(countryUpper);
      paramIdx++;
    }

    const whereClause = filterClauses.join(' AND ');

    const articles = await req.prisma.$queryRawUnsafe(
      `SELECT
        a.id, a.source_id as "sourceId", a.source_url as "sourceUrl",
        a.title, a.short_blurb as "shortBlurb", a.long_summary as "longSummary",
        a.image_url as "imageUrl", a.image_alt_text as "imageAltText",
        a.slug, a.category, a.location, a.market, a.status,
        a.is_featured as "isFeatured", a.view_count as "viewCount",
        a.published_at as "publishedAt", a.metadata,
        a.created_at as "createdAt", a.updated_at as "updatedAt",
        s.id as "source.id", s.name as "source.name", s.type as "source.type",
        1 - (a.embedding <=> $1::vector) as similarity
      FROM articles a
      LEFT JOIN ingestion_sources s ON s.id = a.source_id
      WHERE ${whereClause}
      ORDER BY a.embedding <=> $1::vector
      LIMIT 10`,
      ...filterValues
    );

    const shapedArticles = articles.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      sourceUrl: row.sourceUrl,
      title: row.title,
      shortBlurb: row.shortBlurb,
      longSummary: row.longSummary,
      imageUrl: row.imageUrl,
      imageAltText: row.imageAltText,
      slug: row.slug,
      category: row.category,
      location: row.location,
      market: row.market,
      status: row.status,
      isFeatured: row['isFeatured'],
      viewCount: row['viewCount'],
      publishedAt: row['publishedAt'],
      metadata: row.metadata,
      createdAt: row['createdAt'],
      updatedAt: row['updatedAt'],
      similarity: row.similarity,
      source: {
        id: row['source.id'],
        name: row['source.name'],
        type: row['source.type'],
      },
    }));

    const context = shapedArticles
      .map((a) => `- ${a.title}: ${a.shortBlurb}`)
      .join('\n');

    let overview = null;
    try {
      const systemPrompt = 'You are a property market analyst. Based on the provided article summaries, give a brief factual overview responding to the user\'s query. Maximum 150 words. Reference specific trends or data points from the articles.';
      const userPrompt = `Query: "${search}"\n\nArticles:\n${context}`;

      let result = await aiProviderService.generateText('article-summarisation', userPrompt, {
        systemPrompt,
        maxTokens: 1024,
      });

      if (result.text && result.text.split(/\s+/).length > 150) {
        const retryPrompt = userPrompt + '\n\nIMPORTANT: Your previous response exceeded 150 words. Respond in under 150 words.';
        result = await aiProviderService.generateText('article-summarisation', retryPrompt, {
          systemPrompt,
          maxTokens: 1024,
        });
      }

      overview = result.text;
      console.log(`[SearchOverview] AI response: ${result.text?.length} chars, ${result.text?.split(/\s+/).length} words, provider: ${result.provider}/${result.model}`);
    } catch (err) {
      console.error('[SearchOverview] AI generation failed:', err.message);
    }

    return res.json({ overview, articles: shapedArticles, query: search });
  } catch (error) {
    console.error('[SearchOverview] Error:', error);
    res.status(500).json({ error: 'Failed to generate search overview' });
  }
});

// GET /api/articles/trending
router.get('/trending', async (req, res) => {
  try {
    const { country, limit = 10 } = req.query;

    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const countryUpper = country && VALID_COUNTRIES.includes(country.toUpperCase()) ? country.toUpperCase() : null;
    const applyCountryFilter = countryUpper && countryUpper !== 'GLOBAL';

    const where = { status: 'PUBLISHED' };

    if (applyCountryFilter) {
      where.OR = [
        { markets: { has: countryUpper } },
        { markets: { has: 'ALL' } },
      ];
    }

    const articles = await req.prisma.article.findMany({
      where,
      select: ARTICLE_SELECT,
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: limitNum,
    });

    return res.json({ articles });
  } catch (error) {
    console.error('[Trending Articles] Error:', error);
    res.status(500).json({ error: 'Failed to fetch trending articles' });
  }
});

// GET /api/articles/:slug/related
router.get('/:slug/related', async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=3600');
  try {
    const { slug } = req.params;

    const article = await req.prisma.$queryRaw`
      SELECT id, embedding::text IS NOT NULL as has_embedding
      FROM articles
      WHERE slug = ${slug} AND status = 'PUBLISHED'
      LIMIT 1
    `;

    if (!article.length) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const articleId = article[0].id;

    const related = await req.prisma.$queryRaw`
      SELECT
        a.id, a.source_id as "sourceId", a.source_url as "sourceUrl",
        a.title, a.short_blurb as "shortBlurb", a.long_summary as "longSummary",
        a.image_url as "imageUrl", a.image_alt_text as "imageAltText",
        a.slug, a.category, a.location, a.market, a.status,
        a.is_featured as "isFeatured", a.view_count as "viewCount",
        a.published_at as "publishedAt", a.metadata,
        a.created_at as "createdAt", a.updated_at as "updatedAt"
      FROM articles a
      WHERE
        a.status = 'PUBLISHED'
        AND a.id != ${articleId}
        AND a.embedding IS NOT NULL
      ORDER BY a.embedding <=> (
        SELECT embedding FROM articles WHERE id = ${articleId}
      )
      LIMIT 5
    `;

    return res.json({ articles: related });
  } catch (error) {
    console.error('[Related Articles] Error:', error);
    res.status(500).json({ error: 'Failed to fetch related articles' });
  }
});

// GET /api/articles/:slug
router.get('/:slug', async (req, res) => {
  res.set('Cache-Control', 'public, s-maxage=3600');
  try {
    const { slug } = req.params;

    const article = await req.prisma.article.findUnique({
      where: { slug },
      select: ARTICLE_SELECT,
    });

    if (!article || article.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Article not found' });
    }

    await req.prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    return res.json(article);
  } catch (error) {
    console.error('[Article Detail] Error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

module.exports = router;
