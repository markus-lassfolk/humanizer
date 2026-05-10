import { describe, expect, it } from 'vitest';
import { wordCount } from '../src/patterns.js';

describe('patterns wordCount', () => {
  it('does not count punctuation-only tokens as words', () => {
    expect(wordCount('alpha — beta --- ... !!!')).toBe(2);
  });

  it('counts tokens containing letters or numbers', () => {
    expect(wordCount('v2 --- 123 alpha')).toBe(3);
  });
});
