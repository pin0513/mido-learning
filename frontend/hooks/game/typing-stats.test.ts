import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAccuracy, calculateWpm, elapsedGameSeconds } from './typing-stats';

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

test('game time: whole seconds from the countdown plus the running part of the current second', () => {
  assert.equal(elapsedGameSeconds(60, 60, 0), 0);
  assert.equal(elapsedGameSeconds(60, 56, 500), 4.5);
  assert.equal(elapsedGameSeconds(60, 56, 5000), 4.999); // partial second clamped below 1 s
  assert.equal(elapsedGameSeconds(60, 0, 800), 60); // capped at the time limit
  assert.equal(elapsedGameSeconds(0, 0, 0), 0);
  assert.equal(elapsedGameSeconds(60, 58, Number.NaN), 2);
});

test('pause then finish: finish WPM uses game time, so paused seconds do not lower it', () => {
  // 100 correct chars in 30 s of play plus a 30 s pause, 60 s limit: the countdown only ran
  // 30 s (timeLeft 30), so WPM is 40 and agrees with timeSpent = 30. (Wall clock would give 20.)
  const gameSeconds = elapsedGameSeconds(60, 30, 0);
  assert.equal(gameSeconds, 30);
  assert.equal(calculateWpm(100, gameSeconds), 40);
  assert.equal(Math.floor(gameSeconds), 60 - 30);
});
