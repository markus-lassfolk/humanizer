/**
 * Ensures English TSV-driven prescriptive locale is committed in sync.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..', '..');

describe('English prescriptive codegen', () => {
  it('en-prescriptive.js matches TSV sources (--check)', () => {
    expect(() => {
      execSync('node locales/en-en/scripts/build-en-locale-prescriptive.mjs --check', {
        cwd: root,
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});
