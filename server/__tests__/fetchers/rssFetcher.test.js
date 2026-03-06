import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// ─── Inject rss-parser mock into require.cache before loading the source module ───
const mockParseURL = vi.fn();
const MockParser = function () {};
MockParser.prototype.parseURL = mockParseURL;
MockParser.default = MockParser;

const rssParserPath = _require.resolve('rss-parser');
_require.cache[rssParserPath] = {
  id: rssParserPath,
  filename: rssParserPath,
  loaded: true,
  exports: MockParser,
};

// Force fresh load of rssFetcher so it picks up the mock Parser
const fetcherPath = _require.resolve('../../services/fetchers/rssFetcher.js');
delete _require.cache[fetcherPath];
const { fetch } = _require('../../services/fetchers/rssFetcher.js');

describe('rssFetcher', () => {
  beforeEach(() => {
    mockParseURL.mockReset();
  });

  it('throws if feedUrl is missing', async () => {
    await expect(fetch({})).rejects.toThrow('RSS source config missing feedUrl');
  });

  it('returns empty array when feed has no items', async () => {
    mockParseURL.mockResolvedValueOnce({ title: 'Test Feed', items: [] });
    const result = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(result).toEqual([]);
  });

  it('returns empty array when feed.items is undefined', async () => {
    mockParseURL.mockResolvedValueOnce({ title: 'Test Feed' });
    const result = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(result).toEqual([]);
  });

  it('maps feed items to articles', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Property News',
      items: [
        {
          title: 'House Prices Rise',
          link: 'https://example.com/article-1',
          contentSnippet: 'Prices are rising.',
          isoDate: '2024-01-01T00:00:00Z',
          creator: 'Jane Smith',
        },
      ],
    });

    const result = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'House Prices Rise',
      url: 'https://example.com/article-1',
      content: 'Prices are rising.',
      date: '2024-01-01T00:00:00Z',
      author: 'Jane Smith',
      sourceName: 'Property News',
    });
  });

  it('uses contentEncoded over content over contentSnippet', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [
        {
          title: 'Test',
          link: 'https://example.com/a',
          content: 'short content',
          contentEncoded: '<p>Full encoded content</p>',
          contentSnippet: 'snippet',
        },
      ],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.content).toBe('<p>Full encoded content</p>');
  });

  it('falls back to guid when link is missing', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [{ title: 'Test', guid: 'https://example.com/guid' }],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.url).toBe('https://example.com/guid');
  });

  it('filters out items with no url or guid', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [{ title: 'No URL', content: 'stuff' }],
    });

    const result = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(result).toHaveLength(0);
  });

  it('respects maxItems limit', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      title: `Article ${i}`,
      link: `https://example.com/${i}`,
    }));
    mockParseURL.mockResolvedValueOnce({ title: 'Feed', items });

    const result = await fetch({ feedUrl: 'https://example.com/rss', maxItems: 3 });
    expect(result).toHaveLength(3);
  });

  it('extracts image from mediaContent', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [
        {
          title: 'With Image',
          link: 'https://example.com/a',
          mediaContent: { $: { url: 'https://example.com/image.jpg' } },
        },
      ],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.imageUrl).toBe('https://example.com/image.jpg');
  });

  it('extracts image from mediaThumbnail when mediaContent absent', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [
        {
          title: 'With Thumb',
          link: 'https://example.com/a',
          mediaThumbnail: { $: { url: 'https://example.com/thumb.jpg' } },
        },
      ],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.imageUrl).toBe('https://example.com/thumb.jpg');
  });

  it('extracts image from enclosure when type starts with image/', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [
        {
          title: 'Enc Image',
          link: 'https://example.com/a',
          enclosure: { url: 'https://example.com/enc.jpg', type: 'image/jpeg' },
        },
      ],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.imageUrl).toBe('https://example.com/enc.jpg');
  });

  it('extracts image from <img> tag in content', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [
        {
          title: 'HTML Content',
          link: 'https://example.com/a',
          content: '<p>Text</p><img src="https://example.com/inline.png" alt="photo">',
        },
      ],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.imageUrl).toBe('https://example.com/inline.png');
  });

  it('returns null imageUrl when no image found', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [{ title: 'No Image', link: 'https://example.com/a' }],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.imageUrl).toBeNull();
  });

  it('throws timeout error on ETIMEDOUT', async () => {
    const err = new Error('connect ETIMEDOUT');
    err.code = 'ETIMEDOUT';
    mockParseURL.mockRejectedValueOnce(err);

    await expect(fetch({ feedUrl: 'https://example.com/rss' })).rejects.toThrow('RSS fetch timed out');
  });

  it('throws invalid XML error on Non-whitespace parse failure', async () => {
    mockParseURL.mockRejectedValueOnce(new Error('Non-whitespace before first tag'));

    await expect(fetch({ feedUrl: 'https://example.com/rss' })).rejects.toThrow('RSS feed returned invalid XML');
  });

  it('throws generic error for other failures', async () => {
    mockParseURL.mockRejectedValueOnce(new Error('Network failure'));

    await expect(fetch({ feedUrl: 'https://example.com/rss' })).rejects.toThrow('RSS fetch failed for https://example.com/rss');
  });

  it('uses Untitled when item title is missing', async () => {
    mockParseURL.mockResolvedValueOnce({
      title: 'Feed',
      items: [{ link: 'https://example.com/a' }],
    });

    const [article] = await fetch({ feedUrl: 'https://example.com/rss' });
    expect(article.title).toBe('Untitled');
  });
});
