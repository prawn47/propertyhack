import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

const mockPrisma = {
  agentApiKey: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
};

// Patch @prisma/client before agentKeyService loads
const prismaClientPath = _require.resolve('@prisma/client');
_require.cache[prismaClientPath] = {
  id: prismaClientPath,
  filename: prismaClientPath,
  loaded: true,
  exports: { PrismaClient: function () { return mockPrisma; } },
};

// Patch bcrypt for speed (avoid real hashing in tests)
const mockBcrypt = {
  hash: vi.fn(async (key) => `hashed_${key}`),
  compare: vi.fn(async (provided, stored) => stored === `hashed_${provided}`),
};
const bcryptPath = _require.resolve('bcrypt');
_require.cache[bcryptPath] = {
  id: bcryptPath,
  filename: bcryptPath,
  loaded: true,
  exports: mockBcrypt,
};

// Force fresh load
const svcPath = _require.resolve('../../services/agentKeyService.js');
delete _require.cache[svcPath];
const agentKeyService = _require('../../services/agentKeyService.js');

describe('agentKeyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateKey', () => {
    it('produces a key with phk_ prefix and 64 chars', async () => {
      const { plainKey, keyHash, keyPrefix } = await agentKeyService.generateKey();
      expect(plainKey).toMatch(/^phk_/);
      expect(plainKey.length).toBe(64);
      expect(keyPrefix).toBe(plainKey.substring(0, 12));
      expect(keyHash).toBe(`hashed_${plainKey}`);
    });
  });

  describe('createKey', () => {
    it('stores a key and returns plainKey', async () => {
      const mockRecord = { id: 'key-1', name: 'test-key', scopes: ['read'], isActive: true };
      mockPrisma.agentApiKey.create.mockResolvedValue(mockRecord);

      const result = await agentKeyService.createKey('test-key', ['read'], null);

      expect(result.plainKey).toMatch(/^phk_/);
      expect(result.id).toBe('key-1');
      expect(result.name).toBe('test-key');
      expect(mockPrisma.agentApiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'test-key',
          scopes: ['read'],
          expiresAt: null,
        }),
      });
    });
  });

  describe('validateKey', () => {
    it('matches a valid key', async () => {
      const plainKey = 'phk_abcdefgh' + 'x'.repeat(52);
      const keyRecord = {
        id: 'key-1',
        keyPrefix: plainKey.substring(0, 12),
        keyHash: `hashed_${plainKey}`,
        isActive: true,
      };
      mockPrisma.agentApiKey.findMany.mockResolvedValue([keyRecord]);

      const result = await agentKeyService.validateKey(plainKey);
      expect(result).toEqual(keyRecord);
    });

    it('returns null for invalid key', async () => {
      mockPrisma.agentApiKey.findMany.mockResolvedValue([]);

      const result = await agentKeyService.validateKey('phk_invalid_key_here');
      expect(result).toBeNull();
    });

    it('returns null for short or empty key', async () => {
      expect(await agentKeyService.validateKey('')).toBeNull();
      expect(await agentKeyService.validateKey(null)).toBeNull();
      expect(await agentKeyService.validateKey('short')).toBeNull();
    });
  });

  describe('revokeKey', () => {
    it('sets isActive to false', async () => {
      const revokedRecord = { id: 'key-1', isActive: false };
      mockPrisma.agentApiKey.update.mockResolvedValue(revokedRecord);

      const result = await agentKeyService.revokeKey('key-1');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.agentApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { isActive: false },
      });
    });
  });

  describe('validateKey after revoke', () => {
    it('returns null for revoked key', async () => {
      // findMany returns no active keys (since key was revoked)
      mockPrisma.agentApiKey.findMany.mockResolvedValue([]);

      const result = await agentKeyService.validateKey('phk_revokedkey_padding');
      expect(result).toBeNull();
    });
  });
});
