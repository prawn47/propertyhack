/**
 * Henry API route integration tests.
 *
 * Server source files use CJS (require). We patch require.cache for jsonwebtoken
 * so the mock is in place before routes load. henryService is also mocked to
 * avoid real Gemini/OpenAI calls. Prisma is injected via req.prisma mock.
 */
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// ── Environment ───────────────────────────────────────────────────────────────

vi.hoisted(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});

// ── Mock jsonwebtoken in require.cache ────────────────────────────────────────

const mockJwtVerify = vi.fn();
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

// ── Mock henryService in require.cache ────────────────────────────────────────

const mockStreamResponse = vi.fn();

function patchHenryService() {
  const servicePath = _require.resolve('../../services/henryService.js');
  _require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: { streamResponse: mockStreamResponse },
  };
}

// ── Shared test data ──────────────────────────────────────────────────────────

const testUser = {
  id: 'user-1',
  email: 'user@test.com',
  superAdmin: false,
  preferences: null,
  createdAt: new Date().toISOString(),
};

const otherUser = {
  id: 'user-2',
  email: 'other@test.com',
  superAdmin: false,
  preferences: null,
  createdAt: new Date().toISOString(),
};

// Token that jwt.verify will accept as belonging to testUser
const VALID_TOKEN = 'valid-token';
const OTHER_TOKEN = 'other-token';

// ── Lazy-loaded modules (after patches applied) ───────────────────────────────

let express, supertest, henryRoutes;

function buildApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/henry', henryRoutes);
  return app;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  patchJwt();
  patchHenryService();

  // Clear cached route so it re-loads with patched deps
  const routePath = _require.resolve('../../routes/henry.js');
  delete _require.cache[routePath];

  express = (await import('express')).default;
  supertest = (await import('supertest')).default;
  henryRoutes = _require('../../routes/henry.js');
});

