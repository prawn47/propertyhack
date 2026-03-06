const { describe, it, expect, vi, beforeEach } = require('vitest');
const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');

// Mock jsonwebtoken so we control token generation/verification
vi.mock('jsonwebtoken', async () => {
  const actual = await vi.importActual('jsonwebtoken');
  return {
    ...actual,
    verify: vi.fn((token, secret) => {
      if (token === 'valid-refresh-token') return { userId: 'user-1' };
      const err = new Error('invalid token');
      err.name = 'JsonWebTokenError';
      throw err;
    }),
    sign: vi.fn(() => 'mock-token'),
  };
});

const authRoutes = require('../../routes/auth');
const { authenticateRefreshToken } = require('../../middleware/auth');

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
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'somepassword' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns 401 when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('returns 401 when password is wrong', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('returns 403 when user is not a super admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...adminUser, superAdmin: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'correct-password' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Admin access required');
  });

  it('returns 200 with tokens on valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);

    const res = await request(app)
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
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 when refresh token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(401);
  });

  it('returns 401 when refresh token is invalid', async () => {
    const res = await request(app)
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

    const res = await request(app)
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
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Logged out successfully');
  });
});
