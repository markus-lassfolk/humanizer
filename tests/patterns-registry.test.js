/**
 * patterns-registry.test.js — Tests for pattern registry functionality
 */

import { describe, it, expect } from 'vitest';
import { registry, wordCount, patterns, PatternRegistry } from '../src/patterns.js';

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
    const contentPatterns = registry.byCategory('content');
    expect(Array.isArray(contentPatterns)).toBe(true);
    expect(contentPatterns.length).toBeGreaterThan(0);
    expect(contentPatterns.every((p) => p.category === 'content')).toBe(true);
  });

  it('registry returns empty list for unknown category', () => {
    expect(registry.byCategory('nonexistent-category')).toEqual([]);
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
    expect(categories).toEqual(
      expect.arrayContaining(['content', 'language', 'style', 'communication', 'filler']),
    );
    expect(categories).not.toContain('vocabulary');
  });
});

describe('PatternRegistry mutation and validation paths', () => {
  it('adds and removes custom patterns', () => {
    const localRegistry = new PatternRegistry();
    const initialCount = localRegistry.all().length;
    localRegistry.add({
      id: 9999,
      name: 'Custom pattern',
      category: 'custom',
      weight: 1,
      detect: () => [],
    });
    expect(localRegistry.get(9999)).toBeDefined();
    expect(localRegistry.all().length).toBe(initialCount + 1);
    localRegistry.remove(9999);
    expect(localRegistry.get(9999)).toBeUndefined();
    expect(localRegistry.all().length).toBe(initialCount);
  });

  it('throws when adding malformed patterns', () => {
    const localRegistry = new PatternRegistry();
    expect(() => localRegistry.add({ id: 1 })).toThrow(
      'Pattern must have id, name, and detect function',
    );
  });

  it('adds custom words to tiers and merges with built-ins', () => {
    const localRegistry = new PatternRegistry();
    const tier1Before = localRegistry.getVocabulary(1).length;
    localRegistry.addWords(1, ['customtieroneword']);
    const tier1After = localRegistry.getVocabulary(1);
    expect(tier1After.length).toBe(tier1Before + 1);
    expect(tier1After).toContain('customtieroneword');
  });

  it('throws on invalid tier when adding words', () => {
    const localRegistry = new PatternRegistry();
    expect(() => localRegistry.addWords(9, ['bad-tier-word'])).toThrow('Invalid tier: 9');
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
    patterns.forEach((pattern) => {
      expect(pattern).toHaveProperty('id');
      expect(pattern).toHaveProperty('name');
      expect(pattern).toHaveProperty('category');
      expect(pattern).toHaveProperty('weight');
      expect(pattern).toHaveProperty('detect');
      expect(typeof pattern.detect).toBe('function');
    });
  });

  it('all patterns have valid weights', () => {
    patterns.forEach((pattern) => {
      expect(pattern.weight).toBeGreaterThanOrEqual(1);
      expect(pattern.weight).toBeLessThanOrEqual(5);
    });
  });
});
