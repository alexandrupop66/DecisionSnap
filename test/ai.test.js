import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyseDecision,
  buildGeminiRequest,
  normaliseAnalysis,
  parseGeminiInteraction,
  validateAnalysisInput
} from '../src/ai.js';

const input = {
  decision: 'Which laptop gives me the best balance of price, performance, battery life, portability and display quality?',
  options: ['Laptop A', 'Laptop B', 'Laptop C']
};

const options = validateAnalysisInput(input).options;
const structured = {
  criteria: [
    {
      id: 'price',
      name: 'Price',
      reason: 'Budget matters.',
      scores: [
        { optionId: 'option-1', score: 50, reason: 'High price.' },
        { optionId: 'option-2', score: 70, reason: 'Mid price.' },
        { optionId: 'option-3', score: 90, reason: 'Low price.' }
      ]
    },
    {
      id: 'performance',
      name: 'Performance',
      reason: 'Speed matters.',
      scores: [
        { optionId: 'option-1', score: 95, reason: 'Fast.' },
        { optionId: 'option-2', score: 80, reason: 'Good.' },
        { optionId: 'option-3', score: 60, reason: 'Basic.' }
      ]
    },
    {
      id: 'battery',
      name: 'Battery',
      reason: 'Mobility matters.',
      scores: [
        { optionId: 'option-1', score: 85, reason: 'Long.' },
        { optionId: 'option-2', score: 75, reason: 'Good.' },
        { optionId: 'option-3', score: 65, reason: 'Average.' }
      ]
    },
    {
      id: 'portability',
      name: 'Portability',
      reason: 'Weight matters.',
      scores: [
        { optionId: 'option-1', score: 60, reason: 'Heavy.' },
        { optionId: 'option-2', score: 75, reason: 'Medium.' },
        { optionId: 'option-3', score: 90, reason: 'Light.' }
      ]
    }
  ]
};

test('validateAnalysisInput accepts a decision with two or three unique options', () => {
  const result = validateAnalysisInput(input);
  assert.equal(result.options.length, 3);
  assert.equal(result.options[0].id, 'option-1');
});

test('validateAnalysisInput rejects incomplete input', () => {
  assert.throws(() => validateAnalysisInput({ decision: '', options: ['A'] }), /decision/i);
});

test('Gemini request forbids the model from selecting a winner and supplies a schema', () => {
  const request = buildGeminiRequest(input.decision, options);
  assert.equal(request.model, 'gemini-3.8-flash');
  assert.equal(request.response_format.mime_type, 'application/json');
  assert.match(request.input, /Do not choose a winner/i);
});

test('normaliseAnalysis turns AI criteria into equal weights totalling 100', () => {
  const result = normaliseAnalysis(structured, options);
  assert.equal(result.criteria.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.deepEqual(result.criteria.map((criterion) => criterion.weight), [25, 25, 25, 25]);
  assert.equal(result.options[2].scores.price, 90);
});

test('parseGeminiInteraction accepts an Interactions API model_output step', () => {
  const result = parseGeminiInteraction({
    steps: [
      { type: 'user_input', content: [{ type: 'text', text: 'input' }] },
      { type: 'model_output', content: [{ type: 'text', text: JSON.stringify(structured) }] }
    ]
  }, options);
  assert.equal(result.criteria[0].name, 'Price');
});

test('malformed AI output is rejected cleanly', () => {
  const malformed = structuredClone(structured);
  malformed.criteria[0].scores.pop();
  assert.throws(() => normaliseAnalysis(malformed, options), /did not score every option/i);
});

test('analyseDecision returns a clear error when API key is absent', async () => {
  await assert.rejects(
    () => analyseDecision(input, { apiKey: '' }),
    (error) => error.code === 'AI_NOT_CONFIGURED' && error.status === 503
  );
});

test('analyseDecision normalises a successful structured Gemini response', async () => {
  const fakeFetch = async (_url, request) => {
    const sent = JSON.parse(request.body);
    assert.equal(sent.model, 'gemini-3.8-flash');
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(structured) }] }]
        };
      }
    };
  };

  const result = await analyseDecision(input, { apiKey: 'test-key', fetchImpl: fakeFetch });
  assert.equal(result.source, 'ai');
  assert.equal(result.decision, input.decision);
  assert.equal(result.criteria.length, 4);
  assert.equal(result.options[0].name, 'Laptop A');
});

test('fixed criteria constrain the structured schema and prompt', () => {
  const request = buildGeminiRequest(input.decision, options, ['Price', 'Battery']);
  assert.equal(request.response_format.schema.properties.criteria.minItems, 2);
  assert.equal(request.response_format.schema.properties.criteria.maxItems, 2);
  assert.match(request.input, /Use exactly these criteria/i);
  assert.match(request.input, /1\. Price/);
});

test('analyseDecision rejects a rescore response that changes requested criteria', async () => {
  const renamed = structuredClone(structured);
  renamed.criteria = renamed.criteria.slice(0, 2);
  renamed.criteria[0].name = 'Cost';
  renamed.criteria[1].name = 'Battery';
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(renamed) }] }] };
    }
  });
  await assert.rejects(
    () => analyseDecision({ ...input, criteria: ['Price', 'Battery'] }, { apiKey: 'test-key', fetchImpl: fakeFetch }),
    /changed the requested criterion set/i
  );
});

test('analyseDecision falls back from a busy Flash model to the next stable model', async () => {
  const calls = [];
  const fakeFetch = async (_url, request) => {
    const sent = JSON.parse(request.body);
    calls.push(sent.model);
    if (calls.length === 1) {
      return { ok: false, status: 503, async json() { return { error: { message: 'currently experiencing high demand' } }; } };
    }
    return {
      ok: true, status: 200,
      async json() { return { steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(structured) }] }] }; }
    };
  };
  const result = await analyseDecision(input, { apiKey: 'test-key', fetchImpl: fakeFetch });
  assert.deepEqual(calls.slice(0, 2), ['gemini-3.8-flash', 'gemini-3.7-flash']);
  assert.equal(result.model, 'gemini-3.7-flash');
});
