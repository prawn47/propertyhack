import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

vi.hoisted(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.HENRY_MAX_HISTORY_MESSAGES = '20';
});

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

let buildSystemPrompt;
let buildUserContext;
let buildArticleContext;
let buildCalculatorContext;
let formatConversationHistory;

beforeAll(() => {
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

  const svcPath = _require.resolve('../../services/henryPrompts.js');
  delete _require.cache[svcPath];
  const svc = _require('../../services/henryPrompts.js');
  buildSystemPrompt = svc.buildSystemPrompt;
  buildUserContext = svc.buildUserContext;
  buildArticleContext = svc.buildArticleContext;
  buildCalculatorContext = svc.buildCalculatorContext;
  formatConversationHistory = svc.formatConversationHistory;
});

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('contains "Henry"', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Henry');
  });

  it('contains a "not financial advice" disclaimer', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toContain('financial advice');
  });

  it('contains today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(today);
  });

  it('instructs Henry not to mention Gemini or AI model name', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toContain('gemini');
  });

  it('includes tone instructions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toUpperCase()).toContain('TONE');
  });
});

describe('buildUserContext', () => {
  it('returns null for null user', () => {
    expect(buildUserContext(null)).toBeNull();
  });

  it('returns null for user without preferences', () => {
    expect(buildUserContext({ id: 'u1' })).toBeNull();
  });

  it('returns null for user with empty preferences object', () => {
    expect(buildUserContext({ preferences: {} })).toBeNull();
  });

  it('includes location when defaultLocation is set', () => {
    const user = { preferences: { defaultLocation: 'Sydney' } };
    const ctx = buildUserContext(user);
    expect(ctx).not.toBeNull();
    expect(ctx).toContain('Sydney');
  });

  it('includes market when defaultCountry is set', () => {
    const user = { preferences: { defaultCountry: 'AU' } };
    const ctx = buildUserContext(user);
    expect(ctx).toContain('Australia');
    expect(ctx).toContain('AU');
  });

  it('includes categories when defaultCategories is set', () => {
    const user = { preferences: { defaultCategories: ['investment', 'residential'] } };
    const ctx = buildUserContext(user);
    expect(ctx).toContain('investment');
    expect(ctx).toContain('residential');
  });

  it('includes all preference fields when all are set', () => {
    const user = {
      preferences: {
        defaultLocation: 'Melbourne',
        defaultCountry: 'AU',
        defaultCategories: ['commercial'],
      },
    };
    const ctx = buildUserContext(user);
    expect(ctx).toContain('Melbourne');
    expect(ctx).toContain('Australia');
    expect(ctx).toContain('commercial');
  });

  it('starts with USER CONTEXT header', () => {
    const user = { preferences: { defaultLocation: 'Brisbane' } };
    const ctx = buildUserContext(user);
    expect(ctx).toContain('USER CONTEXT');
  });

  it('returns null when defaultCategories is an empty array', () => {
    const user = { preferences: { defaultCategories: [] } };
    expect(buildUserContext(user)).toBeNull();
  });
});

describe('buildArticleContext', () => {
  it('returns null for empty array', () => {
    expect(buildArticleContext([])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(buildArticleContext(null)).toBeNull();
  });

  it('formats articles with numbered references', () => {
    const articles = [
      {
        title: 'Sydney House Prices Rise',
        publishedAt: new Date('2024-01-15'),
        category: 'residential',
        slug: 'sydney-house-prices-rise',
        longSummary: 'Prices climbed 5% in Q1.',
      },
      {
        title: 'Melbourne Auctions Slow',
        publishedAt: new Date('2024-01-10'),
        category: 'property-market',
        slug: 'melbourne-auctions-slow',
        shortBlurb: 'Clearance rates fell.',
      },
    ];

    const ctx = buildArticleContext(articles);
    expect(ctx).toContain('[1]');
    expect(ctx).toContain('[2]');
    expect(ctx).toContain('Sydney House Prices Rise');
    expect(ctx).toContain('Melbourne Auctions Slow');
  });

  it('includes article category', () => {
    const articles = [
      { title: 'Test', category: 'investment', publishedAt: null, slug: null, longSummary: '' },
    ];
    const ctx = buildArticleContext(articles);
    expect(ctx).toContain('investment');
  });

  it('uses longSummary when available', () => {
    const articles = [
      {
        title: 'Test Article',
        longSummary: 'Detailed long summary here.',
        shortBlurb: 'Short blurb.',
        publishedAt: null,
        category: 'general',
        slug: null,
      },
    ];
    const ctx = buildArticleContext(articles);
    expect(ctx).toContain('Detailed long summary here.');
  });

  it('falls back to shortBlurb when longSummary is absent', () => {
    const articles = [
      {
        title: 'Test Article',
        shortBlurb: 'Short blurb.',
        publishedAt: null,
        category: 'general',
        slug: null,
      },
    ];
    const ctx = buildArticleContext(articles);
    expect(ctx).toContain('Short blurb.');
  });

  it('builds a propertyhack.com.au URL from slug', () => {
    const articles = [
      { title: 'Test', slug: 'test-slug', publishedAt: null, category: 'general' },
    ];
    const ctx = buildArticleContext(articles);
    expect(ctx).toContain('propertyhack.com.au/articles/test-slug');
  });

  it('starts with RELEVANT ARTICLES header', () => {
    const articles = [{ title: 'X', publishedAt: null, category: 'general', slug: null }];
    const ctx = buildArticleContext(articles);
    expect(ctx).toContain('RELEVANT ARTICLES FROM PROPERTYHACK');
  });
});

describe('formatConversationHistory', () => {
  it('returns empty array for null input', () => {
    expect(formatConversationHistory(null)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(formatConversationHistory([])).toEqual([]);
  });

  it('filters to user and assistant roles only', () => {
    const messages = [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Assistant message' },
      { role: 'function', content: 'Function result' },
    ];
    const result = formatConversationHistory(messages);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
  });

  it('limits to last 20 messages', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));
    const result = formatConversationHistory(messages);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('returns the most recent messages when trimming', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }));
    const result = formatConversationHistory(messages);
    // Last 20: indices 10..29
    expect(result[result.length - 1].content).toBe('Message 29');
    expect(result[0].content).toBe('Message 10');
  });

  it('maps content correctly', () => {
    const messages = [
      { role: 'user', content: 'Hello Henry' },
      { role: 'assistant', content: 'Hello there' },
    ];
    const result = formatConversationHistory(messages);
    expect(result[0]).toEqual({ role: 'user', content: 'Hello Henry' });
    expect(result[1]).toEqual({ role: 'assistant', content: 'Hello there' });
  });
});
