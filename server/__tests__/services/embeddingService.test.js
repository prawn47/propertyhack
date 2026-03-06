/**
 * embeddingService tests
 *
 * embeddingService.js is CJS and instantiates `new OpenAI()` at module load
 * time, so vi.mock('openai') cannot intercept it. We patch require.cache
 * directly (same pattern as vectorSearch.test.js) so the mock is in place
 * before the service module is first loaded.
 */

import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
});

const mockEmbeddingsCreate = vi.fn();

let generateEmbedding;

beforeAll(() => {
  // Patch openai in require.cache before embeddingService loads
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

  // Force fresh load of embeddingService so it picks up the patched openai
  const svcPath = _require.resolve('../../services/embeddingService.js');
  delete _require.cache[svcPath];
  const svc = _require('../../services/embeddingService.js');
  generateEmbedding = svc.generateEmbedding;
});

describe('generateEmbedding', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-openai-key' };
    mockEmbeddingsCreate.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(generateEmbedding('some text')).rejects.toThrow('OPENAI_API_KEY not configured');
  });

  it('returns embedding array from OpenAI response', async () => {
    const mockEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);
    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: [{ embedding: mockEmbedding }],
    });

    const result = await generateEmbedding('Property market update for Sydney.');
    expect(result).toEqual(mockEmbedding);
    expect(result).toHaveLength(1536);
  });

  it('calls OpenAI with correct parameters', async () => {
    const mockEmbedding = [0.1, 0.2, 0.3];
    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: [{ embedding: mockEmbedding }],
    });

    await generateEmbedding('Test text for embedding.');

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'Test text for embedding.',
      dimensions: 1536,
    });
  });

  it('truncates input to 30000 characters', async () => {
    const longText = 'x'.repeat(40000);
    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: [{ embedding: [0.1, 0.2] }],
    });

    await generateEmbedding(longText);

    const inputArg = mockEmbeddingsCreate.mock.calls[0][0].input;
    expect(inputArg.length).toBe(30000);
  });

  it('does not truncate input under 30000 characters', async () => {
    const shortText = 'Short text for embedding.';
    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: [{ embedding: [0.1, 0.2] }],
    });

    await generateEmbedding(shortText);

    const inputArg = mockEmbeddingsCreate.mock.calls[0][0].input;
    expect(inputArg).toBe(shortText);
  });

  it('propagates OpenAI API errors', async () => {
    mockEmbeddingsCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'));

    await expect(generateEmbedding('Some text')).rejects.toThrow('Rate limit exceeded');
  });

  it('propagates OpenAI authentication errors', async () => {
    mockEmbeddingsCreate.mockRejectedValueOnce(new Error('401 Unauthorized'));

    await expect(generateEmbedding('Some text')).rejects.toThrow('401 Unauthorized');
  });

  it('handles empty string input', async () => {
    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: [{ embedding: [0.0] }],
    });

    const result = await generateEmbedding('');
    expect(result).toEqual([0.0]);
  });
});
