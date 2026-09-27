import test from 'node:test';
import assert from 'node:assert/strict';
import { addLabel, availableLabels, uniqueLabels } from '../public/js/composer.js';

test('availableLabels returns removed catalog items but hides active ones', () => {
  const catalog = ['Price', 'Performance', 'Battery life', 'Portability'];
  const active = ['Performance', 'Portability'];
  assert.deepEqual(availableLabels(catalog, active), ['Price', 'Battery life']);
});

test('uniqueLabels removes duplicates case-insensitively', () => {
  assert.deepEqual(uniqueLabels(['Price', ' price ', 'Battery life']), ['Price', 'Battery life']);
});

test('addLabel preserves a re-added item exactly once', () => {
  const result = addLabel(['Laptop A', 'Laptop C'], 'Laptop B', 3);
  assert.equal(result.added, true);
  assert.deepEqual(result.values, ['Laptop A', 'Laptop C', 'Laptop B']);
});

test('addLabel blocks duplicates and maximum length', () => {
  assert.equal(addLabel(['Price'], 'price', 6).reason, 'duplicate');
  assert.equal(addLabel(['A', 'B', 'C'], 'D', 3).reason, 'max');
});
