import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

const mockValidateKey = vi.fn();
const mockPrisma = {
  agentApiKey: { update: vi.fn().mockResolvedValue({}) },
  agentAuditLog: { create: vi.fn().mockResolvedValue({}) },
};

// Patch agentKeyService
const agentKeySvcPath = _require.resolve('../../services/agentKeyService.js');
_require.cache[agentKeySvcPath] = {
  id: agentKeySvcPath,
  filename: agentKeySvcPath,
  loaded: true,
  exports: { validateKey: mockValidateKey },
};

// Patch @prisma/client
const prismaClientPath = _require.resolve('@prisma/client');
_require.cache[prismaClientPath] = {
  id: prismaClientPath,
  filename: prismaClientPath,
  loaded: true,
  exports: { PrismaClient: function () { return mockPrisma; } },
};

// Force fresh load
const middlewarePath = _require.resolve('../../middleware/agentAuth.js');
delete _require.cache[middlewarePath];
const { authenticateAgentKey, requireScope, auditLog } = _require('../../middleware/agentAuth.js');

function createMockReqRes(headers = {}, body = {}) {
  const req = {
    headers,
    body,
    method: 'POST',
    originalUrl: '/api/agent/test',
  };
  const res = {
    statusCode: 200,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    _listeners: {},
    on(event, cb) { this._listeners[event] = cb; },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('authenticateAgentKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when X-Agent-Key header is missing', async () => {
    const { req, res, next } = createMockReqRes({});
    await authenticateAgentKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'API key required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid key', async () => {
    mockValidateKey.mockResolvedValue(null);
    const { req, res, next } = createMockReqRes({ 'x-agent-key': 'phk_badkey' });
    await authenticateAgentKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for expired key', async () => {
    const expired = new Date(Date.now() - 86400000); // yesterday
    mockValidateKey.mockResolvedValue({
      id: 'key-1', name: 'test', scopes: ['read'], expiresAt: expired,
    });
    const { req, res, next } = createMockReqRes({ 'x-agent-key': 'phk_expiredkey' });
    await authenticateAgentKey(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'API key expired' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.agentKey for valid key', async () => {
    mockValidateKey.mockResolvedValue({
      id: 'key-1', name: 'my-agent', scopes: ['read', 'write'], expiresAt: null,
    });
    const { req, res, next } = createMockReqRes({ 'x-agent-key': 'phk_validkey' });
    await authenticateAgentKey(req, res, next);

    expect(req.agentKey).toEqual({ id: 'key-1', name: 'my-agent', scopes: ['read', 'write'] });
    expect(next).toHaveBeenCalled();
  });
});

describe('requireScope', () => {
  it('allows matching scope', () => {
    const middleware = requireScope('write');
    const { req, res, next } = createMockReqRes();
    req.agentKey = { id: 'key-1', name: 'test', scopes: ['read', 'write'] };

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 for missing scope', () => {
    const middleware = requireScope('admin');
    const { req, res, next } = createMockReqRes();
    req.agentKey = { id: 'key-1', name: 'test', scopes: ['read'] };

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient scope', required: 'admin' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('auditLog', () => {
  it('creates a log entry on response finish', () => {
    const { req, res, next } = createMockReqRes();
    req.agentKey = { id: 'key-1', name: 'my-agent', scopes: ['read'] };
    req.startTime = Date.now() - 50;

    auditLog(req, res, next);

    expect(next).toHaveBeenCalled();

    // Simulate response finish
    res.statusCode = 200;
    res._listeners['finish']();

    expect(mockPrisma.agentAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentKeyName: 'my-agent',
        method: 'POST',
        path: '/api/agent/test',
        responseStatus: 200,
      }),
    });
  });
});
