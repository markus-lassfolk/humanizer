/**
 * mcp-server-integration.test.js — MCP protocol tests for MCP server
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_SERVER_PATH = path.join(__dirname, '..', 'mcp-server', 'index.js');

/**
 * Helper to communicate with MCP server via stdio
 */
async function mcpRequest(request, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn('node', [MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';

    const finishResolve = (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.removeAllListeners();
      child.removeAllListeners('error');
      child.removeAllListeners('close');
      child.kill();
      resolve(response);
    };

    const finishReject = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.removeAllListeners();
      child.removeAllListeners('error');
      child.removeAllListeners('close');
      child.kill();
      reject(err);
    };

    const timer = setTimeout(() => {
      finishReject(new Error(`MCP request timed out after ${timeout}ms`));
    }, timeout);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      // Try to parse complete JSON-RPC messages
      const lines = stdout.split('\n').filter((line) => line.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id === request.id) {
            finishResolve(response);
            return;
          }
        } catch {
          // Not a complete JSON yet, continue
        }
      }
    });

    child.on('error', (err) => {
      finishReject(err);
    });

    child.on('close', (code) => {
      if (settled) return;
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        finishReject(new Error(`MCP server exited with code ${code}`));
      }
    });

    // Send JSON-RPC request
    child.stdin.write(JSON.stringify(request) + '\n');
  });
}

describe('MCP Server Integration Tests', () => {
  describe('Server initialization', () => {
    it('responds to initialize request', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'humanizer-test', version: '0.0.0' },
        },
      };

      const response = await mcpRequest(request);
      expect(response).toHaveProperty('id', 1);
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result).toHaveProperty('protocolVersion');
      expect(response.result).toHaveProperty('serverInfo');
    });
  });

  describe('Tools listing', () => {
    it('lists available tools', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      };

      const response = await mcpRequest(request);
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);

      // Check for expected tools
      const toolNames = response.result.tools.map((t) => t.name);
      expect(toolNames).toContain('analyze');
      expect(toolNames).toContain('humanize');
      expect(toolNames).toContain('stats');
    });
  });

  describe('Tool invocation - analyze', () => {
    it('analyzes text via MCP protocol', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'analyze',
          arguments: {
            text: 'This is a test sentence.',
            locale: 'en',
          },
        },
      };

      const response = await mcpRequest(request);
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('content');
      expect(Array.isArray(response.result.content)).toBe(true);

      // Check the result content
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toBeDefined();
      expect(content.text.length).toBeGreaterThan(0);
    });

    it('supports Swedish locale', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'analyze',
          arguments: {
            text: 'Detta är en svensk text.',
            locale: 'sv',
          },
        },
      };

      const response = await mcpRequest(request);
      expect(response).toHaveProperty('result');
    });
  });

  describe('Tool invocation - humanize', () => {
    it('provides humanization suggestions', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'humanize',
          arguments: {
            text: 'It is important to note that this is crucial.',
            locale: 'en',
          },
        },
      };

      const response = await mcpRequest(request);
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('content');
    });
  });

  describe('Tool invocation - stats', () => {
    it('returns statistical analysis', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'stats',
          arguments: {
            text: 'This is a test. It has two sentences.',
            locale: 'en',
          },
        },
      };

      const response = await mcpRequest(request);
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('content');

      const content = response.result.content[0];
      expect(content.text).toBeDefined();
      expect(content.text.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('handles invalid tool name', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'invalidtool',
          arguments: {},
        },
      };

      const response = await mcpRequest(request);
      // Should return either an error or a result
      expect(response).toBeDefined();
      expect(response).toHaveProperty('id');
    });

    it('handles missing required parameters', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'analyze',
          arguments: {}, // Missing text parameter
        },
      };

      const response = await mcpRequest(request);
      // Should return either an error or a result
      expect(response).toBeDefined();
      expect(response).toHaveProperty('id');
    });
  });
});
