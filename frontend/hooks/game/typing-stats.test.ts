import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAccuracy, calculateWpm } from './typing-stats';

test('WPM: 6 correct chars in a 60 s game is about 1 WPM (5 chars = 1 word)', () => {
  assert.equal(calculateWpm(6, 60), 1);
  assert.equal(calculateWpm(5, 60), 1);
  assert.equal(calculateWpm(150, 60), 30);
  assert.equal(calculateWpm(29, 4.5), 77);
});

test('WPM: no elapsed time, no chars or bad input gives 0, never Infinity or NaN', () => {
  assert.equal(calculateWpm(6, 0), 0);
  assert.equal(calculateWpm(6, -1), 0);
  assert.equal(calculateWpm(0, 60), 0);
  assert.equal(calculateWpm(6, Number.NaN), 0);
  assert.equal(calculateWpm(Number.POSITIVE_INFINITY, 60), 0);
});

test('accuracy: percent of counted chars, 0 when nothing is counted', () => {
  assert.equal(calculateAccuracy(29, 29), 100);
  assert.equal(calculateAccuracy(3, 4), 75);
  assert.equal(calculateAccuracy(0, 0), 0);
});
