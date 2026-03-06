vi.mock('axios');

import axios from 'axios';
import { fetch } from '../../services/fetchers/perplexityFetcher';

describe('perplexityFetcher', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PERPLEXITY_API_KEY: 'test-perplexity-key' };
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws if searchQueries are missing', async () => {
    await expect(fetch({ searchQueries: [] })).rejects.toThrow('Perplexity source config missing searchQueries');
  });

  it('throws if searchQueries is not provided', async () => {
    await expect(fetch({})).rejects.toThrow('Perplexity source config missing searchQueries');
  });

  it('throws if PERPLEXITY_API_KEY is not set', async () => {
    delete process.env.PERPLEXITY_API_KEY;
    await expect(fetch({ searchQueries: ['property market'] })).rejects.toThrow('PERPLEXITY_API_KEY not configured');
  });

  it('returns empty array when response has no content', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: { choices: [{ message: { content: null } }] },
    });

    const result = await fetch({ searchQueries: ['property'] });
    expect(result).toEqual([]);
  });

  it('returns empty array when content has no JSON array', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: { choices: [{ message: { content: 'Here is some non-JSON text.' } }] },
    });

    const result = await fetch({ searchQueries: ['property'] });
    expect(result).toEqual([]);
  });

  it('returns empty array when JSON is malformed', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: { choices: [{ message: { content: '[{broken json}]' } }] },
    });

    const result = await fetch({ searchQueries: ['property'] });
    expect(result).toEqual([]);
  });

  it('returns empty array when parsed JSON is not an array', async () => {
    axios.post = vi.fn().mockResolvedValueOnce({
      data: { choices: [{ message: { content: '{"title": "not an array"}' } }] },
    });

    const result = await fetch({ searchQueries: ['property'] });
    expect(result).toEqual([]);
  });

  it('parses and maps articles from valid JSON response', async () => {
    const articles = [
      {
        title: 'Auction clearance rates rise',
        url: 'https://example.com/article-1',
        summary: 'Clearance rates are improving.',
        date: '2024-01-10',
        sourceName: 'Domain',
        author: 'Jane Doe',
        imageUrl: 'https://example.com/img.jpg',
      },
    ];

    axios.post = vi.fn().mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: JSON.stringify(articles) } }],
      },
    });

    const result = await fetch({ searchQueries: ['auction clearance'] });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Auction clearance rates rise',
      url: 'https://example.com/article-1',
      content: 'Clearance rates are improving.',
      date: '2024-01-10',
      sourceName: 'Domain',
      author: 'Jane Doe',
      imageUrl: 'https://example.com/img.jpg',
    });
  });

  it('filters out items missing title or url', async () => {
    const articles = [
      { url: 'https://example.com/a', summary: 'No title' },
      { title: 'No URL', summary: 'Missing URL' },
      { title: 'Valid', url: 'https://example.com/b' },
    ];

    axios.post = vi.fn().mockResolvedValueOnce({
      data: { choices: [{ message: { content: JSON.stringify(articles) } }] },
    });

    const result = await fetch({ searchQueries: ['property'] });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Valid');
  });

  it('uses fallback values for missing optional fields', async () => {
    const articles = [{ title: 'Minimal Article', url: 'https://example.com/a' }];

    axios.post = vi.fn().mockResolvedValueOnce({
      data: { choices: [{ message: { content: JSON.stringify(articles) } }] },
    });

    const [article] = await fetch({ searchQueries: ['property'] });
    expect(article.content).toBe('');
    expect(article.imageUrl).toBeNull();
    expect(article.date).toBeNull();
    expect(article.author).toBeNull();
    expect(article.sourceName).toBe('Perplexity');
  });

  it('parses JSON embedded in prose text', async () => {
    const articles = [{ title: 'Embedded', url: 'https://example.com/a' }];
    const content = `Here are the results:\n${JSON.stringify(articles)}\nEnd of results.`;

    axios.post = vi.fn().mockResolvedValueOnce({
      data: { choices: [{ message: { content } }] },
    });

    const result = await fetch({ searchQueries: ['property'] });
    expect(result).toHaveLength(1);
  });

  it('aggregates articles across multiple queries', async () => {
    const articles1 = [{ title: 'Article 1', url: 'https://example.com/1' }];
    const articles2 = [{ title: 'Article 2', url: 'https://example.com/2' }];

    axios.post = vi.fn()
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: JSON.stringify(articles1) } }] } })
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: JSON.stringify(articles2) } }] } });

    const result = await fetch({ searchQueries: ['query1', 'query2'] });
    expect(result).toHaveLength(2);
    expect(result.map(a => a.title)).toEqual(['Article 1', 'Article 2']);
  });

  it('throws auth error on 401', async () => {
    const err = new Error('Unauthorized');
    err.response = { status: 401 };
    axios.post = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ searchQueries: ['property'] })).rejects.toThrow('Perplexity authentication failed (401)');
  });

  it('throws rate limit error on 429', async () => {
    const err = new Error('Rate limited');
    err.response = { status: 429 };
    axios.post = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ searchQueries: ['property'] })).rejects.toThrow('Perplexity rate limit exceeded (429)');
  });

  it('throws server error on 500+', async () => {
    const err = new Error('Internal Server Error');
    err.response = { status: 500 };
    axios.post = vi.fn().mockRejectedValueOnce(err);

    await expect(fetch({ searchQueries: ['property'] })).rejects.toThrow('Perplexity server error (500)');
  });

  it('throws generic error for network failures', async () => {
    axios.post = vi.fn().mockRejectedValueOnce(new Error('Connection refused'));

    await expect(fetch({ searchQueries: ['property'] })).rejects.toThrow('Perplexity request failed: Connection refused');
  });
});
