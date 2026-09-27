export function normaliseLabel(value) {
  return String(value ?? '').trim();
}

export function uniqueLabels(values = []) {
  const seen = new Set();
  const result = [];
  for (const raw of values) {
    const label = normaliseLabel(raw);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

export function availableLabels(catalog = [], active = []) {
  const activeKeys = new Set(uniqueLabels(active).map((label) => label.toLowerCase()));
  return uniqueLabels(catalog).filter((label) => !activeKeys.has(label.toLowerCase()));
}

export function addLabel(values = [], label, max = Infinity) {
  const clean = normaliseLabel(label);
  const current = uniqueLabels(values);
  if (!clean) return { values: current, added: false, reason: 'empty' };
  if (current.length >= max) return { values: current, added: false, reason: 'max' };
  if (current.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    return { values: current, added: false, reason: 'duplicate' };
  }
  return { values: [...current, clean], added: true, reason: null };
}
