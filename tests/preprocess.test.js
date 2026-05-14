import { describe, it, expect } from 'vitest';
import {
  stripCodeSnippets,
  stripFrontmatter,
  stripMdxComponents,
  stripBlockquotes,
} from '../src/preprocess.js';

describe('stripCodeSnippets', () => {
  it('masks fenced code blocks and preserves line count', () => {
    const input = ['Intro line', '```js', "const x = 'Great question!';", '```', 'Outro line'].join(
      '\n',
    );

    const output = stripCodeSnippets(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('Intro line');
    expect(output).toContain('Outro line');
    expect(output).not.toContain('Great question!');
    expect(output).not.toContain('const x');
  });

  it('masks inline code spans', () => {
    const input = 'Use `Great question!` only as an example.';
    const output = stripCodeSnippets(input);

    expect(output).not.toContain('Great question!');
    expect(output).toContain('Use');
    expect(output).toContain('only as an example.');
  });

  it('returns original text when no code snippets exist', () => {
    const input = 'This is plain prose with no snippet markers.';
    expect(stripCodeSnippets(input)).toBe(input);
  });
});

describe('stripFrontmatter', () => {
  it('masks YAML frontmatter and preserves line count', () => {
    const input = [
      '---',
      'title: Comprehensive seamless transformation',
      'keywords: robust, innovative, leverage',
      '---',
      '',
      'Short internal note: ship after tests pass.',
    ].join('\n');

    const output = stripFrontmatter(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('Short internal note');
    expect(output).not.toContain('Comprehensive');
    expect(output).not.toContain('leverage');
  });

  it('does not mask text without frontmatter', () => {
    const input = 'Just plain text.\nNo frontmatter here.';
    expect(stripFrontmatter(input)).toBe(input);
  });

  it('does not mask a --- block that does not start at document start', () => {
    const input = 'Some intro.\n---\ntitle: test\n---\nBody.';
    expect(stripFrontmatter(input)).toBe(input);
  });

  it('returns empty string for non-string input', () => {
    expect(stripFrontmatter(null)).toBe('');
    expect(stripFrontmatter('')).toBe('');
  });
});

describe('stripMdxComponents', () => {
  it('masks MDX import lines and preserves line count', () => {
    const input = ['import Widget from "./Widget";', '', 'Normal prose here.'].join('\n');

    const output = stripMdxComponents(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('Normal prose here.');
    expect(output).not.toContain('import Widget');
  });

  it('masks JSX self-closing component tags', () => {
    const input = [
      '# Notes',
      '<Widget description="This comprehensive widget leverages innovative solutions" />',
      'The page renders a marketing card.',
    ].join('\n');

    const output = stripMdxComponents(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('Notes');
    expect(output).toContain('The page renders a marketing card.');
    expect(output).not.toContain('comprehensive');
    expect(output).not.toContain('leverages');
  });

  it('masks JSX opening component tags with attributes', () => {
    const input = '<Card title="Seamless robust guide" className="foo">\n  Content here.\n</Card>';

    const output = stripMdxComponents(input);

    expect(output).not.toContain('Seamless robust guide');
    expect(output).toContain('Content here.');
  });

  it('does not mask lowercase HTML tags', () => {
    const input = '<p>Normal paragraph.</p>';
    expect(stripMdxComponents(input)).toBe(input);
  });

  it('returns empty string for non-string input', () => {
    expect(stripMdxComponents(null)).toBe('');
    expect(stripMdxComponents('')).toBe('');
  });
});

describe('stripBlockquotes', () => {
  it('masks blockquote lines and preserves line count', () => {
    const input = [
      'Maja wrote:',
      '',
      "> In today's rapidly evolving digital landscape, we leverage innovative solutions.",
      '',
      'My note: this quote is from a vendor deck, not our wording.',
    ].join('\n');

    const output = stripBlockquotes(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).toContain('Maja wrote:');
    expect(output).toContain('My note: this quote is from a vendor deck');
    expect(output).not.toContain('digital landscape');
    expect(output).not.toContain('leverage');
  });

  it('masks nested blockquotes', () => {
    const input = '>> Deeply nested AI-written quote with leverage and innovative.';
    const output = stripBlockquotes(input);
    expect(output).not.toContain('innovative');
  });

  it('does not affect non-blockquote lines', () => {
    const input = 'Normal line.\nAnother normal line.';
    expect(stripBlockquotes(input)).toBe(input);
  });

  it('returns empty string for non-string input', () => {
    expect(stripBlockquotes(null)).toBe('');
    expect(stripBlockquotes('')).toBe('');
  });
});
