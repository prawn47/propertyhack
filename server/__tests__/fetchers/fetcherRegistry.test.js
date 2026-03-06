import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// ─── Mock all fetcher dependencies that index.js CJS-requires ────────────────
// We inject mock fetcher modules into require.cache so index.js picks them up.

const mockRssFetch = vi.fn();
const mockNewsApiOrgFetch = vi.fn();
const mockNewsApiAiFetch = vi.fn();
const mockPerplexityFetch = vi.fn();
const mockManualFetch = vi.fn();

function injectFetcherMock(relativePath, mockFetch) {
  const resolved = _require.resolve(relativePath);
  _require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: { fetch: mockFetch },
  };
}

// Stub out stubs for not-implemented fetchers (scraperFetcher, newsletterFetcher, socialFetcher)
function injectNotImplementedFetcher(relativePath, sourceType) {
  const resolved = _require.resolve(relativePath);
  _require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {
      fetch: async () => { throw new Error(`Fetcher not implemented: ${sourceType}`); },
    },
  };
}

injectFetcherMock('../../services/fetchers/rssFetcher.js', mockRssFetch);
injectFetcherMock('../../services/fetchers/newsApiOrgFetcher.js', mockNewsApiOrgFetch);
injectFetcherMock('../../services/fetchers/newsApiAiFetcher.js', mockNewsApiAiFetch);
injectFetcherMock('../../services/fetchers/perplexityFetcher.js', mockPerplexityFetch);
injectFetcherMock('../../services/fetchers/manualFetcher.js', mockManualFetch);
injectNotImplementedFetcher('../../services/fetchers/scraperFetcher.js', 'SCRAPER');
injectNotImplementedFetcher('../../services/fetchers/newsletterFetcher.js', 'NEWSLETTER');
injectNotImplementedFetcher('../../services/fetchers/socialFetcher.js', 'SOCIAL');

// Force fresh load of index so it picks up the mocked fetchers
const indexPath = _require.resolve('../../services/fetchers/index.js');
delete _require.cache[indexPath];
const { getFetcher } = _require('../../services/fetchers/index.js');

describe('getFetcher (fetcher registry)', () => {
  it('returns RSS fetcher for RSS type', () => {
    const fetcher = getFetcher('RSS');
    expect(fetcher).toBe(mockRssFetch);
  });

  it('returns NewsAPI.org fetcher for NEWSAPI_ORG type', () => {
    const fetcher = getFetcher('NEWSAPI_ORG');
    expect(fetcher).toBe(mockNewsApiOrgFetch);
  });

  it('returns NewsAPI.ai fetcher for NEWSAPI_AI type', () => {
    const fetcher = getFetcher('NEWSAPI_AI');
    expect(fetcher).toBe(mockNewsApiAiFetch);
  });

  it('returns Perplexity fetcher for PERPLEXITY type', () => {
    const fetcher = getFetcher('PERPLEXITY');
    expect(fetcher).toBe(mockPerplexityFetch);
  });

  it('returns manual fetcher for MANUAL type', () => {
    const fetcher = getFetcher('MANUAL');
    expect(fetcher).toBe(mockManualFetch);
  });

  it('returns a function for NEWSLETTER type (not implemented)', () => {
    const fetcher = getFetcher('NEWSLETTER');
    expect(typeof fetcher).toBe('function');
  });

  it('throws "not implemented" error when NEWSLETTER fetcher is called', async () => {
    const fetcher = getFetcher('NEWSLETTER');
    await expect(fetcher()).rejects.toThrow('Fetcher not implemented: NEWSLETTER');
  });

  it('returns a function for SCRAPER type (not implemented)', () => {
    const fetcher = getFetcher('SCRAPER');
    expect(typeof fetcher).toBe('function');
  });

  it('throws "not implemented" error when SCRAPER fetcher is called', async () => {
    const fetcher = getFetcher('SCRAPER');
    await expect(fetcher()).rejects.toThrow('Fetcher not implemented: SCRAPER');
  });

  it('returns a function for SOCIAL type (not implemented)', () => {
    const fetcher = getFetcher('SOCIAL');
    expect(typeof fetcher).toBe('function');
  });

  it('throws "not implemented" error when SOCIAL fetcher is called', async () => {
    const fetcher = getFetcher('SOCIAL');
    await expect(fetcher()).rejects.toThrow('Fetcher not implemented: SOCIAL');
  });

  it('throws for unknown source type', () => {
    expect(() => getFetcher('UNKNOWN_TYPE')).toThrow('Unknown source type: UNKNOWN_TYPE');
  });

  it('throws for empty string source type', () => {
    expect(() => getFetcher('')).toThrow('Unknown source type: ');
  });

  it('throws for undefined source type', () => {
    expect(() => getFetcher(undefined)).toThrow('Unknown source type: undefined');
  });
});
