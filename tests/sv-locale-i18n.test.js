import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyze } from '../src/analyzer.js';
import { humanize } from '../src/humanizer.js';
import { compareTexts } from '../src/workflows.js';

const CLI_PATH = path.resolve(process.cwd(), 'src', 'cli.js');

function runCli(args, options = {}) {
  return spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    input: options.input,
    env: { ...process.env, ...(options.env || {}) },
  });
}

function compactResult(result) {
  return {
    score: result.score,
    patternScore: result.patternScore,
    totalMatches: result.totalMatches,
    findings: result.findings.map((finding) => ({
      id: finding.patternId,
      matches: finding.matches.map((match) => match.match),
    })),
  };
}

describe('Swedish Unicode normalization', () => {
  it('treats NFC and NFD Swedish vocabulary as equivalent', () => {
    const nfc =
      'Det är en sömlös lösning. Detta är avgörande för våra föränderliga mål och kräver robusta lösningar.';
    const nfd = nfc.normalize('NFD');

    expect(nfd).not.toBe(nfc);

    const nfcResult = analyze(nfc, { locale: 'sv', verbose: true });
    const nfdResult = analyze(nfd, { locale: 'sv', verbose: true });

    expect(compactResult(nfdResult)).toEqual(compactResult(nfcResult));
    expect(nfdResult.findings.some((finding) => finding.patternId === 7)).toBe(true);
    expect(nfdResult.findings.flatMap((finding) => finding.matches.map((m) => m.match))).toContain(
      'sömlös',
    );
  });

  it('detects decomposed å, ä, and ö forms like composed Swedish text', () => {
    const nfc = 'En avgörande förändring kräver en sömlös lösning.';
    const nfd = nfc.normalize('NFD');

    const nfcResult = analyze(nfc, { locale: 'sv', verbose: true });
    const nfdResult = analyze(nfd, { locale: 'sv', verbose: true });

    expect(nfdResult.score).toBe(nfcResult.score);
    expect(nfdResult.totalMatches).toBe(nfcResult.totalMatches);
    expect(nfdResult.findings.flatMap((finding) => finding.matches.map((m) => m.match))).toContain(
      'sömlös',
    );
  });
});

describe('Short Swedish scoring', () => {
  it('flags short Swedish AI-like text with high-signal vocabulary', () => {
    const text = 'I dagens digitala landskap är det avgörande att skapa en robust lösning.';
    const result = analyze(text, { locale: 'sv', verbose: true });

    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.totalMatches).toBeGreaterThan(0);
    expect(result.reliability.level).toBe('low');
    expect(result.reliability.reasons).toContain('Sample is very short (<80 words).');
    expect(result.findings.some((finding) => finding.patternId === 7)).toBe(true);
  });

  it('does not over-score short natural Swedish text', () => {
    const samples = [
      'Jag hämtar barnen klockan fyra och köper mjölk på vägen hem.',
      'Mötet är flyttat till tisdag. Skicka gärna underlaget före lunch.',
      'Bussen var sen i morse, så jag tog cykeln till kontoret.',
    ];

    for (const sample of samples) {
      const result = analyze(sample, { locale: 'sv', verbose: true });
      expect(result.score, sample).toBeLessThanOrEqual(19);
      expect(result.totalMatches, sample).toBe(0);
    }
  });
});

describe('Swedish localized suggestions', () => {
  it('uses Swedish wording for Swedish vocabulary suggestions', () => {
    const text =
      'I dagens snabbt föränderliga digitala landskap är det av yttersta vikt att organisationer utnyttjar innovativa lösningar för att skapa värde. Denna omfattande guide fördjupar sig i centrala aspekter och erbjuder en holistisk ansats som möjliggör sömlös samverkan, robust utveckling och meningsfulla resultat.';

    const result = humanize(text, { locale: 'sv' });
    const suggestions = [...result.critical, ...result.important, ...result.minor].map(
      (item) => item.suggestion,
    );

    expect(suggestions.some((suggestion) => suggestion.includes('AI-typiskt ord nivå'))).toBe(true);
    expect(suggestions.join('\n')).toContain('Byt till ett enklare och mer konkret alternativ.');
    expect(suggestions.join('\n')).not.toMatch(/Use a simpler, more specific alternative/);
    expect(suggestions.join('\n')).not.toMatch(/Tier [123] AI word/);
  });

  it('prints localized Swedish suggestions through the CLI', () => {
    const run = runCli(['suggest', '--locale', 'sv'], {
      input: 'Det här är en sömlös lösning med robusta lösningar för kunden.',
    });

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('AI-typiskt ord nivå');
    expect(run.stdout).toContain('Byt till ett enklare och mer konkret alternativ.');
    expect(run.stdout).not.toContain('Use a simpler, more specific alternative');
  });
});

describe('Swedish compare and locale validation coverage', () => {
  it('compares Swedish texts with locale-aware analysis options', () => {
    const before =
      'I dagens snabbt föränderliga digitala landskap behöver vi nyttja robusta lösningar. Detta är avgörande för en holistisk strategi.';
    const after =
      'Vi ska uppdatera listan på fredag. Karin tar mötet och jag skickar protokollet efter lunch.';

    const result = compareTexts(before, after, { locale: 'sv' });

    expect(result.before.totalMatches).toBeGreaterThan(0);
    expect(result.delta.score).toBeLessThan(0);
    expect(result.improvements.some((item) => item.patternId === 7)).toBe(true);
  });

  it('rejects unsupported locales from env and CLI while accepting sv', () => {
    const envRun = runCli(['score', '--json'], {
      input: 'Det är en sömlös lösning.',
      env: { HUMANIZER_LOCALE: 'not-a-locale' },
    });
    expect(envRun.status).toBe(1);
    expect(envRun.stderr).toContain('Invalid locale "not-a-locale" from HUMANIZER_LOCALE');

    const cliRun = runCli(['score', '--json', '--locale', 'not-a-locale'], {
      input: 'Det är en sömlös lösning.',
    });
    expect(cliRun.status).toBe(1);
    expect(cliRun.stderr).toContain('Invalid locale "not-a-locale" from --locale');

    const validRun = runCli(['score', '--json', '--locale', 'sv'], {
      input: 'Det är en sömlös lösning.',
    });
    expect(validRun.status).toBe(0);
    expect(JSON.parse(validRun.stdout).score).toBeGreaterThan(0);
  });

  it('validates locale while running compare from the CLI', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-sv-compare-'));
    const before = path.join(tmp, 'before.txt');
    const after = path.join(tmp, 'after.txt');
    fs.writeFileSync(before, 'Det är en sömlös lösning med robusta lösningar.');
    fs.writeFileSync(after, 'Karin skickar listan efter lunch.');

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
    expect(JSON.parse(run.stdout).before.totalMatches).toBeGreaterThan(0);
  });
});
