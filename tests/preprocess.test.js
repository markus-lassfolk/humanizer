import { describe, it, expect } from 'vitest';
import {
  stripCodeSnippets,
  stripMarkdownProtectedRegions,
  transformMarkdownProse,
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

describe('stripMarkdownProtectedRegions', () => {
  it('masks frontmatter, tables, MDX, and blockquotes while preserving prose', () => {
    const input = [
      '---',
      'title: Comprehensive seamless transformation',
      'keywords: robust, innovative, leverage, landscape',
      '---',
      '',
      "import Widget from './Widget';",
      '<Widget description="This comprehensive widget leverages innovative capabilities" />',
      '',
      '| Term | Description |',
      '| --- | --- |',
      '| AI | Comprehensive seamless transformation |',
      '',
      "> Vendor says: In today's rapidly evolving digital landscape.",
      '',
      'Short internal note: ship after tests pass.',
    ].join('\n');

    const output = stripMarkdownProtectedRegions(input);

    expect(output.split('\n')).toHaveLength(input.split('\n').length);
    expect(output).not.toContain('Comprehensive seamless transformation');
    expect(output).not.toContain('Widget');
    expect(output).not.toContain('rapidly evolving digital landscape');
    expect(output).toContain('Short internal note: ship after tests pass.');
  });

  it('does not let MDX component masking span across multiple lines', () => {
    const input = [
      '<Widget',
      'Some regular prose mentions comprehensive robust delivery.',
      '/>',
    ].join('\n');

    const output = stripMarkdownProtectedRegions(input);

    expect(output).toContain('Some regular prose mentions comprehensive robust delivery.');
  });
});

describe('transformMarkdownProse', () => {
  it('restores protected snippets in one pass without leaking nested placeholder tokens', () => {
    const input = [
      '| Term | Description |',
      '| --- | --- |',
      '| CLI | Keep `in order to` literal. |',
      '',
      '> Quote keeps `in order to` literal.',
      '',
      'In order to ship, update prose.',
    ].join('\n');

    const output = transformMarkdownProse(input, (text) => text.replace(/\bin order to\b/gi, 'to'));

    expect(output).toContain('| CLI | Keep `in order to` literal. |');
    expect(output).toContain('> Quote keeps `in order to` literal.');
    expect(output).toContain('to ship, update prose.');
    expect(output).not.toContain('HUMANIZER_PROTECTED');
    expect(output).not.toContain('\uE000');
  });
});
