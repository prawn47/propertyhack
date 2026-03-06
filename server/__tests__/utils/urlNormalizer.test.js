import { normalizeUrl } from '../../utils/urlNormalizer';

describe('normalizeUrl', () => {
  it('upgrades http to https', () => {
    const result = normalizeUrl('http://example.com/article');
    expect(result).toMatch(/^https:/);
  });

  it('preserves https protocol', () => {
    const result = normalizeUrl('https://example.com/article');
    expect(result).toMatch(/^https:/);
  });

  it('removes utm_source tracking param', () => {
    const result = normalizeUrl('https://example.com/article?utm_source=facebook');
    expect(result).not.toContain('utm_source');
  });

  it('removes utm_medium tracking param', () => {
    const result = normalizeUrl('https://example.com/article?utm_medium=social');
    expect(result).not.toContain('utm_medium');
  });

  it('removes utm_campaign tracking param', () => {
    const result = normalizeUrl('https://example.com/article?utm_campaign=spring2024');
    expect(result).not.toContain('utm_campaign');
  });

  it('removes utm_content tracking param', () => {
    const result = normalizeUrl('https://example.com/article?utm_content=banner');
    expect(result).not.toContain('utm_content');
  });

  it('removes utm_term tracking param', () => {
    const result = normalizeUrl('https://example.com/article?utm_term=property');
    expect(result).not.toContain('utm_term');
  });

  it('removes ref tracking param', () => {
    const result = normalizeUrl('https://example.com/article?ref=homepage');
    expect(result).not.toContain('ref=');
  });

  it('removes fbclid tracking param', () => {
    const result = normalizeUrl('https://example.com/article?fbclid=abc123');
    expect(result).not.toContain('fbclid');
  });

  it('removes gclid tracking param', () => {
    const result = normalizeUrl('https://example.com/article?gclid=def456');
    expect(result).not.toContain('gclid');
  });

  it('removes all tracking params together', () => {
    const result = normalizeUrl('https://example.com/article?utm_source=fb&utm_medium=cpc&utm_campaign=spring&fbclid=xyz');
    expect(result).toBe('https://example.com/article');
  });

  it('preserves non-tracking query params', () => {
    const result = normalizeUrl('https://example.com/search?q=property&page=2');
    expect(result).toContain('q=property');
    expect(result).toContain('page=2');
  });

  it('removes URL fragment/hash', () => {
    const result = normalizeUrl('https://example.com/article#section-2');
    expect(result).not.toContain('#');
  });

  it('removes trailing slash from paths', () => {
    const result = normalizeUrl('https://example.com/article/');
    expect(result).not.toMatch(/\/$/);
  });

  it('preserves trailing slash for root path', () => {
    const result = normalizeUrl('https://example.com/');
    expect(result).toBe('https://example.com/');
  });

  it('lowercases the URL', () => {
    const result = normalizeUrl('https://Example.COM/Article-Title');
    expect(result).toBe('https://example.com/article-title');
  });

  it('handles complex URL with multiple concerns', () => {
    const result = normalizeUrl('HTTP://Example.com/News/Article/?utm_source=google&ref=home&page=1#comments');
    expect(result).toMatch(/^https:/);
    expect(result).not.toContain('utm_source');
    expect(result).not.toContain('ref=');
    expect(result).not.toContain('#');
    expect(result).toContain('page=1');
  });

  it('handles invalid URL gracefully', () => {
    const result = normalizeUrl('not-a-valid-url');
    expect(result).toBe('not-a-valid-url');
  });

  it('lowercases invalid URLs as fallback', () => {
    const result = normalizeUrl('NOT-A-URL/Path/');
    expect(result).toBe('not-a-url/path');
  });

  it('strips trailing slash from invalid URL fallback', () => {
    const result = normalizeUrl('just-a-path/');
    expect(result).toBe('just-a-path');
  });

  it('handles URL with only tracking params leaving clean URL', () => {
    const result = normalizeUrl('https://example.com/article?utm_source=twitter&utm_medium=social');
    expect(result).toBe('https://example.com/article');
  });

  it('removes hash even when also removing tracking params', () => {
    const result = normalizeUrl('https://example.com/article?utm_source=fb#top');
    expect(result).not.toContain('#');
    expect(result).not.toContain('utm_source');
  });
});
