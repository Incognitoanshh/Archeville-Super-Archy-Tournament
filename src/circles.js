// Points for the scoring circles. Every circle except F gains one point per round.

export const CIRCLES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F']);

// Round 1 value of each circle. F is listed for completeness; it never grows.
const ROUND_ONE_POINTS = Object.freeze({ A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 });

const ZERO_CIRCLE = 'F';

export function isCircle(value) {
  return CIRCLES.includes(value);
}

/**
 * Points earned by hitting `circle` in `round` (1-based).
 * A = 5 + (round - 1) ... E = 1 + (round - 1); F = 0 in every round.
 */
export function circlePoints(circle, round) {
  if (!isCircle(circle)) {
    throw new RangeError(`Unknown circle "${circle}". Expected one of ${CIRCLES.join(', ')}.`);
  }
  if (!Number.isInteger(round) || round < 1) {
    throw new RangeError(`Round must be a positive integer, got ${round}.`);
  }
  if (circle === ZERO_CIRCLE) return 0;
  return ROUND_ONE_POINTS[circle] + (round - 1);
}
