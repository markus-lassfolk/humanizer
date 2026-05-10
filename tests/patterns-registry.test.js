/**
 * patterns-registry.test.js — Tests for pattern registry functionality
 */

import { describe, it, expect } from 'vitest';
import { registry, wordCount, patterns } from '../src/patterns.js';

describe('Pattern registry', () => {
  it('has patterns available', () => {
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(20);
  });

  it('registry can get pattern by id', () => {
    const pattern = registry.get(1);
    expect(pattern).toBeDefined();
    expect(pattern.id).toBe(1);
  });

  it('registry can get patterns by category', () => {
    const vocabPatterns = registry.byCategory('vocabulary');
    expect(Array.isArray(vocabPatterns)).toBe(true);
    expect(vocabPatterns.every(p => p.category === 'vocabulary')).toBe(true);
  });

  it('registry lists all patterns', () => {
    const list = registry.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('id');
    expect(list[0]).toHaveProperty('name');
  });

  it('registry returns categories', () => {
    const categories = registry.categories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });
});

describe('wordCount helper', () => {
  it('counts words correctly', () => {
    expect(wordCount('Hello world')).toBe(2);
    expect(wordCount('one two three four')).toBe(4);
  });

  it('handles empty strings', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   ')).toBe(0);
  });

  it('handles punctuation', () => {
    expect(wordCount('Hello, world!')).toBe(2);
    expect(wordCount('... --- !!!')).toBe(0);
  });

  it('counts words with unicode', () => {
    expect(wordCount('café résumé')).toBe(2);
    expect(wordCount('hello123 world456')).toBe(2);
  });
});

describe('Pattern weights and structure', () => {
  it('all patterns have required fields', () => {
    patterns.forEach(pattern => {
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('category');
      expect(pattern).toHaveProperty('weight');
      expect(pattern).toHaveProperty('detect');
      expect(typeof pattern.detect).toBe('function');
    });
  });

  it('all patterns have valid weights', () => {
    patterns.forEach(pattern => {
      expect(pattern.weight).toBeGreaterThanOrEqual(1);
      expect(pattern.weight).toBeLessThanOrEqual(5);
    });
  });
});
