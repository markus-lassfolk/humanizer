/**
 * Ensures the Swedish orchestrator script exists and --dry-run exits 0.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

describe('sv-pipeline orchestrator', () => {
  it('dry-run lists phases and exits 0', () => {
    expect(() => {
      execSync('node locales/sv-se/scripts/sv-pipeline.mjs --dry-run', {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('PIPELINE-SNAPSHOT.md exists after a real pipeline run', () => {
    const p = path.join(root, 'locales/sv-se/references/PIPELINE-SNAPSHOT.md');
    expect(fs.existsSync(p)).toBe(true);
    const t = fs.readFileSync(p, 'utf8');
    expect(t).toContain('sv-pipeline:snapshot:start');
    expect(t).toContain('Prescriptive autofixes');
  });
});
