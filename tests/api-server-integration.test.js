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
const TEST_PORT = 3456; // Use a different port for testing

let serverProcess;
let serverReady = false;

/**
 * Helper to make HTTP request
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: TEST_PORT,
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
    // Start the server
    serverProcess = spawn('node', [SERVER_PATH], {
      env: { ...process.env, PORT: TEST_PORT.toString() },
      stdio: 'pipe',
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
          port: TEST_PORT,
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
  });
});
