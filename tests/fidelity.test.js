import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { factDiff } = require('../src/fact-diff');
const { analyze } = require('../src/analyzer');
const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

const found = (text, id, opts = {}) => analyze(text, opts).findings.some((f) => f.patternId === id);

describe('factDiff', () => {
  const src =
    'CVE-2024-1234 hit 10.0.0.1 on 2024-05-01, 40% of hosts [E1]. We assess with moderate confidence it is likely APT29.';
  it('reports nothing for a faithful rewrite', () => {
    expect(
      factDiff(
        src,
        'On 2024-05-01 CVE-2024-1234 hit 10.0.0.1 ([E1]), 40% of hosts. Likely APT29, moderate confidence; we assess this.',
      ).ok,
    ).toBe(true);
  });
  it('reports lost and invented facts, cites and estimative words', () => {
    const d = factDiff(
      src,
      'CVE-2024-9999 hit 10.0.0.1 on 2024-05-01, 60% of hosts [E2]. It is APT29.',
    );
    expect(d.lost).toEqual(expect.arrayContaining(['cve-2024-1234', '40%']));
    expect(d.invented).toEqual(expect.arrayContaining(['cve-2024-9999', '60%']));
    expect(d.citesLost).toEqual(['E1']);
    expect(d.citesInvented).toEqual(['E2']);
    expect(d.estimativeLost).toEqual(expect.arrayContaining(['likely', 'moderate confidence']));
    expect(d.ok).toBe(false);
  });
  it('flags claim-strength words dropped or added', () => {
    expect(factDiff('Access was explicitly denied.', 'Access was denied.').estimativeLost).toEqual([
      'explicitly',
    ]);
    expect(
      factDiff('Access was denied.', 'Access was probably denied.').estimativeInvented,
    ).toEqual(['probably']);
  });
});

describe('diff command', () => {
  const run = (a, b, extra = []) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hz-'));
    fs.writeFileSync(path.join(dir, 'a.md'), a);
    fs.writeFileSync(path.join(dir, 'b.md'), b);
    return spawnSync(
      'node',
      [CLI, 'diff', path.join(dir, 'a.md'), path.join(dir, 'b.md'), ...extra],
      {
        encoding: 'utf8',
      },
    );
  };
  it('exits 0 when nothing differs', () => {
    expect(run('CVE-2024-1234 is likely.', 'CVE-2024-1234 is likely.').status).toBe(0);
  });
  it('exits 1 and lists lost facts', () => {
    const r = run('CVE-2024-1234 is likely.', 'It is bad.', ['--json']);
    expect(r.status).toBe(1);
    expect(JSON.parse(r.stdout).lost).toEqual(['cve-2024-1234']);
  });
});

describe('structural detectors', () => {
  it('36 not-X-but-Y: same-sentence and cross-sentence', () => {
    expect(found("This isn't about speed; it's about trust.", 36)).toBe(true);
    expect(found('These are not "bugs". They are features of the design.', 36)).toBe(true);
    expect(found('The service is not available. It is being restored.', 36)).toBe(false);
    expect(found('The cache is not a database.', 36)).toBe(false);
  });
  it('37 staged run-ups', () => {
    expect(found("Here's the thing: the patch failed.", 37)).toBe(true);
    expect(found('The result? Nothing shipped.', 37)).toBe(true);
    expect(found('The result was nothing shipped.', 37)).toBe(false);
  });
  it('38 one-line closer', () => {
    const body =
      'The migration moved forty services to the new cluster over three weekends, and each cutover was rehearsed twice before the real window opened for traffic.';
    expect(found(`${body}\n\nThat changes everything.`, 38)).toBe(true);
    expect(found(`${body}\n\nSee the runbook.`, 38)).toBe(true); // shape-based: short final paragraph
    expect(found(`${body}\n\nRollback took 12 minutes.`, 38)).toBe(false); // carries a number
    expect(
      found(
        `${body}\n\nAnother long paragraph that continues the discussion with enough words to not count.`,
        38,
      ),
    ).toBe(false);
    expect(found('Short.\n\nAlso short.', 38)).toBe(false);
  });
});

describe('security-prose profile', () => {
  const text = 'It “works” — really — and **this** — too — is **bold**, **loud**, and **clear**.';
  it('reports em-dash/bold/curly quotes by default, none under the profile', () => {
    const on = analyze(text).findings.map((f) => f.patternId);
    expect(on).toEqual(expect.arrayContaining([13, 14, 18]));
    const off = analyze(text, { profile: 'security-prose' }).findings.map((f) => f.patternId);
    for (const id of [10, 13, 14, 15, 18, 23]) expect(off).not.toContain(id);
  });
  it('rejects unknown profiles', () => {
    expect(() => analyze('x y z', { profile: 'nope' })).toThrow(/Unknown profile/);
  });
});
