const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
export const MODEL_FALLBACKS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'];
export const DEFAULT_MODEL = MODEL_FALLBACKS[0];

export class AnalysisError extends Error {
  constructor(message, code = 'ANALYSIS_FAILED', status = 502) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.status = status;
  }
}

export function validateAnalysisInput(input) {
  const decision = typeof input?.decision === 'string' ? input.decision.trim() : '';
  const rawOptions = Array.isArray(input?.options) ? input.options : [];
  const names = rawOptions
    .map((option) => typeof option === 'string' ? option.trim() : String(option?.name || '').trim())
    .filter(Boolean);

  if (!decision) {
    throw new AnalysisError('Add the decision you want to make.', 'INVALID_INPUT', 400);
  }
  if (decision.length > 240) {
    throw new AnalysisError('Keep the decision under 240 characters.', 'INVALID_INPUT', 400);
  }
  if (names.length < 2 || names.length > 3) {
    throw new AnalysisError('Add two or three options.', 'INVALID_INPUT', 400);
  }
  if (names.some((name) => name.length > 100)) {
    throw new AnalysisError('Keep each option under 100 characters.', 'INVALID_INPUT', 400);
  }
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    throw new AnalysisError('Use different names for each option.', 'INVALID_INPUT', 400);
  }

  const rawCriteria = Array.isArray(input?.criteria) ? input.criteria : [];
  const criteria = rawCriteria.map((name) => String(name || '').trim()).filter(Boolean);
  if (criteria.length && (criteria.length < 2 || criteria.length > 6)) {
    throw new AnalysisError('Use between two and six active criteria.', 'INVALID_INPUT', 400);
  }
  if (new Set(criteria.map((name) => name.toLowerCase())).size !== criteria.length) {
    throw new AnalysisError('Criterion names must be unique.', 'INVALID_INPUT', 400);
  }

  return {
    decision,
    options: names.map((name, index) => ({ id: `option-${index + 1}`, name })),
    criteria
  };
}

function schemaFor(optionIds, criterionCount) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      criteria: {
        type: 'array',
        minItems: criterionCount || 4,
        maxItems: criterionCount || 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string', description: 'Short lowercase identifier.' },
            name: { type: 'string', description: 'Short human-readable criterion name.' },
            reason: { type: 'string', description: 'One short sentence explaining why this criterion matters.' },
            scores: {
              type: 'array',
              minItems: optionIds.length,
              maxItems: optionIds.length,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  optionId: { type: 'string', enum: optionIds },
                  score: { type: 'integer', minimum: 0, maximum: 100 },
                  reason: { type: 'string', description: 'Very short reason for this score.' }
                },
                required: ['optionId', 'score', 'reason']
              }
            }
          },
          required: ['id', 'name', 'reason', 'scores']
        }
      }
    },
    required: ['criteria']
  };
}

export function buildGeminiRequest(decision, options, fixedCriteria = [], model = DEFAULT_MODEL) {
  const optionLines = options.map((option) => `- ${option.id}: ${option.name}`).join('\n');
  const fixedInstruction = fixedCriteria.length
    ? `\nUse exactly these criteria, in this order, and do not add or remove any: ${fixedCriteria.map((name, index) => `${index + 1}. ${name}`).join(' | ')}.`
    : '';
  const criteriaInstruction = fixedCriteria.length
    ? 'Score every option against the exact criteria listed below.'
    : 'Create 4 or 5 criteria that are genuinely useful for comparing these exact options.';
  const prompt = `You are the analysis layer of DecisionSnap, a transparent decision-support tool.\n\nDecision: ${decision}\nOptions:\n${optionLines}\n\n${criteriaInstruction} Score every option on every criterion from 0 to 100, where 100 always means MORE DESIRABLE for the user's decision. For cost/price criteria, a lower real-world cost must therefore receive a higher desirability score. Keep criterion names short. Keep all reasons concise. If exact factual specifications were not supplied, make reasonable comparative estimates and do not pretend they are verified facts. Do not choose a winner, rank the options, assign weights, or add options.${fixedInstruction} Return only the schema-defined JSON.`;

  return {
    model,
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: schemaFor(options.map((option) => option.id), fixedCriteria.length || undefined)
    }
  };
}

export function extractInteractionText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const containers = [payload?.steps, payload?.outputs, payload?.output].filter(Array.isArray);
  for (const list of containers) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i];
      const content = Array.isArray(item?.content) ? item.content : [];
      for (let j = content.length - 1; j >= 0; j -= 1) {
        if (typeof content[j]?.text === 'string' && content[j].text.trim()) return content[j].text;
      }
      if (typeof item?.text === 'string' && item.text.trim()) return item.text;
    }
  }

  throw new AnalysisError('Gemini returned no usable JSON.', 'MALFORMED_AI_RESPONSE', 502);
}

