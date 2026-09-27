import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const rl = readline.createInterface({ input, output });

console.log('\nDecisionSnap — Gemini setup');
console.log('Your key is saved only in this local folder as .env and is ignored by Git.');
console.log('If a key was ever shown in a screenshot/chat, revoke it and use a NEW one here.\n');
const key = (await rl.question('Paste your NEW Gemini API key and press Enter: ')).trim();
rl.close();

if (!key || key.length < 20) {
  console.error('\nNo valid-looking key was entered. Nothing was changed.');
  process.exit(1);
}

await writeFile(join(root, '.env'), `GEMINI_API_KEY=${key}\n`, { encoding: 'utf8', mode: 0o600 });
console.log('\n✓ .env created correctly.');
console.log('Next: double-click 2_START_DECISIONSNAP.bat');
