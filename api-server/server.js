#!/usr/bin/env node
/**
 * Humanizer HTTP API Server
 *
 * Simple HTTP server for OpenAI Actions and other integrations.
 * Run with: node api-server/server.js
 *
 * Endpoints:
 *   POST /api/score     - Quick AI score (0-100)
 *   POST /api/analyze   - Full analysis with patterns
 *   POST /api/humanize  - Get humanization suggestions
 *   POST /api/stats     - Statistical analysis only
 *   GET  /api/openapi   - OpenAPI spec
 */

const http = require('http');
const { readFile } = require('fs/promises');
const path = require('path');

const { analyze, score } = require('../src/analyzer.js');
const { humanize } = require('../src/humanizer.js');
const { computeStats } = require('../src/stats.js');
const { loadLocale, SUPPORTED_LOCALES } = require('../src/locales');

const pkg = require('../package.json');

const PORT = process.env.PORT || 3000;
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 1_000_000;

// CORS headers for browser/GPT access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Parse JSON body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let rejected = false;

    const onData = (chunk) => {
      if (rejected) return;

      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        rejected = true;
        const err = new Error('Request body too large');
        err.statusCode = 413;
        reject(err);
        // Remove listeners to prevent any further processing
        req.removeListener('data', onData);
        req.removeListener('end', onEnd);
        req.removeListener('error', onError);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    };

    const onEnd = () => {
      if (rejected) return;

      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        const err = new Error('Invalid JSON');
        err.statusCode = 400;
        reject(err);
      }
    };

    const onError = (err) => {
      if (!rejected) {
        rejected = true;
        reject(err);
      }
    };

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

// Send JSON response
function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    ...corsHeaders,
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}

function isSupportedLocale(locale) {
  return typeof locale === 'string' && SUPPORTED_LOCALES.includes(locale);
}

// Request handler
async function handleRequest(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const route = url.pathname;

  try {
    // GET /api/openapi - Return OpenAPI spec
    if (req.method === 'GET' && route === '/api/openapi') {
      const spec = await readFile(path.join(__dirname, 'openapi.yaml'), 'utf-8');
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/yaml',
      });
      res.end(spec);
      return;
    }

    // GET / - Health check
    if (req.method === 'GET' && route === '/') {
      sendJson(res, {
        status: 'ok',
        name: 'humanizer-api',
        version: pkg.version,
        supportedLocales: SUPPORTED_LOCALES,
        endpoints: ['/api/score', '/api/analyze', '/api/humanize', '/api/stats', '/api/openapi'],
      });
      return;
    }

    // POST endpoints
    if (req.method === 'POST') {
      const body = await parseBody(req);

      if (!body.text) {
        sendJson(res, { error: 'Missing required field: text' }, 400);
        return;
      }

      // Optional locale field: 'en' (default) or 'sv'
      const locale = body.locale || 'en';
      if (!isSupportedLocale(locale)) {
        sendJson(
          res,
          { error: `Invalid locale "${locale}". Supported locales: ${SUPPORTED_LOCALES.join(', ')}` },
          400,
        );
        return;
      }

      switch (route) {
        case '/api/score': {
          const s = score(body.text, { locale });
          const badge = s <= 19 ? '🟢' : s <= 44 ? '🟡' : s <= 69 ? '🟠' : '🔴';
          const interpretation =
            s <= 19
              ? 'Mostly human-sounding'
              : s <= 44
              ? 'Lightly AI-touched'
              : s <= 69
              ? 'Moderately AI-influenced'
              : 'Heavily AI-generated';
          sendJson(res, { score: s, badge, interpretation, locale });
          return;
        }

        case '/api/analyze': {
          const result = analyze(body.text, {
            verbose: body.verbose || false,
            includeStats: true,
            locale,
          });
          sendJson(res, result);
          return;
        }

        case '/api/humanize': {
          const suggestions = humanize(body.text, {
            autofix: body.autofix || false,
            locale,
          });
          sendJson(res, suggestions);
          return;
        }

        case '/api/stats': {
          const localeProfile = loadLocale(locale);
          const stats = computeStats(body.text, localeProfile);
          sendJson(res, stats);
          return;
        }

        default:
          sendJson(res, { error: 'Not found' }, 404);
          return;
      }
    }

    sendJson(res, { error: 'Not found' }, 404);
  } catch (error) {
    console.error('Error:', error);
    const status = error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    sendJson(res, { error: error.message }, status);
  }
}

// Start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Humanizer API server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/score     - Quick AI score');
  console.log('  POST /api/analyze   - Full analysis');
  console.log('  POST /api/humanize  - Humanization suggestions');
  console.log('  POST /api/stats     - Statistical analysis');
  console.log('  GET  /api/openapi   - OpenAPI spec');
});
