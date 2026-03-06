vi.mock('axios');

import axios from 'axios';
import { fetch } from '../../services/fetchers/newsApiAiFetcher';

describe('newsApiAiFetcher', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NEWSAPI_AI_KEY: 'test-ai-key' };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if keywords are missing', async () => {
    await expect(fetch({ keywords: [] })).rejects.toThrow('NewsAPI.ai source config missing keywords');
  });

  it('throws if keywords are not provided', async () => {
    await expect(fetch({})).rejects.toThrow('NewsAPI.ai source config missing keywords');
  });

  it('throws if NEWSAPI_AI_KEY is not set', async () => {
    delete process.env.NEWSAPI_AI_KEY;
    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('NEWSAPI_AI_KEY not configured');
  });

  it('returns empty array when articles is empty', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: { articles: { results: [] } },
    });

    const result = await fetch({ keywords: ['property'] });
    expect(result).toEqual([]);
  });

  it('returns empty array when articles results is undefined', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: {},
    });

    const result = await fetch({ keywords: ['property'] });
    expect(result).toEqual([]);
  });

  it('maps articles to expected shape', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        articles: {
          results: [
            {
              title: 'Sydney Housing Market Update',
              url: 'https://example.com/article',
              body: 'Full article body.',
              image: 'https://example.com/img.jpg',
              dateTimePub: '2024-01-15T10:00:00Z',
              authors: [{ name: 'Jane Smith' }],
              source: { title: 'Domain' },
            },
          ],
        },
      },
    });

    const result = await fetch({ keywords: ['property'] });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Sydney Housing Market Update',
      url: 'https://example.com/article',
      content: 'Full article body.',
      imageUrl: 'https://example.com/img.jpg',
      date: '2024-01-15T10:00:00Z',
      author: 'Jane Smith',
      sourceName: 'Domain',
    });
  });

  it('filters out articles missing title or url', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        articles: {
          results: [
            { url: 'https://example.com/a' },
            { title: 'No URL Article' },
            { title: 'Valid', url: 'https://example.com/b' },
          ],
        },
      },
    });

    const result = await fetch({ keywords: ['property'] });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid');
  });

  it('falls back to description when body is missing', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        articles: {
          results: [
            { title: 'Article', url: 'https://example.com/a', description: 'Some description.' },
          ],
        },
      },
    });

    const [article] = await fetch({ keywords: ['property'] });
    expect(article.content).toBe('Some description.');
  });

  it('falls back to dateTime when dateTimePub is missing', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        articles: {
          results: [
            { title: 'Article', url: 'https://example.com/a', dateTime: '2024-02-01T00:00:00Z' },
          ],
        },
      },
    });

    const [article] = await fetch({ keywords: ['property'] });
    expect(article.date).toBe('2024-02-01T00:00:00Z');
  });

  it('uses fallback sourceName when source title is missing', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        articles: {
          results: [
            { title: 'Article', url: 'https://example.com/a' },
          ],
        },
      },
    });

    const [article] = await fetch({ keywords: ['property'] });
    expect(article.sourceName).toBe('NewsAPI.ai');
  });

  it('sets author to null when authors array is empty', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        articles: {
          results: [
            { title: 'Article', url: 'https://example.com/a', authors: [] },
          ],
        },
      },
    });

    const [article] = await fetch({ keywords: ['property'] });
    expect(article.author).toBeNull();
  });

  it('includes categories in request when provided', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: { articles: { results: [] } },
    });

    await fetch({ keywords: ['property'], categories: ['cat1', 'cat2'] });

    const body = axios.post.mock.calls[0][1];
    expect(body.categoryUri).toEqual(['cat1', 'cat2']);
  });

  it('includes sourceLocations in request when provided', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: { articles: { results: [] } },
    });

    await fetch({ keywords: ['property'], sourceLocations: ['http://en.wikipedia.org/wiki/Australia'] });

    const body = axios.post.mock.calls[0][1];
    expect(body.sourceLocationUri).toEqual(['http://en.wikipedia.org/wiki/Australia']);
  });

  it('throws auth error on 401', async () => {
    const err = new Error('Unauthorized');
    err.response = { status: 401 };
    axios.post = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('authentication failed (401)');
  });

  it('throws rate limit error on 429', async () => {
    const err = new Error('Rate limited');
    err.response = { status: 429 };
    axios.post = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('rate limit exceeded (429)');
  });

  it('throws server error on 500+', async () => {
    const err = new Error('Server error');
    err.response = { status: 503 };
    axios.post = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('server error (503)');
  });

  it('throws generic error for network failures', async () => {
    axios.post = vi.fn().mockRejectedValueOnce(new Error('Socket hang up'));

    await expect(fetch({ keywords: ['property'] })).rejects.toThrow('NewsAPI.ai request failed: Socket hang up');
  });
});
