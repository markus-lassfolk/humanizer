/**
 * cli-integration.test.js — Integration tests for CLI using child process execution
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.join(__dirname, '..', 'src', 'cli.js');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'ai-sample-1.txt');

/**
 * Helper function to run CLI commands
 */
async function runCLI(args, options = {}) {
  const { stdin, timeout = 5000 } = options;

  return new Promise((resolve, reject) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: stdin ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`CLI command timed out after ${timeout}ms`));
    }, timeout);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      // Combine stdout and stderr for output checking
      const output = stdout + stderr;
      resolve({ code, stdout, stderr, output });
    });

    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}

describe('CLI Integration Tests', () => {
  describe('help and version', () => {
    it('shows help with --help flag', async () => {
      const result = await runCLI(['--help']);
      expect(result.code).toBe(0);
      expect(result.output).toContain('humanizer');
    });

    it('shows usage information', async () => {
      const result = await runCLI(['--help']);
      expect(result.output).toContain('Commands');
      expect(result.output).toContain('Options');
    });
  });

  describe('analyze command', () => {
    it('applies full markdown protection on non-chunked markdown analyze paths', async () => {
      const tmp = fs.mkdtempSync(path.join('/tmp', 'humanizer-cli-md-'));
      const file = path.join(tmp, 'short.md');
      fs.writeFileSync(
        file,
        [
          '---',
          'title: robust solutions in the rapidly evolving landscape',
          '---',
          'Plain body text for the document.',
        ].join('\n'),
      );

      const result = await runCLI(['analyze', file, '--json']);
      expect(result.code).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.wordCount).toBe(6);
      expect(JSON.stringify(payload.findings)).not.toContain('rapidly evolving');
    });
    it('analyzes a file and returns results', async () => {
      expect(fs.existsSync(FIXTURE_PATH), `missing fixture: ${FIXTURE_PATH}`).toBe(true);

      const result = await runCLI(['analyze', FIXTURE_PATH]);
      expect(result.code).toBe(0);
      expect(result.output).toContain('Score');
    });

    it('analyzes text from stdin', async () => {
      const result = await runCLI(['analyze'], {
        stdin: 'This is a test sentence.',
      });
      expect(result.code).toBe(0);
      expect(result.output).toContain('Score');
    });

    it('outputs JSON with --json flag', async () => {
      const result = await runCLI(['analyze', '--json'], {
        stdin: 'Test text for JSON output.',
      });
      expect(result.code).toBe(0);
      expect(() => JSON.parse(result.output)).not.toThrow();
    });

    it('outputs stable JSON for very short input', async () => {
      const result = await runCLI(['analyze', '--json'], { stdin: 'Hej.' });
      expect(result.code).toBe(0);
      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveProperty('stats');
      expect(parsed.stats).toHaveProperty('metricAvailability');
      expect(parsed.stats).toHaveProperty('burstiness', null);
      expect(result.output).not.toMatch(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    });
  });

  describe('score command JSON', () => {
    it('outputs stable score JSON for very short input', async () => {
      const result = await runCLI(['score', '--json'], { stdin: 'Hej.' });
      expect(result.code).toBe(0);
      expect(JSON.parse(result.output)).toHaveProperty('score');
      expect(result.output).not.toMatch(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    });
  });

  describe('score command', () => {
    it('returns numeric score', async () => {
      const result = await runCLI(['score'], {
        stdin: 'Simple test text.',
      });

      // Score output includes emoji prefix like "🟢 0/100"
      const match = result.output.match(/(\d+)\/100/);
      expect(match).toBeDefined();
      const score = parseInt(match[1], 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('works with stdin input', async () => {
      const result = await runCLI(['score'], {
        stdin: 'It is important to note that this is crucial.',
      });

      const match = result.output.match(/(\d+)\/100/);
      expect(match).toBeDefined();
      const score = parseInt(match[1], 10);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('humanize command', () => {
    it('provides humanization suggestions', async () => {
      const result = await runCLI(['humanize'], {
        stdin: 'It is important to note that this is crucial.',
      });

      expect(result.output).toContain('Score');
    });

    it('does not rewrite fenced or inline markdown code in --autofix output', async () => {
      const markdown = [
        '# Runbook',
        '',
        'In order to deploy, update the docs.',
        '',
        '```md',
        'In order to deploy, update the config.',
        '```',
        '',
        'Use `in order to` only as a literal phrase.',
      ].join('\n');

      const result = await runCLI(['humanize', '--autofix'], { stdin: markdown });
      expect(result.code).toBe(0);
      expect(result.output).toContain('To deploy, update the docs.');
      expect(result.output).toContain('In order to deploy, update the config.');
      expect(result.output).toContain('`in order to`');
    });
  });

  describe('stats command', () => {
    it('shows statistical analysis', async () => {
      const testFile = path.join(__dirname, 'fixtures', 'human-sample-1.txt');
      expect(fs.existsSync(testFile), `missing fixture: ${testFile}`).toBe(true);

      const result = await runCLI(['stats', testFile]);
      expect(result.output).toContain('words');
    });

    it('does not leak NaN, undefined, or duplicate unavailable labels for very short input', async () => {
      const result = await runCLI(['stats'], { stdin: 'Hej.' });
      expect(result.code).toBe(0);
      expect(result.output).not.toMatch(/\bNaN\b|\bundefined\b|\bInfinity\b/);
      expect(result.output).toContain('unavailable (requires at least 2 sentences)');
      expect(result.output).not.toMatch(/unavailable \([^)]*\)\s+\(unavailable\)/);
    });

    it('shows Flesch-Kincaid, not LIX, for English short-input stats', async () => {
      const result = await runCLI(['stats'], { stdin: 'Hi.' });
      expect(result.code).toBe(0);
      expect(result.output).toContain('Flesch-Kincaid:   unavailable (input too short)');
      expect(result.output).not.toContain('LIX:              unavailable (input too short)');
    });

    it('shows LIX for Swedish short-input stats', async () => {
      const result = await runCLI(['stats', '--locale', 'sv'], { stdin: 'Hej.' });
      expect(result.code).toBe(0);
      expect(result.output).toContain('LIX:              unavailable (input too short)');
      expect(result.output).not.toContain('Flesch-Kincaid:   unavailable (input too short)');
    });

    it('outputs stable stats JSON for very short input', async () => {
      const result = await runCLI(['stats', '--json'], { stdin: 'Hej.' });
      expect(result.code).toBe(0);
      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveProperty('metricAvailability');
      expect(parsed).toHaveProperty('burstiness', null);
      expect(result.output).not.toMatch(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    });
  });

  describe('report command', () => {
    it('does not leak NaN, undefined, or duplicate unavailable labels for very short input', async () => {
      const result = await runCLI(['report'], { stdin: 'Hej.' });
      expect(result.code).toBe(0);
      expect(result.output).not.toMatch(/\bNaN\b|\bundefined\b|\bInfinity\b/);
      expect(result.output).toContain('unavailable (requires at least 2 sentences)');
      expect(result.output).not.toMatch(/unavailable \([^)]*\)\s+\(unavailable\)/);
    });
  });

  describe('Error handling', () => {
    it('handles nonexistent files gracefully', async () => {
      const result = await runCLI(['analyze', '/nonexistent/file.txt']);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain('Error');
    });

    it('handles invalid commands', async () => {
      const result = await runCLI(['invalidcommand']);
      expect(result.code).not.toBe(0);
      expect(result.output.length).toBeGreaterThan(0);
    });
  });

  describe('Swedish locale support', () => {
    it('analyzes Swedish text with --locale sv', async () => {
      const testFile = path.join(__dirname, 'fixtures', 'sv-human-sample-1.txt');
      expect(fs.existsSync(testFile), `missing fixture: ${testFile}`).toBe(true);

      const result = await runCLI(['analyze', testFile, '--locale', 'sv']);
      expect(result.output).toContain('Score');
    });
  });
});
