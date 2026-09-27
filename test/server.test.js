import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';

async function withServer(run) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET / serves DecisionSnap', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Analyse with AI/);
    assert.match(html, /Reset to laptop demo/);
    assert.match(html, /id="criteria-inputs"/);
    assert.match(html, /id="options-inputs"/);
  });
});

test('POST /api/analyse rejects incomplete input', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: '', options: ['Only one'] })
    });
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.code, 'INVALID_INPUT');
  });
});

test('POST /api/analyse reports absent API configuration without breaking the app', async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await withServer(async (base) => {
      const response = await fetch(`${base}/api/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'Which laptop gives me the best balance of price, performance, battery life, portability and display quality?',
          options: ['Laptop A', 'Laptop B']
        })
      });
      const payload = await response.json();
      assert.equal(response.status, 503);
      assert.equal(payload.code, 'AI_NOT_CONFIGURED');
      assert.match(payload.error, /use the demo/i);
    });
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});

test('GET /api/status reports whether Gemini is configured without exposing the key', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/status`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(typeof payload.aiConfigured, 'boolean');
    assert.equal(payload.model, 'gemini-3.8-flash');
    assert.equal('apiKey' in payload, false);
  });
});
