import { describe, it, expect } from 'vitest';
import { normaliseText, generateContentHash } from '../../utils/contentHash.js';

describe('normaliseText', () => {
  it('lowercases and strips punctuation', () => {
    expect(normaliseText('Hello, World!')).toBe('hello world');
  });

  it('collapses multiple whitespace to single space', () => {
    expect(normaliseText('too   many    spaces')).toBe('too many spaces');
  });

  it('returns empty string for null/undefined', () => {
    expect(normaliseText(null)).toBe('');
    expect(normaliseText(undefined)).toBe('');
    expect(normaliseText('')).toBe('');
  });
});

describe('generateContentHash', () => {
  it('produces same hash for identical title+content', () => {
    const hash1 = generateContentHash('My Title', 'Some content here');
    const hash2 = generateContentHash('My Title', 'Some content here');
    expect(hash1).toBe(hash2);
  });

  it('produces same hash despite casing and punctuation differences', () => {
    const hash1 = generateContentHash('My Title!', 'Some content, here.');
    const hash2 = generateContentHash('my title', 'some content here');
    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different content', () => {
    const hash1 = generateContentHash('Title A', 'Content A');
    const hash2 = generateContentHash('Title B', 'Content B');
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty/null content gracefully', () => {
    const hash1 = generateContentHash('Title', null);
    const hash2 = generateContentHash('Title', '');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles null title gracefully', () => {
    const hash = generateContentHash(null, 'content');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
