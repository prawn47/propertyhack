/**
 * henryService tests
 *
 * henryService.js imports GoogleGenerativeAI at module load time (CJS).
 * We patch require.cache before loading the service, following the same
 * pattern used in articleSummaryService.test.js.
 *
 * Also patches embeddingService and henryTools to avoid real API calls.
 */

import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

vi.hoisted(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.HENRY_MAX_ARTICLES = '10';
  process.env.HENRY_SIMILARITY_THRESHOLD = '0.3';
  process.env.HENRY_MAX_HISTORY_MESSAGES = '20';
});

// Gemini mock state
const mockSendMessageStream = vi.fn();
const mockStartChat = vi.fn().mockReturnValue({ sendMessageStream: mockSendMessageStream });
const mockGetGenerativeModel = vi.fn().mockReturnValue({ startChat: mockStartChat });

// Embedding mock
const mockGenerateEmbedding = vi.fn();

// Tool mock
const mockExecuteToolCall = vi.fn();
const mockGetToolDefinitions = vi.fn().mockReturnValue([]);

let streamResponse;
let retrieveArticles;

beforeAll(() => {
  // Patch @google/generative-ai
  const geminiPath = _require.resolve('@google/generative-ai');
  const MockGoogleGenerativeAI = function () {
    this.getGenerativeModel = mockGetGenerativeModel;
  };
  _require.cache[geminiPath] = {
    id: geminiPath,
    filename: geminiPath,
    loaded: true,
    exports: { GoogleGenerativeAI: MockGoogleGenerativeAI },
  };

  // Patch embeddingService
  const embeddingPath = _require.resolve('../../services/embeddingService.js');
  _require.cache[embeddingPath] = {
    id: embeddingPath,
    filename: embeddingPath,
    loaded: true,
    exports: { generateEmbedding: mockGenerateEmbedding },
  };

  // Patch henryTools — service imports getToolDefinitions (note: tools file exports
  // getToolDeclarations but service uses getToolDefinitions — we provide it here)
  const toolsPath = _require.resolve('../../services/henryTools.js');
  _require.cache[toolsPath] = {
    id: toolsPath,
    filename: toolsPath,
    loaded: true,
    exports: {
      getToolDefinitions: mockGetToolDefinitions,
      getToolDeclarations: mockGetToolDefinitions,
      executeToolCall: mockExecuteToolCall,
    },
  };

  // Patch henryPrompts to use real implementation (pure functions, no side effects)
  // Load it fresh after gemini is patched
  const promptsPath = _require.resolve('../../services/henryPrompts.js');
  delete _require.cache[promptsPath];
  _require(promptsPath); // load with patched gemini

  // Now load henryService
  const svcPath = _require.resolve('../../services/henryService.js');
  delete _require.cache[svcPath];
  const svc = _require('../../services/henryService.js');
  streamResponse = svc.streamResponse;
  retrieveArticles = svc.retrieveArticles;
});

function makeChunk(text) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
    usageMetadata: { totalTokenCount: 10 },
  };
}

async function* yieldChunks(chunks) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function makeMockPrisma(overrides = {}) {
  return {
    message: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'msg_test_123' }),
      count: vi.fn().mockResolvedValue(2),
    },
    conversation: {
      update: vi.fn().mockResolvedValue({}),
    },
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('streamResponse — event sequence', () => {
  beforeEach(() => {
    mockGenerateEmbedding.mockReset();
    mockSendMessageStream.mockReset();
    mockStartChat.mockReset();
    mockGetGenerativeModel.mockReset();

    mockGenerateEmbedding.mockResolvedValue(new Array(1536).fill(0.1));

    const stream = yieldChunks([
      makeChunk('Based on recent articles'),
      makeChunk(', prices are rising.'),
    ]);
    mockSendMessageStream.mockResolvedValue({ stream });
    mockStartChat.mockReturnValue({ sendMessageStream: mockSendMessageStream });
    mockGetGenerativeModel.mockReturnValue({ startChat: mockStartChat });
  });

  it('yields thinking event first', async () => {
    const prisma = makeMockPrisma();
    const gen = streamResponse({ message: 'What is the market doing?', prisma });
    const first = await gen.next();
    expect(first.value.event).toBe('thinking');
  });

  it('yields delta events with text', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'Tell me about Sydney', prisma })) {
      events.push(event);
    }
    const deltas = events.filter(e => e.event === 'delta');
    expect(deltas.length).toBeGreaterThan(0);
    expect(deltas[0].data.text).toBeDefined();
  });

  it('yields done event at end', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'What is stamp duty?', prisma })) {
      events.push(event);
    }
    const lastEvent = events[events.length - 1];
    expect(lastEvent.event).toBe('done');
  });

  it('done event contains citations array', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'Property trends?', prisma })) {
      events.push(event);
    }
    const doneEvent = events.find(e => e.event === 'done');
    expect(doneEvent).toBeDefined();
    expect(Array.isArray(doneEvent.data.citations)).toBe(true);
  });

  it('yields thinking with phase searching_articles', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'House prices?', prisma })) {
      events.push(event);
    }
    const thinkingEvents = events.filter(e => e.event === 'thinking');
    const searchPhase = thinkingEvents.find(e => e.data.phase === 'searching_articles');
    expect(searchPhase).toBeDefined();
  });
});

