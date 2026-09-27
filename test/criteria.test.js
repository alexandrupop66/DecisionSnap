import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCriteria, demoOptions } from '../public/js/demo-data.js';
import { preserveWeights, removeCriterionFromState, rescoreState } from '../public/js/criteria.js';

function baseState() {
  return {
    decision: 'Which laptop gives me the best balance of price, performance, battery life, portability and display quality?',
    criteria: structuredClone(demoCriteria),
    options: structuredClone(demoOptions),
    source: 'demo',
    previousWinnerId: 'laptop-a',
    changedCriterionId: 'price'
  };
}

test('removing a criterion keeps remaining scores and rebalances weights to 100', () => {
  const state = removeCriterionFromState(baseState(), 'display');
  assert.equal(state.criteria.length, 4);
  assert.equal(state.criteria.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.equal('display' in state.options[0].scores, false);
});

test('at least two criteria must remain', () => {
  const state = baseState();
  state.criteria = state.criteria.slice(0, 2);
  assert.throws(() => removeCriterionFromState(state, state.criteria[0].id), /at least two criteria/i);
});

test('preserveWeights retains user priorities when the criterion count stays the same', () => {
  const refreshed = demoCriteria.map((criterion) => ({ ...criterion, weight: 20 }));
  const result = preserveWeights(refreshed, demoCriteria);
  assert.deepEqual(result.map((criterion) => criterion.weight), demoCriteria.map((criterion) => criterion.weight));
});

test('failed AI rescore returns the last valid state unchanged', async () => {
  const state = baseState();
  const snapshot = structuredClone(state);
  const result = await rescoreState(state, ['Price', 'Performance'], async () => {
    throw new Error('Live AI unavailable');
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.state, snapshot);
});

test('successful AI rescore uses fresh scores while preserving existing weight intent', async () => {
  const state = baseState();
  const payload = {
    criteria: state.criteria.map((criterion) => ({ ...criterion, weight: 20 })),
    options: state.options.map((option) => ({ ...option, scores: { ...option.scores, price: 99 } }))
  };
  const result = await rescoreState(state, state.criteria.map((criterion) => criterion.name), async () => payload);
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.criteria.map((criterion) => criterion.weight), demoCriteria.map((criterion) => criterion.weight));
  assert.equal(result.state.options[0].scores.price, 99);
  assert.equal(result.state.source, 'ai');
});
