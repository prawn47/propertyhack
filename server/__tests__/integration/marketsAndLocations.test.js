import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

let express, supertest;
let publicMarketsRoutes, publicLocationsRoutes;

function buildApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/markets', publicMarketsRoutes);
  app.use('/api/locations', publicLocationsRoutes);
  return app;
}

beforeAll(async () => {
  express = (await import('express')).default;
  supertest = (await import('supertest')).default;

  publicMarketsRoutes = _require('../../routes/public/markets.js');
  publicLocationsRoutes = _require('../../routes/public/locations.js');
});

const sampleMarkets = [
  { code: 'AU', name: 'Australia', currency: 'AUD', flagEmoji: '🇦🇺' },
  { code: 'CA', name: 'Canada', currency: 'CAD', flagEmoji: '🇨🇦' },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP', flagEmoji: '🇬🇧' },
  { code: 'US', name: 'United States', currency: 'USD', flagEmoji: '🇺🇸' },
];

describe('GET /api/markets', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      market: {
        findMany: vi.fn().mockResolvedValue(sampleMarkets),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns a markets array', async () => {
    const res = await supertest(app).get('/api/markets');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('markets');
    expect(Array.isArray(res.body.markets)).toBe(true);
  });

  it('returns exactly 4 markets (AU, US, UK, CA)', async () => {
    const res = await supertest(app).get('/api/markets');

    expect(res.body.markets).toHaveLength(4);
    const codes = res.body.markets.map((m) => m.code).sort();
    expect(codes).toEqual(['AU', 'CA', 'UK', 'US']);
  });

  it('each market has code, name, currency, and flagEmoji fields', async () => {
    const res = await supertest(app).get('/api/markets');

    for (const market of res.body.markets) {
      expect(market).toHaveProperty('code');
      expect(market).toHaveProperty('name');
      expect(market).toHaveProperty('currency');
      expect(market).toHaveProperty('flagEmoji');
    }
  });

  it('queries only active markets', async () => {
    await supertest(app).get('/api/markets');

    const [call] = mockPrisma.market.findMany.mock.calls;
    expect(call[0].where).toEqual({ isActive: true });
  });

  it('returns 500 on prisma error', async () => {
    mockPrisma.market.findMany.mockRejectedValue(new Error('db error'));

    const res = await supertest(app).get('/api/markets');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to fetch markets');
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
          { location: 'Brisbane' },
        ]),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns all locations when no country param', async () => {
    const res = await supertest(app).get('/api/locations');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('locations');
    expect(Array.isArray(res.body.locations)).toBe(true);
    expect(res.body.locations).toContain('Sydney');
    expect(res.body.locations).toContain('Melbourne');
  });

  it('does not apply market filter when no country param', async () => {
    await supertest(app).get('/api/locations');

    const [call] = mockPrisma.article.findMany.mock.calls;
    expect(call[0].where).not.toHaveProperty('market');
  });

  it('returns all locations when country=GLOBAL', async () => {
    const res = await supertest(app).get('/api/locations?country=GLOBAL');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.locations)).toBe(true);

    const [call] = mockPrisma.article.findMany.mock.calls;
    expect(call[0].where).not.toHaveProperty('market');
  });

  it('filters by AU market when country=AU', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      { location: 'Sydney' },
      { location: 'Melbourne' },
    ]);

    const res = await supertest(app).get('/api/locations?country=AU');

    expect(res.status).toBe(200);
    expect(res.body.locations).toContain('Sydney');
    expect(res.body.locations).toContain('Melbourne');

    const [call] = mockPrisma.article.findMany.mock.calls;
    expect(call[0].where.market).toBe('AU');
  });

  it('filters by UK market when country=UK', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      { location: 'London' },
      { location: 'Manchester' },
    ]);

    const res = await supertest(app).get('/api/locations?country=UK');

    expect(res.status).toBe(200);
    expect(res.body.locations).toContain('London');
    expect(res.body.locations).toContain('Manchester');

    const [call] = mockPrisma.article.findMany.mock.calls;
    expect(call[0].where.market).toBe('UK');
  });

  it('normalises country param to uppercase', async () => {
    await supertest(app).get('/api/locations?country=au');

    const [call] = mockPrisma.article.findMany.mock.calls;
    expect(call[0].where.market).toBe('AU');
  });

  it('filters out null locations', async () => {
    mockPrisma.article.findMany.mockResolvedValue([
      { location: 'Sydney' },
      { location: null },
    ]);

    const res = await supertest(app).get('/api/locations');

    expect(res.body.locations).not.toContain(null);
  });

  it('returns 500 on prisma error', async () => {
    mockPrisma.article.findMany.mockRejectedValue(new Error('db error'));

    const res = await supertest(app).get('/api/locations');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to fetch locations');
  });
});
