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

const { analyze, score, analyzeChunked } = require('../src/analyzer.js');
const { mergeChunkedForJSON, DEFAULTS } = require('../src/chunk-analyzer.js');
const { humanize } = require('../src/humanizer.js');
const { computeStats } = require('../src/stats.js');
const { loadLocale, SUPPORTED_LOCALES } = require('../src/locales');
const { wordCount } = require('../src/patterns.js');
const { stripCodeSnippets } = require('../src/preprocess.js');

function loadPackageMetadata() {
  try {
    return require('./package.json');
  } catch {
    return require('../package.json');
  }
}

const PORT = process.env.PORT || 3000;
const pkg = loadPackageMetadata();
const PKG_VERSION = typeof pkg.version === 'string' ? pkg.version : '0.0.0';

function parseMaxBodyBytes(rawValue, fallback = 1_000_000) {
  if (rawValue == null || rawValue === '') {
    return fallback;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

const MAX_BODY_BYTES = parseMaxBodyBytes(process.env.MAX_BODY_BYTES);

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
    let settled = false;

    const cleanup = () => {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
    };

    const settleResolve = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const settleReject = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onData = (chunk) => {
      if (settled) return;

      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        const err = new Error('Request body too large');
        err.statusCode = 413;
        settleReject(err);
        return;
      }
      chunks.push(chunk);
    };

    const onEnd = () => {
      if (settled) return;

      try {
        const body = Buffer.concat(chunks).toString('utf8');
        settleResolve(body ? JSON.parse(body) : {});
      } catch {
        const err = new Error('Invalid JSON');
        err.statusCode = 400;
        settleReject(err);
      }
    };

    const onError = (err) => {
      settleReject(err);
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

/** Auto-chunk when word count ≥ 2× windowWords (600 with defaults), unless body.chunked overrides. */
function shouldRunChunked(body, text) {
  const ignoreCode = body.ignoreCode === true;
  const prepared = ignoreCode ? stripCodeSnippets(text) : text;
  const w = wordCount(prepared.trim());
  if (body.chunked === true) return true;
  if (body.chunked === false) return false;
  return w >= 2 * DEFAULTS.windowWords;
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
      const specRaw = await readFile(path.join(__dirname, 'openapi.yaml'), 'utf-8');
      const spec = specRaw.replace(/^  version: .+$/m, `  version: ${PKG_VERSION}`);
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
          {
            error: `Invalid locale "${locale}". Supported locales: ${SUPPORTED_LOCALES.join(', ')}`,
          },
          400,
        );
        return;
      }

      switch (route) {
        case '/api/score': {
          const opts = { locale, ignoreCode: body.ignoreCode === true };
          const s = score(body.text, opts);
          const badge = s <= 19 ? '🟢' : s <= 44 ? '🟡' : s <= 69 ? '🟠' : '🔴';
          const interpretation =
            s <= 19
              ? 'Mostly human-sounding'
              : s <= 44
                ? 'Lightly AI-touched'
                : s <= 69
                  ? 'Moderately AI-influenced'
                  : 'Heavily AI-generated';
          const payload = { score: s, badge, interpretation, locale };
          if (shouldRunChunked(body, body.text)) {
            const chunked = analyzeChunked(body.text, opts);
            payload.chunks = chunked.chunks;
            payload.aggregate = chunked.aggregate;
          }
          sendJson(res, payload);
          return;
        }

        case '/api/analyze': {
          const opts = {
            verbose: body.verbose || false,
            includeStats: true,
            locale,
            ignoreCode: body.ignoreCode === true,
          };
          if (shouldRunChunked(body, body.text)) {
            const chunked = analyzeChunked(body.text, opts);
            sendJson(res, mergeChunkedForJSON(chunked));
          } else {
            sendJson(res, analyze(body.text, opts));
          }
          return;
        }

        case '/api/humanize': {
          const suggestions = humanize(body.text, {
            autofix: body.autofix || false,
            locale,
            ignoreCode: body.ignoreCode === true,
          });
          const chunkOpts = { locale, ignoreCode: body.ignoreCode === true };
          if (shouldRunChunked(body, body.text)) {
            const chunked = analyzeChunked(body.text, chunkOpts);
            sendJson(res, { ...suggestions, chunks: chunked.chunks, aggregate: chunked.aggregate });
          } else {
            sendJson(res, suggestions);
          }
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
  const addr = server.address();
  const actualPort = addr && typeof addr === 'object' ? addr.port : PORT;
  console.log(`Humanizer API server running on http://localhost:${actualPort}`);
  console.log('Endpoints:');
  console.log('  POST /api/score     - Quick AI score');
  console.log('  POST /api/analyze   - Full analysis');
  console.log('  POST /api/humanize  - Humanization suggestions');
  console.log('  POST /api/stats     - Statistical analysis');
  console.log('  GET  /api/openapi   - OpenAPI spec');
});
