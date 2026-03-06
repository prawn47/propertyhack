const { describe, it, expect, vi, beforeEach, afterEach } = require('vitest');

vi.mock('axios');

const axios = require('axios');
const { fetch } = require('../../services/fetchers/newsApiOrgFetcher');

describe('newsApiOrgFetcher', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NEWSAPI_API_KEY: 'test-key' };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if keywords are missing', async () => {
    await expect(fetch({ keywords: [] })).rejects.toThrow('NewsAPI.org source config missing keywords');
  });

  it('throws if keywords are not provided', async () => {
    await expect(fetch({})).rejects.toThrow('NewsAPI.org source config missing keywords');
  });

  it('throws if NEWSAPI_API_KEY is not set', async () => {
    delete process.env.NEWSAPI_API_KEY;
    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('NEWSAPI_API_KEY environment variable not set');
  });

  it('calls /everything endpoint when no country or category', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: {
        status: 'ok',
        articles: [
          {
            title: 'Property boom continues',
            url: 'https://example.com/article',
            content: 'Full content here.',
            description: 'Description.',
            urlToImage: 'https://example.com/img.jpg',
            publishedAt: '2024-01-01T00:00:00Z',
            author: 'John Doe',
            source: { name: 'The Australian' },
          },
        ],
      },
    });

    const result = await fetch({ keywords: ['property'] });

    const callArgs = axios.get.mock.calls[0];
    expect(callArgs[0]).toBe('https://newsapi.org/v2/everything');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Property boom continues',
      url: 'https://example.com/article',
      content: 'Full content here.',
      imageUrl: 'https://example.com/img.jpg',
      date: '2024-01-01T00:00:00Z',
      author: 'John Doe',
      sourceName: 'The Australian',
    });
  });

  it('calls /top-headlines endpoint when country is set', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: { status: 'ok', articles: [] },
    });

    await fetch({ keywords: ['property'], country: 'au' });

    const callArgs = axios.get.mock.calls[0];
    expect(callArgs[0]).toBe('https://newsapi.org/v2/top-headlines');
  });

  it('calls /top-headlines endpoint when category is set', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: { status: 'ok', articles: [] },
    });

    await fetch({ keywords: ['property'], category: 'business' });

    const callArgs = axios.get.mock.calls[0];
    expect(callArgs[0]).toBe('https://newsapi.org/v2/top-headlines');
  });

  it('throws when API status is not ok', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: { status: 'error', message: 'Invalid API key' },
    });

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('NewsAPI.org error: Invalid API key');
  });

  it('filters out articles with [Removed] in title', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: {
        status: 'ok',
        articles: [
          { title: '[Removed]', url: 'https://example.com/a' },
          { title: 'Good Article', url: 'https://example.com/b' },
        ],
      },
    });

    const result = await fetch({ keywords: ['property'] });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Good Article');
  });

  it('filters out articles with [Removed] in content', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: {
        status: 'ok',
        articles: [
          { title: 'Censored', url: 'https://example.com/a', content: 'This content is [Removed].' },
          { title: 'OK', url: 'https://example.com/b', content: 'Fine content.' },
        ],
      },
    });

    const result = await fetch({ keywords: ['property'] });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('OK');
  });

  it('filters out articles missing title or url', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: {
        status: 'ok',
        articles: [
          { title: null, url: 'https://example.com/a' },
          { title: 'No URL' },
          { title: 'Valid', url: 'https://example.com/b' },
        ],
      },
    });

    const result = await fetch({ keywords: ['property'] });
    expect(result).toHaveLength(1);
  });

  it('falls back to description when content is missing', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: {
        status: 'ok',
        articles: [
          { title: 'Article', url: 'https://example.com/a', description: 'The description.' },
        ],
      },
    });

    const [article] = await fetch({ keywords: ['property'] });
    expect(article.content).toBe('The description.');
  });

  it('uses fallback sourceName when source name is missing', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: {
        status: 'ok',
        articles: [
          { title: 'Article', url: 'https://example.com/a', source: {} },
        ],
      },
    });

    const [article] = await fetch({ keywords: ['property'] });
    expect(article.sourceName).toBe('NewsAPI');
  });

  it('throws rate limit error on 429', async () => {
    const err = new Error('Rate limited');
    err.response = { status: 429 };
    axios.get = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('rate limit exceeded (429)');
  });

  it('throws auth error on 401', async () => {
    const err = new Error('Unauthorized');
    err.response = { status: 401 };
    axios.get = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('authentication failed (401)');
  });

  it('throws server error on 500', async () => {
    const err = new Error('Server error');
    err.response = { status: 500 };
    axios.get = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('server error (500)');
  });

  it('throws generic error for network failures', async () => {
    axios.get = vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('NewsAPI.org request failed: ECONNREFUSED');
  });

  it('caps pageSize at 100', async () => {
    axios.get = vi.fn().mockResolvedValueOnce({
      data: { status: 'ok', articles: [] },
    });

    await fetch({ keywords: ['property'], pageSize: 200 });

    const params = axios.get.mock.calls[0][1].params;
    expect(params.pageSize).toBe(100);
  });
});