beforeEach(() => {
  mockJwtVerify.mockReset();
  mockJwtVerify.mockImplementation((token) => {
    if (token === VALID_TOKEN) return { userId: 'user-1' };
    if (token === OTHER_TOKEN) return { userId: 'user-2' };
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/henry/chat
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/henry/chat', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockStreamResponse.mockClear();

    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    app = buildApp(mockPrisma);

    // Default: generator that immediately yields a done event
    mockStreamResponse.mockReturnValue(
      (async function* () {
        yield { event: 'done', data: { messageId: null, tokenCount: 0, citations: [] } };
      })()
    );
  });

  it('returns 400 when message is empty', async () => {
    const res = await supertest(app)
      .post('/api/henry/chat')
      .send({ message: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns 400 when message is missing', async () => {
    const res = await supertest(app)
      .post('/api/henry/chat')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns 400 when message exceeds 2000 characters', async () => {
    const res = await supertest(app)
      .post('/api/henry/chat')
      .send({ message: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns SSE stream for a valid message', async () => {
    const res = await supertest(app)
      .post('/api/henry/chat')
      .send({ message: 'What is happening in the Sydney property market?' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });

  it('calls streamResponse with the sanitised message and no user', async () => {
    const message = 'Tell me about property prices';
    await supertest(app)
      .post('/api/henry/chat')
      .send({ message });

    expect(mockStreamResponse).toHaveBeenCalledWith(
      expect.objectContaining({ message, user: null })
    );
  });

  it('strips HTML tags from the message before forwarding', async () => {
    const message = '<b>Hello</b>';
    await supertest(app)
      .post('/api/henry/chat')
      .send({ message });

    expect(mockStreamResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: 'Hello' })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/henry/conversations
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/henry/conversations', () => {
  let app;
  let mockPrisma;

  const newConversation = {
    id: 'conv-1',
    title: 'New conversation',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') return Promise.resolve(testUser);
          if (where.id === 'user-2') return Promise.resolve(otherUser);
          return Promise.resolve(null);
        }),
      },
      conversation: {
        create: vi.fn().mockResolvedValue(newConversation),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 without auth token', async () => {
    const res = await supertest(app)
      .post('/api/henry/conversations')
      .send();

    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await supertest(app)
      .post('/api/henry/conversations')
      .set('Authorization', 'Bearer bad-token')
      .send();

    expect(res.status).toBe(401);
  });

  it('creates a conversation and returns id and title', async () => {
    const res = await supertest(app)
      .post('/api/henry/conversations')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send();

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'conv-1');
    expect(res.body).toHaveProperty('title');
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1' }),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/henry/conversations
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/henry/conversations', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') return Promise.resolve(testUser);
          if (where.id === 'user-2') return Promise.resolve(otherUser);
          return Promise.resolve(null);
        }),
      },
      conversation: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 without auth token', async () => {
    const res = await supertest(app).get('/api/henry/conversations');
    expect(res.status).toBe(401);
  });

  it('returns empty array for a user with no conversations', async () => {
    const res = await supertest(app)
      .get('/api/henry/conversations')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('only returns conversations belonging to the authenticated user', async () => {
    const userConversation = {
      id: 'conv-1',
      title: 'My conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPrisma.conversation.findMany.mockResolvedValue([userConversation]);
    mockPrisma.conversation.count.mockResolvedValue(1);

    const res = await supertest(app)
      .get('/api/henry/conversations')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
    expect(res.body.conversations[0].id).toBe('conv-1');

    // Verify the query was scoped to user-1 only
    expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/henry/conversations/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/henry/conversations/:id', () => {
  let app;
  let mockPrisma;

  const userConversation = {
    id: 'conv-1',
    userId: 'user-1',
    title: 'My conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  const otherUserConversation = {
    id: 'conv-2',
    userId: 'user-2',
    title: "Other user's conversation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') return Promise.resolve(testUser);
          if (where.id === 'user-2') return Promise.resolve(otherUser);
          return Promise.resolve(null);
        }),
      },
      conversation: {
        findUnique: vi.fn(),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 without auth token', async () => {
    const res = await supertest(app).get('/api/henry/conversations/conv-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent conversation', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    const res = await supertest(app)
      .get('/api/henry/conversations/does-not-exist')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 when accessing another user's conversation", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(otherUserConversation);

    const res = await supertest(app)
      .get('/api/henry/conversations/conv-2')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    // Route returns 404 (not 403) to avoid leaking existence info
    expect(res.status).toBe(404);
  });

  it("returns the conversation when the user owns it", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(userConversation);

    const res = await supertest(app)
      .get('/api/henry/conversations/conv-1')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('conv-1');
    expect(res.body.messages).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/henry/conversations/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/henry/conversations/:id', () => {
  let app;
  let mockPrisma;

  const userConversation = {
    id: 'conv-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') return Promise.resolve(testUser);
          return Promise.resolve(null);
        }),
      },
      conversation: {
        findUnique: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 without auth token', async () => {
    const res = await supertest(app).delete('/api/henry/conversations/conv-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent conversation', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    const res = await supertest(app)
      .delete('/api/henry/conversations/does-not-exist')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('deletes the conversation and returns 204', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(userConversation);

    const res = await supertest(app)
      .delete('/api/henry/conversations/conv-1')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.conversation.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'conv-1' } })
    );
  });

  it("returns 404 when trying to delete another user's conversation", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-2', userId: 'user-2' });

    const res = await supertest(app)
      .delete('/api/henry/conversations/conv-2')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);

    expect(res.status).toBe(404);
    expect(mockPrisma.conversation.delete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/henry/messages/:id/rating
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/henry/messages/:id/rating', () => {
  let app;
  let mockPrisma;

  const userMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Here is some property info.',
    rating: null,
    conversation: { userId: 'user-1' },
  };

  const updatedMessage = { id: 'msg-1', rating: 5 };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') return Promise.resolve(testUser);
          return Promise.resolve(null);
        }),
      },
      message: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue(updatedMessage),
      },
    };
    app = buildApp(mockPrisma);
  });

  it('returns 401 without auth token', async () => {
    const res = await supertest(app)
      .patch('/api/henry/messages/msg-1/rating')
      .send({ rating: 5 });

    expect(res.status).toBe(401);
  });

  it('accepts a rating of 5 (thumbs up)', async () => {
    mockPrisma.message.findUnique.mockResolvedValue(userMessage);

    const res = await supertest(app)
      .patch('/api/henry/messages/msg-1/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ rating: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rating', 5);
  });

  it('accepts a rating of 1 (thumbs down)', async () => {
    mockPrisma.message.findUnique.mockResolvedValue(userMessage);
    mockPrisma.message.update.mockResolvedValue({ id: 'msg-1', rating: 1 });

    const res = await supertest(app)
      .patch('/api/henry/messages/msg-1/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ rating: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rating', 1);
  });

  it('returns 400 for an invalid rating value (3)', async () => {
    const res = await supertest(app)
      .patch('/api/henry/messages/msg-1/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ rating: 3 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  });

  it('returns 400 for a string rating value', async () => {
    const res = await supertest(app)
      .patch('/api/henry/messages/msg-1/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ rating: 'good' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when rating is missing', async () => {
    const res = await supertest(app)
      .patch('/api/henry/messages/msg-1/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent message', async () => {
    mockPrisma.message.findUnique.mockResolvedValue(null);

    const res = await supertest(app)
      .patch('/api/henry/messages/does-not-exist/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ rating: 5 });

    expect(res.status).toBe(404);
  });

  it("returns 404 when rating a message that belongs to another user's conversation", async () => {
    mockPrisma.message.findUnique.mockResolvedValue({
      ...userMessage,
      id: 'msg-other',
      conversation: { userId: 'user-2' },
    });

    const res = await supertest(app)
      .patch('/api/henry/messages/msg-other/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ rating: 5 });

    expect(res.status).toBe(404);
    expect(mockPrisma.message.update).not.toHaveBeenCalled();
  });
});
