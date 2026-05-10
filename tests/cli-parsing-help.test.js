import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const CLI_PATH = path.resolve(process.cwd(), 'src', 'cli.js');

function runCli(args) {
  return spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
  });
}

describe('cli parsing and help', () => {
  it('parses positional scan target after value flags', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'humanizer-cli-parse-'));
    const targetFile = path.join(tmp, 'doc.md');
    fs.writeFileSync(
      targetFile,
      'This release note includes enough words to pass the scanner minimum word count.',
    );

    const run = runCli(['scan', '--ext', 'md', tmp, '--json']);

    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');

    const payload = JSON.parse(run.stdout);
    expect(payload.targetPath).toBe(tmp);
    expect(payload.summary.scannedFiles).toBe(1);
    expect(payload.files[0].file.endsWith('doc.md')).toBe(true);
  });

  it('shows help badge ranges that match scoreBadge thresholds', () => {
    const run = runCli(['--help']);

    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.stdout).toContain('🟢 0-19    Mostly human-sounding');
    expect(run.stdout).toContain('🟡 20-44   Lightly AI-touched');
    expect(run.stdout).toContain('🟠 45-69   Moderately AI-influenced');
    expect(run.stdout).toContain('🔴 70-100  Heavily AI-generated');
  });
});