describe('streamResponse — embedding failure', () => {
  beforeEach(() => {
    mockGenerateEmbedding.mockReset();
    mockSendMessageStream.mockReset();
    mockStartChat.mockReset();
    mockGetGenerativeModel.mockReset();

    // Embedding fails
    mockGenerateEmbedding.mockRejectedValue(new Error('OpenAI quota exceeded'));

    const stream = yieldChunks([makeChunk('General property advice.')]);
    mockSendMessageStream.mockResolvedValue({ stream });
    mockStartChat.mockReturnValue({ sendMessageStream: mockSendMessageStream });
    mockGetGenerativeModel.mockReturnValue({ startChat: mockStartChat });
  });

  it('handles embedding failure gracefully and still yields done', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'What about property?', prisma })) {
      events.push(event);
    }
    const doneEvent = events.find(e => e.event === 'done');
    expect(doneEvent).toBeDefined();
  });

  it('does not yield error event when only embedding fails', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'Property question', prisma })) {
      events.push(event);
    }
    const errorEvents = events.filter(e => e.event === 'error');
    expect(errorEvents).toHaveLength(0);
  });

  it('yields thinking with article_search_skipped phase', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'Sydney market?', prisma })) {
      events.push(event);
    }
    const thinkingEvents = events.filter(e => e.event === 'thinking');
    const skippedPhase = thinkingEvents.find(e => e.data.phase === 'article_search_skipped');
    expect(skippedPhase).toBeDefined();
  });
});

describe('streamResponse — Gemini failure', () => {
  beforeEach(() => {
    mockGenerateEmbedding.mockReset();
    mockSendMessageStream.mockReset();
    mockStartChat.mockReset();
    mockGetGenerativeModel.mockReset();

    mockGenerateEmbedding.mockResolvedValue(new Array(1536).fill(0.1));
    mockSendMessageStream.mockRejectedValue(new Error('Gemini API unavailable'));
    mockStartChat.mockReturnValue({ sendMessageStream: mockSendMessageStream });
    mockGetGenerativeModel.mockReturnValue({ startChat: mockStartChat });
  });

  it('yields error event when Gemini fails', async () => {
    const prisma = makeMockPrisma();
    const events = [];
    for await (const event of streamResponse({ message: 'Question?', prisma })) {
      events.push(event);
    }
    const errorEvents = events.filter(e => e.event === 'error');
    expect(errorEvents.length).toBeGreaterThan(0);
    expect(errorEvents[0].data.message).toBeDefined();
  });
});

describe('retrieveArticles', () => {
  it('calls prisma.$queryRawUnsafe with the embedding', async () => {
    const mockPrisma = makeMockPrisma();
    const embedding = new Array(1536).fill(0.05);
    await retrieveArticles(embedding, { prisma: mockPrisma });
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledOnce();
    const callArg = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
    expect(typeof callArg).toBe('string');
    expect(callArg).toContain('embedding');
  });

  it('returns empty array when prisma returns no rows', async () => {
    const mockPrisma = makeMockPrisma();
    const embedding = new Array(1536).fill(0.05);
    const result = await retrieveArticles(embedding, { prisma: mockPrisma });
    expect(result).toEqual([]);
  });

  it('maps rows to expected shape', async () => {
    const mockPrisma = makeMockPrisma({
      $queryRawUnsafe: vi.fn().mockResolvedValue([
        {
          id: 'art_1',
          title: 'Sydney Auction Results',
          shortBlurb: 'Clearance rates fell.',
          longSummary: 'Detailed analysis.',
          slug: 'sydney-auction-results',
          publishedAt: new Date('2024-01-15'),
          sourceUrl: 'https://domain.com.au/article',
          category: 'property-market',
          market: 'AU',
          similarity: '0.85',
        },
      ]),
    });

    const embedding = new Array(1536).fill(0.05);
    const result = await retrieveArticles(embedding, { prisma: mockPrisma });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('art_1');
    expect(result[0].title).toBe('Sydney Auction Results');
    expect(result[0].similarity).toBe(0.85);
    expect(typeof result[0].similarity).toBe('number');
  });

  it('includes market filter in SQL when market is provided', async () => {
    const mockPrisma = makeMockPrisma();
    const embedding = new Array(1536).fill(0.05);
    await retrieveArticles(embedding, { market: 'AU', prisma: mockPrisma });

    const callArg = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
    expect(callArg).toContain('market');
  });

  it('includes location filter in SQL when location is provided', async () => {
    const mockPrisma = makeMockPrisma();
    const embedding = new Array(1536).fill(0.05);
    await retrieveArticles(embedding, { location: 'Sydney', prisma: mockPrisma });

    const callArg = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
    expect(callArg.toLowerCase()).toContain('location');
  });
});