function slugify(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug || fallback;
}

function equalWeights(count) {
  const base = Math.floor(100 / count);
  let remainder = 100 - base * count;
  return Array.from({ length: count }, () => base + (remainder-- > 0 ? 1 : 0));
}

export function normaliseAnalysis(raw, options) {
  if (!raw || !Array.isArray(raw.criteria) || raw.criteria.length < 2 || raw.criteria.length > 6) {
    throw new AnalysisError('Gemini returned an invalid criterion list.', 'MALFORMED_AI_RESPONSE', 502);
  }

  const optionIds = new Set(options.map((option) => option.id));
  const usedIds = new Set();
  const weights = equalWeights(raw.criteria.length);
  const criteria = [];
  const scoreMaps = Object.fromEntries(options.map((option) => [option.id, {}]));

  raw.criteria.forEach((criterion, index) => {
    const name = String(criterion?.name || '').trim();
    if (!name) throw new AnalysisError('Gemini returned an unnamed criterion.', 'MALFORMED_AI_RESPONSE', 502);

    let id = slugify(criterion?.id || name, `criterion-${index + 1}`);
    if (usedIds.has(id)) id = `${id}-${index + 1}`;
    usedIds.add(id);

    if (!Array.isArray(criterion?.scores) || criterion.scores.length !== options.length) {
      throw new AnalysisError(`Gemini did not score every option for ${name}.`, 'MALFORMED_AI_RESPONSE', 502);
    }

    const seen = new Set();
    criterion.scores.forEach((entry) => {
      const optionId = String(entry?.optionId || '');
      const score = Number(entry?.score);
      if (!optionIds.has(optionId) || seen.has(optionId) || !Number.isInteger(score) || score < 0 || score > 100) {
        throw new AnalysisError(`Gemini returned an invalid score for ${name}.`, 'MALFORMED_AI_RESPONSE', 502);
      }
      seen.add(optionId);
      scoreMaps[optionId][id] = score;
    });

    criteria.push({
      id,
      name: name.slice(0, 60),
      weight: weights[index],
      reason: String(criterion?.reason || '').trim().slice(0, 180)
    });
  });

  const normalisedOptions = options.map((option) => ({
    ...option,
    scores: scoreMaps[option.id]
  }));

  return { criteria, options: normalisedOptions, source: 'ai' };
}

export function parseGeminiInteraction(payload, options) {
  const text = extractInteractionText(payload);
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AnalysisError('Gemini returned invalid JSON.', 'MALFORMED_AI_RESPONSE', 502);
  }
  return normaliseAnalysis(raw, options);
}

export async function analyseDecision(input, { apiKey = process.env.GEMINI_API_KEY, fetchImpl = fetch } = {}) {
  const validated = validateAnalysisInput(input);
  if (!apiKey) {
    throw new AnalysisError('Live AI is not configured. Add GEMINI_API_KEY or use the demo.', 'AI_NOT_CONFIGURED', 503);
  }

  let response;
  let payload;
  let modelUsed;
  let lastOverloadMessage = '';

  for (const model of MODEL_FALLBACKS) {
    try {
      response = await fetchImpl(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(buildGeminiRequest(validated.decision, validated.options, validated.criteria, model))
      });
    } catch {
      lastOverloadMessage = 'Could not reach Gemini.';
      continue;
    }

    try {
      payload = await response.json();
    } catch {
      throw new AnalysisError('Gemini returned an unreadable response.', 'AI_UNAVAILABLE', 502);
    }

    if (response.ok) {
      modelUsed = model;
      break;
    }

    const upstream = payload?.error?.message || '';
    const overloaded = response.status === 429 || response.status === 503 || /high demand|overload|temporar|capacity/i.test(upstream);
    if (overloaded) {
      lastOverloadMessage = upstream || `Gemini ${model} is temporarily busy.`;
      continue;
    }

    throw new AnalysisError(upstream ? `Gemini error: ${upstream}` : 'Gemini could not analyse this decision.', 'AI_UNAVAILABLE', 502);
  }

  if (!modelUsed) {
    throw new AnalysisError(`Gemini is temporarily busy across the available Flash models. ${lastOverloadMessage}`.trim(), 'AI_UNAVAILABLE', 503);
  }

  const parsed = parseGeminiInteraction(payload, validated.options);
  if (validated.criteria.length) {
    const returnedNames = parsed.criteria.map((criterion) => criterion.name.toLowerCase());
    const expectedNames = validated.criteria.map((name) => name.toLowerCase());
    if (returnedNames.some((name, index) => name !== expectedNames[index])) {
      throw new AnalysisError('Gemini changed the requested criterion set.', 'MALFORMED_AI_RESPONSE', 502);
    }
  }
  return {
    decision: validated.decision,
    model: modelUsed,
    ...parsed
  };
}
