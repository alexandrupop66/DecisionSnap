import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseEnvText(text) {
  const values = {};
  for (const rawLine of String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) values[key] = value;
  }
  return values;
}

export function loadLocalEnv(rootDir) {
  const envPath = join(rootDir, '.env');
  const envTxtPath = join(rootDir, '.env.txt');
  let source = null;
  let warning = null;

  if (existsSync(envPath)) {
    const parsed = parseEnvText(readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
    source = '.env';
  } else if (existsSync(envTxtPath)) {
    warning = 'Found .env.txt instead of .env. Run 1_SETUP_GEMINI_KEY.bat to fix it.';
  }

  return {
    source,
    warning,
    aiConfigured: Boolean(String(process.env.GEMINI_API_KEY || '').trim())
  };
}
