/**
 * api-server-integration.test.js — HTTP integration tests for API server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, '..', 'api-server', 'server.js');

const POST_ENDPOINTS = ['/api/score', '/api/analyze', '/api/humanize', '/api/stats'];
const INVALID_TEXT_PAYLOADS = [
  {},
  { text: '' },
  { text: '   \n\t' },
  { text: 123 },
  { text: null },
  { text: { secret: 'abc' } },
  { text: ['not', 'a', 'string'] },
];

let serverProcess;
let serverPort;
let serverReady = false;

/**
 * Helper to make HTTP request
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: serverPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await makeRequest('GET', '/api/openapi');
      return true;
    } catch {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }
  }
  return false;
}

describe('API Server Integration Tests', () => {
  beforeAll(async () => {
    // Ephemeral port (PORT=0) avoids EADDRINUSE under parallel test runs / CI.
    serverProcess = spawn('node', [SERVER_PATH], {
      env: { ...process.env, PORT: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    serverPort = await new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error('timeout waiting for server listen line')),
        10000,
      );
      let stdoutBuf = '';
      const onData = (data) => {
        stdoutBuf += data.toString();
        const m = stdoutBuf.match(/running on http:\/\/localhost:(\d+)/);
        if (!m) return;
        clearTimeout(t);
        serverProcess.stdout.off('data', onData);
        resolve(Number(m[1], 10));
      };
      serverProcess.stdout.on('data', onData);
      serverProcess.on('error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    // Wait for server to be ready
    serverReady = await waitForServer();
    if (!serverReady) {
      throw new Error('Server failed to start');
    }
  }, 10000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      // Wait for process to exit
      await new Promise((resolve) => {
        serverProcess.on('close', resolve);
        setTimeout(resolve, 1000); // Fallback timeout
      });
    }
  });

  describe('GET /api/openapi', () => {
    it('returns OpenAPI specification', async () => {
      const response = await makeRequest('GET', '/api/openapi');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/yaml');
      expect(response.body).toContain('openapi');
      expect(response.body).toContain('info');
      expect(response.body).toContain('paths');
    });
  });

  describe('POST /api/score', () => {
    it('returns AI detection score', async () => {
      const response = await makeRequest('POST', '/api/score', {
        text: 'This is a test sentence.',
        locale: 'en',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('score');
      expect(typeof data.score).toBe('number');
      expect(data.score).toBeGreaterThanOrEqual(0);
      expect(data.score).toBeLessThanOrEqual(100);
    });

    it('handles missing text parameter', async () => {
      const response = await makeRequest('POST', '/api/score', {});
      expect(response.statusCode).toBe(400);
    });

    it('supports Swedish locale', async () => {
      const response = await makeRequest('POST', '/api/score', {
        text: 'Detta är en svensk text.',
        locale: 'sv',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('score');
    });
  });

  describe('POST /api/analyze', () => {
    it('returns full analysis with patterns', async () => {
      const response = await makeRequest('POST', '/api/analyze', {
        text: 'It is important to note that this is crucial.',
        locale: 'en',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('findings');
      expect(Array.isArray(data.findings)).toBe(true);
    });

    it('handles ignoreCode option', async () => {
      const response = await makeRequest('POST', '/api/analyze', {
        text: 'Text\n```js\ncode\n```\nMore text',
        ignoreCode: true,
        locale: 'en',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('score');
    });
  });

  describe('POST /api/humanize', () => {
    it('returns humanization suggestions', async () => {
      const response = await makeRequest('POST', '/api/humanize', {
        text: 'It is important to note that this is crucial.',
        locale: 'en',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('critical');
    });

    it('supports autofix option', async () => {
      const response = await makeRequest('POST', '/api/humanize', {
        text: '\u201cQuoted text\u201d',
        autofix: true,
        locale: 'en',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('score');
    });
  });

  describe('POST /api/stats', () => {
    it('returns statistical analysis', async () => {
      const response = await makeRequest('POST', '/api/stats', {
        text: 'This is a test. It has two sentences.',
        locale: 'en',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('wordCount');
      expect(data).toHaveProperty('sentenceCount');
    });
  });

  describe('POST text validation', () => {
    it.each(POST_ENDPOINTS)('rejects invalid text payloads for %s', async (endpoint) => {
      for (const payload of INVALID_TEXT_PAYLOADS) {
        const response = await makeRequest('POST', endpoint, payload);
        expect(response.statusCode, `${endpoint} ${JSON.stringify(payload)}`).toBe(400);
        const data = JSON.parse(response.body);
        expect(data).toEqual({ error: 'text must be a non-empty string' });
      }
    });
  });

  describe('CORS headers', () => {
    it('includes CORS headers in response', async () => {
      const response = await makeRequest('POST', '/api/score', {
        text: 'Test',
      });

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('handles invalid JSON gracefully', async () => {
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: serverPort,
          path: '/api/score',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        };

        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body });
          });
        });

        req.on('error', reject);
        req.write('{ invalid json }');
        req.end();
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 404 for unknown endpoints', async () => {
      const response = await makeRequest('GET', '/api/unknown');
      expect(response.statusCode).toBe(404);
    });

    it('returns 404 for unknown POST endpoints without text validation', async () => {
      const response = await makeRequest('POST', '/api/unknown', {});
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({ error: 'Not found' });
    });

    it('applies body size limits before returning 404 for unknown POST endpoints', async () => {
      const response = await makeRequest('POST', '/api/unknown', {
        text: 'x'.repeat(1_000_001),
      });
      expect(response.statusCode).toBe(413);
      expect(JSON.parse(response.body)).toEqual({ error: 'Request body too large' });
    });
  });
});
