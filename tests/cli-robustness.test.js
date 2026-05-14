import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const CLI_PATH = path.resolve(process.cwd(), 'src', 'cli.js');

function runCli(args, options = {}) {
  return spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    input: options.input,
    env: { ...process.env, ...(options.env || {}) },
  });
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-cli-robust-'));
}

describe('CLI robustness validation', () => {
  it('rejects unknown flags', () => {
    const run = runCli(['score', '--json', '--no-such-flag'], {
      input: 'This is a testament to robust solutions.',
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Unknown option: --no-such-flag');
    expect(run.stdout).toBe('');
  });

  it('rejects invalid pattern IDs', () => {
    const run = runCli(['analyze', '--json', '--patterns', 'abc'], {
      input: 'This is a testament to robust solutions.',
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('--patterns must be a comma-separated list');
  });

  it('rejects invalid numeric option values', () => {
    const tmp = tempDir();
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'This is a testament to robust solutions.');

    for (const flag of ['--threshold', '--min-words', '--fail-above', '--regression-threshold']) {
      const run = runCli(['scan', tmp, '--ext', 'txt', flag, 'nope', '--json']);
      expect(run.status, flag).toBe(1);
      expect(run.stderr, flag).toContain(`${flag} must be a non-negative integer`);
    }
  });

  it('does not validate env locale for help flows, but rejects it for locale-using commands', () => {
    const helpRun = runCli(['--help'], {
      env: { HUMANIZER_LOCALE: 'not-a-locale' },
    });
    expect(helpRun.status).toBe(0);
    expect(helpRun.stdout).toContain('Usage:');
    expect(helpRun.stderr).toBe('');
    const envRun = runCli(['score', '--json'], {
      input: 'This is a testament to robust solutions.',
      env: { HUMANIZER_LOCALE: 'not-a-locale' },
    });
    expect(envRun.status).toBe(1);
    expect(envRun.stderr).toContain('Invalid locale "not-a-locale" from HUMANIZER_LOCALE');

    const cliRun = runCli(['score', '--json', '--locale', 'not-a-locale'], {
      input: 'This is a testament to robust solutions.',
    });
    expect(cliRun.status).toBe(1);
    expect(cliRun.stderr).toContain('Invalid locale "not-a-locale" from --locale');

    const cliHelpRun = runCli(['--help', '--locale', 'not-a-locale']);
    expect(cliHelpRun.status).toBe(0);
    expect(cliHelpRun.stdout).toContain('Usage:');
    expect(cliHelpRun.stderr).toBe('');
  });

  it('lets CLI locale override a valid locale env var', () => {
    const run = runCli(['score', '--json', '--locale', 'en'], {
      input: 'This is a testament to robust solutions.',
      env: { HUMANIZER_LOCALE: 'sv' },
    });

    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout)).toHaveProperty('score');
  });

  it('lets CLI locale override env locale validation', () => {
    const run = runCli(['score', '--json', '--locale', 'en'], {
      input: 'This is a testament to robust solutions.',
      env: { HUMANIZER_LOCALE: 'not-a-locale' },
    });

    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout)).toHaveProperty('score');
  });
});

