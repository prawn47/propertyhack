/**
 * Auth route integration tests.
 *
 * Server source files use CJS (require). vi.mock() for ESM cannot intercept
 * CJS require() calls into node_modules. We patch require.cache directly so
 * the CJS jsonwebtoken mock is in place before any route/middleware loads.
 */
import { createRequire } from 'module';
import bcrypt from 'bcrypt';

const _require = createRequire(import.meta.url);

// ── Patch jsonwebtoken in require.cache ──────────────────────────────────────
// Must happen before any CJS module that calls require('jsonwebtoken') is loaded.

vi.hoisted(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});

const mockJwtVerify = vi.fn((token) => {
  if (token === 'valid-refresh-token') return { userId: 'user-1' };
  const err = new Error('invalid token');
  err.name = 'JsonWebTokenError';
  throw err;
});
const mockJwtSign = vi.fn(() => 'mock-token');

function patchJwt() {
  const jwtPath = _require.resolve('jsonwebtoken');
  const realJwt = _require.cache[jwtPath]
    ? _require.cache[jwtPath].exports
    : _require('jsonwebtoken');
  _require.cache[jwtPath] = {
    id: jwtPath,
    filename: jwtPath,
    loaded: true,
    exports: { ...realJwt, verify: mockJwtVerify, sign: mockJwtSign },
  };
}

// ── Build minimal Express app ─────────────────────────────────────────────────

let express, supertest, authRoutes;

function buildApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/auth', authRoutes);
  return app;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  patchJwt();

  // Delete cached modules so they re-load with the patched jwt
  const authMiddlewarePath = _require.resolve('../../middleware/auth.js');
  const authRoutesPath = _require.resolve('../../routes/auth.js');
  delete _require.cache[authMiddlewarePath];
  delete _require.cache[authRoutesPath];

  express = (await import('express')).default;
  supertest = (await import('supertest')).default;

  authRoutes = _require('../../routes/auth.js');
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app;
  let mockPrisma;
  const passwordHash = bcrypt.hashSync('correct-password', 1);

  const adminUser = {
    id: 'user-1',
    email: 'admin@test.com',
    passwordHash,
    superAdmin: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockJwtVerify.mockClear();
    mockJwtSign.mockClear();
    mockJwtSign.mockReturnValue('mock-token');
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 400 when email is missing', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ password: 'somepassword' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns 400 when password is missing', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns 401 when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('returns 401 when password is wrong', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);

    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('returns 403 when user is not a super admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...adminUser, superAdmin: false });

    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'correct-password' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Admin access required');
  });

  it('returns 200 with tokens on valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);

    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user.email).toBe('admin@test.com');
  });
});

describe('POST /api/auth/refresh', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockJwtVerify.mockClear();
    mockJwtSign.mockClear();
    mockJwtSign.mockReturnValue('mock-token');
    // Reset verify to default behaviour
    mockJwtVerify.mockImplementation((token) => {
      if (token === 'valid-refresh-token') return { userId: 'user-1' };
      const err = new Error('invalid token');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 when refresh token is missing', async () => {
    const res = await supertest(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 401 when refresh token is invalid', async () => {
    const res = await supertest(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'bad-token' });

    expect(res.status).toBe(401);
  });

  it('returns new tokens when refresh token is valid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      superAdmin: true,
    });

    const res = await supertest(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });
});

describe('POST /api/auth/logout', () => {
  let app;

  beforeEach(() => {
    app = buildApp({});
  });

  it('returns 200 with success message', async () => {
    const res = await supertest(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Logged out successfully');
  });
});
