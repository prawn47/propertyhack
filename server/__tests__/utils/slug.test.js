import { generateSlug } from '../../utils/slug';

describe('generateSlug', () => {
  it('converts title to lowercase', () => {
    const slug = generateSlug('Sydney Property Market');
    expect(slug).toMatch(/^sydney-property-market-/);
  });

  it('replaces spaces with hyphens', () => {
    const slug = generateSlug('house prices rise');
    expect(slug).toMatch(/^house-prices-rise-/);
  });

  it('removes special characters', () => {
    const slug = generateSlug('What\'s Next? Property!');
    expect(slug).toMatch(/^whats-next-property-/);
  });

  it('collapses multiple spaces into single hyphen', () => {
    const slug = generateSlug('too   many   spaces');
    expect(slug).toMatch(/^too-many-spaces-/);
  });

  it('collapses multiple hyphens into single hyphen', () => {
    const slug = generateSlug('already-hyphenated--title');
    expect(slug).toMatch(/^already-hyphenated-title-/);
  });

  it('trims leading and trailing whitespace', () => {
    const slug = generateSlug('  padded title  ');
    expect(slug).toMatch(/^padded-title-/);
  });

  it('appends a random suffix', () => {
    const slug1 = generateSlug('Same Title');
    const slug2 = generateSlug('Same Title');
    const base = 'same-title-';
    expect(slug1).toMatch(/^same-title-/);
    expect(slug2).toMatch(/^same-title-/);
    expect(slug1).not.toBe(slug2);
  });

  it('suffix is 5 alphanumeric characters', () => {
    const slug = generateSlug('Test Title');
    const parts = slug.split('-');
    const suffix = parts[parts.length - 1];
    expect(suffix).toMatch(/^[a-z0-9]{5}$/);
  });

  it('handles title with only special characters', () => {
    const slug = generateSlug('!!!---!!!');
    expect(typeof slug).toBe('string');
    expect(slug.length).toBeGreaterThan(0);
  });

  it('handles numbers in title', () => {
    const slug = generateSlug('2024 Property Outlook');
    expect(slug).toMatch(/^2024-property-outlook-/);
  });

  it('handles title with existing hyphens', () => {
    const slug = generateSlug('Mid-year property review');
    expect(slug).toMatch(/^mid-year-property-review-/);
  });

  it('handles empty string', () => {
    const slug = generateSlug('');
    expect(typeof slug).toBe('string');
    expect(slug.length).toBe(6);
  });

  it('handles single word title', () => {
    const slug = generateSlug('Property');
    expect(slug).toMatch(/^property-/);
  });

  it('handles unicode characters by removing them', () => {
    const slug = generateSlug('Café au lait property');
    expect(slug).not.toContain('é');
  });
});
