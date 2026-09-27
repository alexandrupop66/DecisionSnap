import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvText } from '../src/config.js';

test('parseEnvText reads Gemini key from Windows or Unix env text', () => {
  assert.equal(parseEnvText('GEMINI_API_KEY=abc123\r\n').GEMINI_API_KEY, 'abc123');
  assert.equal(parseEnvText('GEMINI_API_KEY="quoted-key"\n').GEMINI_API_KEY, 'quoted-key');
});
