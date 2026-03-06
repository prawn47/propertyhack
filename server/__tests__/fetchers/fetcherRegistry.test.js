vi.mock('../../services/fetchers/rssFetcher', () => ({ fetch: vi.fn() }));
vi.mock('../../services/fetchers/newsApiOrgFetcher', () => ({ fetch: vi.fn() }));
vi.mock('../../services/fetchers/newsApiAiFetcher', () => ({ fetch: vi.fn() }));
vi.mock('../../services/fetchers/perplexityFetcher', () => ({ fetch: vi.fn() }));
vi.mock('../../services/fetchers/manualFetcher', () => ({ fetch: vi.fn() }));

import { getFetcher } from '../../services/fetchers/index';
import rssFetcher from '../../services/fetchers/rssFetcher';
import newsApiOrgFetcher from '../../services/fetchers/newsApiOrgFetcher';
import newsApiAiFetcher from '../../services/fetchers/newsApiAiFetcher';
import perplexityFetcher from '../../services/fetchers/perplexityFetcher';
import manualFetcher from '../../services/fetchers/manualFetcher';

describe('getFetcher (fetcher registry)', () => {
  it('returns RSS fetcher for RSS type', () => {
    const fetcher = getFetcher('RSS');
    expect(fetcher).toBe(rssFetcher.fetch);
  });

  it('returns NewsAPI.org fetcher for NEWSAPI_ORG type', () => {
    const fetcher = getFetcher('NEWSAPI_ORG');
    expect(fetcher).toBe(newsApiOrgFetcher.fetch);
  });

  it('returns NewsAPI.ai fetcher for NEWSAPI_AI type', () => {
    const fetcher = getFetcher('NEWSAPI_AI');
    expect(fetcher).toBe(newsApiAiFetcher.fetch);
  });

  it('returns Perplexity fetcher for PERPLEXITY type', () => {
    const fetcher = getFetcher('PERPLEXITY');
    expect(fetcher).toBe(perplexityFetcher.fetch);
  });

  it('returns manual fetcher for MANUAL type', () => {
    const fetcher = getFetcher('MANUAL');
    expect(fetcher).toBe(manualFetcher.fetch);
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