describe('CLI compare robustness', () => {
  it('propagates locale to compare', () => {
    const tmp = tempDir();
    const before = path.join(tmp, 'sv-before.txt');
    const after = path.join(tmp, 'sv-after.txt');
    fs.writeFileSync(
      before,
      'I dagens snabbt föränderliga digitala landskap behöver vi nyttja robusta lösningar. Detta är avgörande för en holistisk strategi.',
    );
    fs.writeFileSync(
      after,
      'Vi ska uppdatera listan på fredag. Karin tar mötet och jag skickar protokollet efter lunch.',
    );

    const run = runCli([
      'compare',
      '--json',
      '--locale',
      'sv',
      '--before',
      before,
      '--after',
      after,
    ]);

    expect(run.status).toBe(0);
    const payload = JSON.parse(run.stdout);
    expect(payload.before.totalMatches).toBeGreaterThan(0);
    expect(payload.delta.score).toBeLessThan(0);
  });

  it('propagates strict mode to compare', () => {
    const tmp = tempDir();
    const before = path.join(tmp, 'strict-before.txt');
    const after = path.join(tmp, 'strict-after.txt');
    fs.writeFileSync(before, 'The chairman asked for manpower estimates.');
    fs.writeFileSync(after, 'The chair asked for staffing estimates.');

    const run = runCli(['compare', '--json', '--strict', '--before', before, '--after', after]);

    expect(run.status).toBe(0);
    const payload = JSON.parse(run.stdout);
    expect(payload.improvements.some((item) => item.patternId === 35)).toBe(true);
  });

  it('reports missing before, after, and both compare files clearly', () => {
    const tmp = tempDir();
    const existing = path.join(tmp, 'existing.txt');
    const missingA = path.join(tmp, 'missing-a.txt');
    const missingB = path.join(tmp, 'missing-b.txt');
    fs.writeFileSync(existing, 'Existing text with enough words for comparison.');

    const firstMissing = runCli(['compare', '--before', missingA, '--after', existing]);
    expect(firstMissing.status).toBe(1);
    expect(firstMissing.stderr).toContain(`before file not found: ${missingA}`);

    const secondMissing = runCli(['compare', '--before', existing, '--after', missingB]);
    expect(secondMissing.status).toBe(1);
    expect(secondMissing.stderr).toContain(`after file not found: ${missingB}`);

    const bothMissing = runCli(['compare', '--before', missingA, '--after', missingB]);
    expect(bothMissing.status).toBe(1);
    expect(bothMissing.stderr).toContain(`before file not found: ${missingA}`);
    expect(bothMissing.stderr).toContain(`after file not found: ${missingB}`);
  });
});

describe('CLI threshold filtering', () => {
  it('filters analyze JSON, report, and suggestions consistently', () => {
    const text = 'This vibrant world-class destination boasts a picturesque landscape.';

    const jsonRun = runCli(['analyze', '--json', '--threshold', '5'], { input: text });
    expect(jsonRun.status).toBe(0);
    const json = JSON.parse(jsonRun.stdout);
    expect(json.findings.length).toBeGreaterThan(0);
    expect(json.findings.every((finding) => finding.weight >= 5)).toBe(true);
    expect(json.totalMatches).toBe(
      json.findings.reduce((sum, finding) => sum + finding.matchCount, 0),
    );
    expect(json.categories.language.matches).toBe(json.totalMatches);
    expect(json.summary).toContain('Filtered to');
    expect(json.unfilteredTotalMatches).toBeGreaterThan(json.totalMatches);

    const reportRun = runCli(['report', '--threshold', '5'], { input: text });
    expect(reportRun.status).toBe(0);
    expect(reportRun.stdout).toContain('### 7. AI vocabulary');
    expect(reportRun.stdout).not.toContain('### 4. Promotional language');
    expect(reportRun.stdout).not.toContain('### 8. Copula avoidance');

    const suggestRun = runCli(['suggest', '--json', '--threshold', '5'], { input: text });
    expect(suggestRun.status).toBe(0);
    const suggestions = JSON.parse(suggestRun.stdout);
    const allSuggestions = [
      ...suggestions.critical,
      ...suggestions.important,
      ...suggestions.minor,
    ];
    expect(allSuggestions.length).toBeGreaterThan(0);
    expect(allSuggestions.every((item) => item.weight >= 5)).toBe(true);
    const uniqueFindingCounts = new Map(
      allSuggestions.map((item) => [item.patternId, item.findingMatchCount]),
    );
    expect(suggestions.totalIssues).toBe(
      [...uniqueFindingCounts.values()].reduce((sum, count) => sum + count, 0),
    );
    expect(suggestions.unfilteredTotalIssues).toBeGreaterThan(suggestions.totalIssues);
    expect(suggestions.guidance.join('\n')).toContain('AI vocabulary');
    expect(suggestions.guidance.join('\n')).not.toContain('promotional');
  });

  it('counts thresholded suggestions by full finding match count when matches are truncated', () => {
    const text = Array.from({ length: 8 }, () => 'This is a robust solution.').join(' ');

    const suggestRun = runCli(['suggest', '--json', '--threshold', '5'], { input: text });
    expect(suggestRun.status).toBe(0);
    const suggestions = JSON.parse(suggestRun.stdout);
    const allSuggestions = [
      ...suggestions.critical,
      ...suggestions.important,
      ...suggestions.minor,
    ];

    expect(allSuggestions.length).toBe(5);
    expect(suggestions.totalIssues).toBe(8);
    expect(suggestions.unfilteredTotalIssues).toBe(8);
  });
});
