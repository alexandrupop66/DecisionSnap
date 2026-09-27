import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCriteria, demoOptions } from '../public/js/demo-data.js';
import { calculateRanking, isNearTie, normaliseWeights, rebalanceWeights } from '../public/js/scoring.js';

test('demo weights total 100', () => {
  assert.equal(demoCriteria.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
});

test('normaliseWeights returns exact integer total of 100', () => {
  const result = normaliseWeights([
    { id: 'a', weight: 1 },
    { id: 'b', weight: 1 },
    { id: 'c', weight: 1 }
  ]);
  assert.equal(result.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  result.forEach((criterion) => assert.equal(Number.isInteger(criterion.weight), true));
});

test('changing one weight proportionally rebalances others to 100', () => {
  const result = rebalanceWeights(demoCriteria, 'price', 60);
  assert.equal(result.find((criterion) => criterion.id === 'price').weight, 60);
  assert.equal(result.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.deepEqual(result.map((criterion) => criterion.weight), [60, 17, 11, 6, 6]);
});

test('same inputs always produce same ranking', () => {
  const first = calculateRanking(demoOptions, demoCriteria);
  const second = calculateRanking(demoOptions, demoCriteria);
  assert.deepEqual(first, second);
});

test('Laptop A wins the initial demo state', () => {
  const ranking = calculateRanking(demoOptions, demoCriteria);
  assert.equal(ranking[0].id, 'laptop-a');
  assert.equal(ranking[0].total.toFixed(1), '80.8');
});

test('Laptop C wins when price becomes 60%', () => {
  const priceFirst = rebalanceWeights(demoCriteria, 'price', 60);
  const ranking = calculateRanking(demoOptions, priceFirst);
  assert.equal(ranking[0].id, 'laptop-c');
  assert.equal(priceFirst.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.ok(ranking[0].total - ranking[1].total > 5);
});

test('near ties are detected without forcing false certainty', () => {
  const ranking = [
    { id: 'a', total: 80.2 },
    { id: 'b', total: 80.0 }
  ];
  assert.equal(isNearTie(ranking), true);
});
