import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { loadLocalEnv } from '../src/config.js';
import { DEFAULT_MODEL, MODEL_FALLBACKS } from '../src/ai.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const status = loadLocalEnv(root);
const key = String(process.env.GEMINI_API_KEY || '').trim();

console.log('\nDecisionSnap doctor');
console.log(`Node: ${process.version}`);
console.log(`.env: ${status.source || 'not found'}`);
if (status.warning) console.log(`Warning: ${status.warning}`);
console.log(`Gemini key: ${key ? 'found' : 'missing'}`);
console.log(`Preferred model: ${DEFAULT_MODEL}`);
console.log(`Fallbacks: ${MODEL_FALLBACKS.slice(1).join(', ')}`);

if (!key) {
  console.error('\n✗ Gemini key is not configured. Run 1_SETUP_GEMINI_KEY.bat.');
  process.exit(1);
}

try {
  let connectedModel = null;
  let lastMessage = '';
  for (const model of MODEL_FALLBACKS) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ model, input: 'Reply with exactly: DecisionSnap AI ready' })
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      connectedModel = model;
      break;
    }
    lastMessage = body?.error?.message || `HTTP ${response.status}`;
    if (![429, 503].includes(response.status) && !/high demand|overload|temporar|capacity/i.test(lastMessage)) {
      console.error(`\n✗ Gemini API returned HTTP ${response.status}.`);
      console.error(lastMessage);
      process.exit(1);
    }
  }
  if (!connectedModel) {
    console.error('\n✗ All configured Gemini Flash models are temporarily busy.');
    if (lastMessage) console.error(lastMessage);
    process.exit(1);
  }
  console.log(`\n✓ Gemini API connection works with ${connectedModel}.`);
  console.log('✓ DecisionSnap AI is ready.');
} catch (error) {
  console.error('\n✗ Could not reach Gemini API. Check your internet/firewall.');
  console.error(error.message);
  process.exit(1);
}
