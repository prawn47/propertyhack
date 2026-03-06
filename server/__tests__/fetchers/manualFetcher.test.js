import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// ─── Inject axios mock into require.cache before loading the source module ────
const axiosPath = _require.resolve('axios');
let mockAxios = _require.cache[axiosPath]?.exports;
if (!mockAxios || typeof mockAxios.get !== 'function') {
  mockAxios = { get: vi.fn(), post: vi.fn() };
  _require.cache[axiosPath] = {
    id: axiosPath,
    filename: axiosPath,
    loaded: true,
    exports: mockAxios,
  };
}

// ─── Inject cheerio mock into require.cache ───────────────────────────────────
// We use a mutable object so tests can swap in the real cheerio.load when needed.
const mockCheerio = { load: vi.fn() };

const cheerioPath = _require.resolve('cheerio');
_require.cache[cheerioPath] = {
  id: cheerioPath,
  filename: cheerioPath,
  loaded: true,
  exports: mockCheerio,
};

// Force fresh load of fetcher so it picks up both mocks
const fetcherPath = _require.resolve('../../services/fetchers/manualFetcher.js');
delete _require.cache[fetcherPath];
const { fetch } = _require('../../services/fetchers/manualFetcher.js');

// Load the real cheerio.load for tests that need actual HTML parsing
import * as realCheerio from 'cheerio';

describe('manualFetcher', () => {
  beforeEach(() => {
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();
    // Reset cheerio.load back to a fresh vi.fn() each test (some tests swap in real cheerio)
    mockCheerio.load = vi.fn();
  });

  it('returns article directly when title and content are provided', async () => {
    const result = await fetch({
      title: 'Manual Article',
      content: 'This is the full content.',
      url: 'https://example.com/manual',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Manual Article',
      content: 'This is the full content.',
      url: 'https://example.com/manual',
      imageUrl: null,
      author: null,
      sourceName: 'Manual Entry',
    });
    expect(result[0].date).toBeDefined();
  });

  it('returns article with empty url when title and content provided without url', async () => {
    const result = await fetch({ title: 'My Article', content: 'Content here.' });

    expect(result[0].url).toBe('');
  });

  it('throws if no url and no title+content', async () => {
    await expect(fetch({})).rejects.toThrow('Manual source config requires url or title+content');
  });

  it('throws if only title is provided without content', async () => {
    await expect(fetch({ title: 'Title only' })).rejects.toThrow('Manual source config requires url or title+content');
  });

  it('throws if only content is provided without title', async () => {
    await expect(fetch({ content: 'Content only' })).rejects.toThrow('Manual source config requires url or title+content');
  });

  it('throws on invalid URL', async () => {
    await expect(fetch({ url: 'not-a-valid-url' })).rejects.toThrow('Invalid URL provided');
  });

  it('fetches URL and extracts metadata via cheerio', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title" />
          <meta property="og:description" content="OG Description" />
          <meta property="og:image" content="https://example.com/og.jpg" />
          <meta property="og:site_name" content="Example Site" />
          <meta name="author" content="Test Author" />
        </head>
        <body>
          <article>This is a long article body with more than one hundred characters to pass the content length threshold check in the fetcher code.</article>
        </body>
      </html>
    `;

    mockAxios.get.mockResolvedValueOnce({ data: html });
    mockCheerio.load = realCheerio.load;

    const result = await fetch({ url: 'https://example.com/article' });

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://example.com/article');
    expect(result[0].title).toBe('OG Title');
    expect(result[0].imageUrl).toBe('https://example.com/og.jpg');
    expect(result[0].sourceName).toBe('Example Site');
    expect(result[0].author).toBe('Test Author');
  });

  it('falls back to <title> when og:title is missing', async () => {
    const html = `<html><head><title>Page Title</title></head><body><main>${'x'.repeat(200)}</main></body></html>`;
    mockAxios.get.mockResolvedValueOnce({ data: html });
    mockCheerio.load = realCheerio.load;

    const result = await fetch({ url: 'https://example.com/page' });
    expect(result[0].title).toBe('Page Title');
  });

  it('falls back to hostname as siteName when og:site_name is missing', async () => {
    const html = `<html><head></head><body><main>${'x'.repeat(200)}</main></body></html>`;
    mockAxios.get.mockResolvedValueOnce({ data: html });
    mockCheerio.load = realCheerio.load;

    const result = await fetch({ url: 'https://mysite.com/article' });
    expect(result[0].sourceName).toBe('mysite.com');
  });

  it('throws on ETIMEDOUT error', async () => {
    const err = new Error('timeout of 30000ms exceeded');
    err.code = 'ETIMEDOUT';
    mockAxios.get.mockRejectedValueOnce(err);

    await expect(fetch({ url: 'https://example.com/slow' })).rejects.toThrow('Request timed out for URL');
  });

  it('throws on ECONNABORTED error', async () => {
    const err = new Error('aborted');
    err.code = 'ECONNABORTED';
    mockAxios.get.mockRejectedValueOnce(err);

    await expect(fetch({ url: 'https://example.com/slow' })).rejects.toThrow('Request timed out for URL');
  });

  it('throws generic fetch error for other network errors', async () => {
    mockAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(fetch({ url: 'https://example.com/error' })).rejects.toThrow('Failed to fetch URL');
  });
});
