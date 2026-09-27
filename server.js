import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyseDecision, AnalysisError, DEFAULT_MODEL, MODEL_FALLBACKS } from './src/ai.js';
import { loadLocalEnv } from './src/config.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const ENV_STATUS = loadLocalEnv(ROOT);
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), 'application/json; charset=utf-8');
}

async function readJson(req, maxBytes = 16_384) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new AnalysisError('Request is too large.', 'INVALID_INPUT', 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new AnalysisError('Request body must be valid JSON.', 'INVALID_INPUT', 400);
  }
}

async function handleAnalyse(req, res) {
  try {
    const input = await readJson(req);
    const result = await analyseDecision(input);
    sendJson(res, 200, result);
  } catch (error) {
    const known = error instanceof AnalysisError;
    sendJson(res, known ? error.status : 500, {
      error: known ? error.message : 'DecisionSnap could not analyse this decision.',
      code: known ? error.code : 'INTERNAL_ERROR'
    });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, safe);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, 'Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const body = await readFile(filePath);
    send(res, 200, req.method === 'HEAD' ? '' : body, MIME[extname(filePath)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found');
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/status') {
      sendJson(res, 200, {
        aiConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
        model: DEFAULT_MODEL,
        fallbackModels: MODEL_FALLBACKS,
        envSource: ENV_STATUS.source,
        warning: ENV_STATUS.warning
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/analyse') {
      await handleAnalyse(req, res);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      await serveStatic(req, res);
      return;
    }

    send(res, 404, 'Not found');
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => {
    console.log(`DecisionSnap running at http://localhost:${PORT}`);
    console.log(`Gemini AI: ${process.env.GEMINI_API_KEY ? `READY (${DEFAULT_MODEL})` : 'NOT CONFIGURED'}`);
    if (ENV_STATUS.warning) console.log(`Setup warning: ${ENV_STATUS.warning}`);
    if (!process.env.GEMINI_API_KEY) console.log('Run 1_SETUP_GEMINI_KEY.bat, then restart DecisionSnap.');
  });
}
