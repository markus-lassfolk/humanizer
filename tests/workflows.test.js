/**
 * workflows.test.js — Tests for scan/compare workflows.
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Buffer } from 'buffer';
import {
  normalizeExtensions,
  normalizeIgnoreDirs,
  collectTextFiles,
  scanPath,
  compareScanResults,
  compareTexts,
  compareFiles,
} from '../src/workflows.js';

describe('normalizeExtensions', () => {
  it('normalizes bare extensions with dots', () => {
    expect(normalizeExtensions(['md', '.TXT', ' rst '])).toEqual(['.md', '.txt', '.rst']);
  });

  it('falls back to defaults on empty input', () => {
    const exts = normalizeExtensions([]);
    expect(exts.length).toBeGreaterThan(0);
    expect(exts).toContain('.md');
  });
});

describe('normalizeIgnoreDirs', () => {
  it('merges defaults with user-supplied ignore dirs', () => {
    const dirs = normalizeIgnoreDirs(['generated']);
    expect(dirs.has('node_modules')).toBe(true);
    expect(dirs.has('generated')).toBe(true);
  });

  it('can disable default ignore dirs', () => {
    const dirs = normalizeIgnoreDirs(['generated'], false);
    expect(dirs.has('node_modules')).toBe(false);
    expect(dirs.has('generated')).toBe(true);
  });
});

describe('collectTextFiles', () => {
  it('collects matching files recursively and ignores node_modules', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'node_modules', 'x'), { recursive: true });

    fs.writeFileSync(path.join(tmp, 'README.md'), 'hello world');
    fs.writeFileSync(path.join(tmp, 'docs', 'guide.txt'), 'guide content');
    fs.writeFileSync(path.join(tmp, 'docs', 'script.js'), 'console.log(1);');
    fs.writeFileSync(path.join(tmp, 'node_modules', 'x', 'hidden.md'), 'should be ignored');

    const files = collectTextFiles(tmp, { exts: ['.md', '.txt'] });

    expect(files.some((f) => f.endsWith('README.md'))).toBe(true);
    expect(files.some((f) => f.endsWith('guide.txt'))).toBe(true);
    expect(files.some((f) => f.endsWith('script.js'))).toBe(false);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });

  it('supports custom ignored directories', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'generated'), { recursive: true });

    fs.writeFileSync(path.join(tmp, 'docs', 'guide.md'), 'ship this change now');
    fs.writeFileSync(path.join(tmp, 'generated', 'noise.md'), 'Great question! I hope this helps!');

    const files = collectTextFiles(tmp, {
      exts: ['.md'],
      ignoreDirs: ['generated'],
    });

    expect(files.some((f) => f.endsWith('guide.md'))).toBe(true);
    expect(files.some((f) => f.includes('generated'))).toBe(false);
  });

  it('can disable default ignore directories', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'node_modules', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'node_modules', 'pkg', 'doc.md'), 'scan me too');

    const files = collectTextFiles(tmp, {
      exts: ['.md'],
      includeDefaultIgnore: false,
    });

    expect(files.some((f) => f.includes('node_modules'))).toBe(true);
  });
});

describe('scanPath', () => {
  it('returns sorted file scores and summary', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    const aiText =
      'Great question! Here is a comprehensive overview. This serves as a testament to innovation. I hope this helps!';
    const humanText = 'The patch fixes two bugs. Build time dropped from 9m to 7m.';

    fs.writeFileSync(path.join(tmp, 'ai.md'), aiText);
    fs.writeFileSync(path.join(tmp, 'human.md'), humanText);

    const result = scanPath(tmp, { exts: ['md'], minWords: 3 });

    expect(result.summary.scannedFiles).toBe(2);
    expect(result.files.length).toBe(2);
    expect(result.files[0].score).toBeGreaterThanOrEqual(result.files[1].score);
    expect(result.files[0].file.endsWith('ai.md')).toBe(true);
    expect(result.summary.uniquePatterns).toBeGreaterThan(0);
    expect(result.patternHotspots.length).toBeGreaterThan(0);
    expect(result.patternHotspots[0]).toHaveProperty('affectedFiles');
  });

  it('aggregates hotspot patterns across multiple files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    const repeated1 =
      'Great question! This serves as a testament to innovation. Let me know if you need anything else.';
    const repeated2 =
      'Great question! This serves as a testament to modern workflows. Let me know if you need more detail.';

    fs.writeFileSync(path.join(tmp, 'one.md'), repeated1);
    fs.writeFileSync(path.join(tmp, 'two.md'), repeated2);

    const result = scanPath(tmp, { exts: ['md'], minWords: 3 });

    expect(result.patternHotspots.length).toBeGreaterThan(0);
    const sharedPattern = result.patternHotspots.find((p) => p.affectedFiles >= 2);
    expect(sharedPattern).toBeDefined();
    expect(sharedPattern.totalMatches).toBeGreaterThanOrEqual(sharedPattern.affectedFiles);
  });

  it('respects custom ignore dirs during scan', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.mkdirSync(path.join(tmp, 'content'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'generated'), { recursive: true });

    fs.writeFileSync(
      path.join(tmp, 'content', 'notes.md'),
      'The patch ships today. We validated with integration checks.',
    );
    fs.writeFileSync(
      path.join(tmp, 'generated', 'bot.md'),
      'Great question! This serves as a testament to innovation. I hope this helps!',
    );

    const result = scanPath(tmp, {
      exts: ['md'],
      minWords: 3,
      ignoreDirs: ['generated'],
    });

    expect(result.summary.scannedFiles).toBe(1);
    expect(result.files[0].file.endsWith('notes.md')).toBe(true);
  });

  it('applies prose-only masking to minWords before counting', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));
    try {
      const body = 'One two.';
      const padded = [
        '---',
        'title: Comprehensive seamless transformation overview for stakeholders',
        'keywords: robust, innovative, leverage, landscape, digital, evolving',
        '---',
        '',
        body,
      ].join('\n');
      fs.writeFileSync(path.join(tmp, 'thin-body.md'), padded);

      const withoutProseOnly = scanPath(tmp, { exts: ['md'], minWords: 5, proseOnly: false });
      const withProseOnly = scanPath(tmp, { exts: ['md'], minWords: 5, proseOnly: true });

      expect(withoutProseOnly.summary.scannedFiles).toBe(1);
      expect(withProseOnly.summary.scannedFiles).toBe(0);
      expect(withProseOnly.skipped.some((s) => s.reason.startsWith('too_short:'))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('can ignore code snippets during scan', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    const content = [
      'Release notes',
      '```md',
      'Great question! This serves as a testament to innovation.',
      '```',
      'Shipped bug fixes and reduced latency by 18%.',
    ].join('\n');

    fs.writeFileSync(path.join(tmp, 'notes.md'), content);

    const regular = scanPath(tmp, { exts: ['md'], minWords: 3, ignoreCode: false });
    const ignoreCode = scanPath(tmp, { exts: ['md'], minWords: 3, ignoreCode: true });

    expect(regular.files[0].score).toBeGreaterThan(ignoreCode.files[0].score);
  });

  it('uses generic code stripping for non-markdown files when ignoreCode is enabled', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.writeFileSync(
      path.join(tmp, 'quoted.txt'),
      '> Great question! This serves as a testament to innovation. I hope this helps!\nPlain reply follows.',
    );
    fs.writeFileSync(
      path.join(tmp, 'quoted.md'),
      '> Great question! This serves as a testament to innovation. I hope this helps!\nPlain reply follows.',
    );

    const result = scanPath(tmp, { exts: ['txt', 'md'], minWords: 1, ignoreCode: true });
    const txt = result.files.find((file) => file.file.endsWith('quoted.txt'));
    const md = result.files.find((file) => file.file.endsWith('quoted.md'));

    expect(txt.score).toBeGreaterThan(md.score);
    expect(txt.totalMatches).toBeGreaterThan(md.totalMatches);
  });

  it('continues past invalid binary-like files and reports file errors', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.writeFileSync(path.join(tmp, 'valid.md'), 'The patch fixes two bugs. Build time dropped.');
    fs.writeFileSync(path.join(tmp, 'bad.md'), Buffer.from([0x00, 0x01, 0x02, 0x03]));

    const result = scanPath(tmp, { exts: ['md'], minWords: 3 });

    expect(result.summary.scannedFiles).toBe(1);
    expect(result.summary.failedFiles).toBe(1);
    expect(result.files[0].file.endsWith('valid.md')).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file.endsWith('bad.md')).toBe(true);
    expect(result.errors[0].reason).toContain('non_text_or_binary_content');
  });

  it('does not treat literal replacement characters as binary content', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));

    fs.writeFileSync(
      path.join(tmp, 'replacement.md'),
      'Literal replacement char: � in prose text.',
    );

    const result = scanPath(tmp, { exts: ['md'], minWords: 1 });

    expect(result.summary.failedFiles).toBe(0);
    expect(result.summary.scannedFiles).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.files[0].file.endsWith('replacement.md')).toBe(true);
  });

  it('supports locale-specific scanning', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));
    const swedish = 'Den här lösningen banar väg för framtiden med tydliga resultat.';
    fs.writeFileSync(path.join(tmp, 'sv.md'), swedish);

    const enScan = scanPath(tmp, { exts: ['md'], minWords: 3, locale: 'en' });
    const svScan = scanPath(tmp, { exts: ['md'], minWords: 3, locale: 'sv' });

    expect(enScan.files[0].score).toBeLessThan(svScan.files[0].score);
  });

  it('throws when scan locale is unknown before any file is analyzed', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-locale-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'a.md'),
        'The team shipped the fix on Friday and monitored logs overnight.',
      );
      expect(() =>
        scanPath(tmp, { exts: ['md'], minWords: 1, locale: 'invalid-locale-for-testing' }),
      ).toThrow(/Unknown locale/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('isolates unexpected per-file analyze errors and continues', () => {
    const analyzer = require('../src/analyzer.js');
    const orig = analyzer.analyze.bind(analyzer);
    const spy = vi.spyOn(analyzer, 'analyze').mockImplementation((text, opts) => {
      if (typeof text === 'string' && text.includes('__SCAN_THROW__')) {
        throw new Error('simulated per-file analyze failure');
      }
      return orig(text, opts);
    });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-perfile-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'bad.md'),
        ['__SCAN_THROW__', 'The team shipped the fix on Friday and monitored logs overnight.'].join(
          ' ',
        ),
      );
      fs.writeFileSync(
        path.join(tmp, 'good.md'),
        'The team shipped the fix on Friday and monitored logs overnight.',
      );

      const result = scanPath(tmp, { exts: ['md'], minWords: 1, locale: 'en' });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].file.endsWith('good.md')).toBe(true);
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            file: path.join(tmp, 'bad.md'),
            reason: expect.stringContaining('analyze_error:'),
          }),
        ]),
      );
    } finally {
      spy.mockRestore();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('uses markdown-aware preprocessing for mdoc scan files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-scan-'));
    const file = path.join(tmp, 'doc.mdoc');
    fs.writeFileSync(
      file,
      ['---', 'title: Robust solutions', '---', 'Plain prose for the actual document body.'].join(
        '\n',
      ),
    );

    const result = scanPath(tmp, { exts: ['mdoc'], minWords: 1, ignoreCode: true });

    expect(result.files).toHaveLength(1);
    expect(result.files[0].wordCount).toBe(7);
  });
});

describe('compareTexts and compareFiles', () => {
  it('shows improvement when after text is cleaner', () => {
    const before =
      'Great question! Here is a comprehensive overview. In order to help, this serves as a testament to innovation. I hope this helps!';
    const after =
      'The release fixes three bugs and reduces API latency by 18%. We shipped it on Monday and monitored error rates overnight.';

    const result = compareTexts(before, after);

    expect(result.delta.score).toBeLessThan(0);
    expect(result.delta.matches).toBeLessThan(0);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it('compares files from disk', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-compare-'));
    const beforePath = path.join(tmp, 'before.md');
    const afterPath = path.join(tmp, 'after.md');

    fs.writeFileSync(beforePath, 'Great question! Here is a comprehensive breakdown.');
    fs.writeFileSync(afterPath, 'Short answer: we fixed it yesterday.');

    const result = compareFiles(beforePath, afterPath);
    expect(result.before.score).toBeGreaterThanOrEqual(0);
    expect(result.after.score).toBeGreaterThanOrEqual(0);
    expect(typeof result.delta.score).toBe('number');
  });

  it('supports ignoreCode option in compare workflows', () => {
    const before = '```md\nGreat question!\n```\nShipped bug fixes.';
    const after = '```md\nGreat question!\n```\nShipped bug fixes and lowered latency.';

    const regular = compareTexts(before, after);
    const codeAware = compareTexts(before, after, { ignoreCode: true });

    expect(regular.before.score).toBeGreaterThan(codeAware.before.score);
  });

  it('passes locale and strict options into compare workflows', () => {
    const svBefore =
      'I dagens snabbt föränderliga digitala landskap behöver vi nyttja robusta lösningar. Detta är avgörande för en holistisk strategi.';
    const svAfter =
      'Vi ska uppdatera listan på fredag. Karin tar mötet och jag skickar protokollet efter lunch.';
    const svResult = compareTexts(svBefore, svAfter, { locale: 'sv' });

    expect(svResult.before.totalMatches).toBeGreaterThan(0);
    expect(svResult.delta.score).toBeLessThan(0);

    const strictResult = compareTexts(
      'The chairman asked for manpower estimates.',
      'The chair asked for staffing estimates.',
      { strict: true },
    );

    expect(strictResult.improvements.some((item) => item.patternId === 35)).toBe(true);
  });

  it('reports all missing compare files before reading either input', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-compare-missing-'));
    const existing = path.join(tmp, 'existing.md');
    const missingBefore = path.join(tmp, 'missing-before.md');
    const missingAfter = path.join(tmp, 'missing-after.md');
    fs.writeFileSync(existing, 'Existing comparison text.');

    expect(() => compareFiles(missingBefore, existing)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(`before file not found: ${missingBefore}`),
      }),
    );
    expect(() => compareFiles(existing, missingAfter)).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(`after file not found: ${missingAfter}`),
      }),
    );

    try {
      compareFiles(missingBefore, missingAfter);
      throw new Error('Expected compareFiles to throw for two missing files.');
    } catch (err) {
      expect(err.message).toContain(`before file not found: ${missingBefore}`);
      expect(err.message).toContain(`after file not found: ${missingAfter}`);
    }
  });
});

describe('compareScanResults', () => {
  it('detects regressions, improvements, new files, and missing files by relative path', () => {
    const baselineRoot = path.resolve('/tmp/humanizer-baseline-a');
    const currentRoot = path.resolve('/tmp/humanizer-baseline-b');

    const baseline = {
      targetPath: baselineRoot,
      files: [
        {
          file: path.join(baselineRoot, 'docs', 'a.md'),
          score: 12,
          totalMatches: 2,
        },
        {
          file: path.join(baselineRoot, 'docs', 'b.md'),
          score: 44,
          totalMatches: 6,
        },
        {
          file: path.join(baselineRoot, 'docs', 'c.md'),
          score: 29,
          totalMatches: 4,
        },
      ],
    };

    const current = {
      targetPath: currentRoot,
      files: [
        {
          file: path.join(currentRoot, 'docs', 'a.md'),
          score: 20,
          totalMatches: 5,
        },
        {
          file: path.join(currentRoot, 'docs', 'b.md'),
          score: 36,
          totalMatches: 4,
        },
        {
          file: path.join(currentRoot, 'docs', 'new.md'),
          score: 18,
          totalMatches: 2,
        },
      ],
    };

    const comparison = compareScanResults(current, baseline, { regressionThreshold: 5 });

    expect(comparison.summary.regressions).toBe(1);
    expect(comparison.summary.improvements).toBe(1);
    expect(comparison.summary.newFiles).toBe(1);
    expect(comparison.summary.missingFiles).toBe(1);

    expect(comparison.regressions[0].relativePath).toBe('docs/a.md');
    expect(comparison.regressions[0].delta).toBe(8);

    expect(comparison.improvements[0].relativePath).toBe('docs/b.md');
    expect(comparison.improvements[0].delta).toBe(-8);

    expect(comparison.newFiles[0].relativePath).toBe('docs/new.md');
    expect(comparison.missingFiles[0].relativePath).toBe('docs/c.md');
  });

  it('treats small deltas under threshold as unchanged', () => {
    const baseline = {
      targetPath: '/tmp/humanizer-baseline-a',
      files: [{ file: '/tmp/humanizer-baseline-a/a.md', score: 30, totalMatches: 4 }],
    };
    const current = {
      targetPath: '/tmp/humanizer-baseline-b',
      files: [{ file: '/tmp/humanizer-baseline-b/a.md', score: 33, totalMatches: 4 }],
    };

    const comparison = compareScanResults(current, baseline, { regressionThreshold: 5 });

    expect(comparison.summary.regressions).toBe(0);
    expect(comparison.summary.improvements).toBe(0);
    expect(comparison.summary.unchanged).toBe(1);
  });
});
