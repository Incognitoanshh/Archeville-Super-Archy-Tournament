import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIRCLES, circlePoints } from '../src/circles.js';

test('round 1 points for every circle', () => {
  const expected = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  for (const circle of CIRCLES) {
    assert.equal(circlePoints(circle, 1), expected[circle], `circle ${circle}`);
  }
});

test('circles A-E gain one point per round', () => {
  assert.equal(circlePoints('A', 4), 8);
  assert.equal(circlePoints('B', 2), 5);
  assert.equal(circlePoints('C', 3), 5);
  assert.equal(circlePoints('D', 5), 6);
  assert.equal(circlePoints('E', 10), 10);
});

test('F scores zero in every round', () => {
  for (let round = 1; round <= 50; round++) {
    assert.equal(circlePoints('F', round), 0);
  }
});

test('unknown circles and invalid rounds are rejected', () => {
  assert.throws(() => circlePoints('G', 1), RangeError);
  assert.throws(() => circlePoints('a', 1), RangeError); // normalising case is the parser's job
  assert.throws(() => circlePoints('A', 0), RangeError);
  assert.throws(() => circlePoints('A', 1.5), RangeError);
});
