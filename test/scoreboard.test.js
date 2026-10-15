import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderOutcome, renderRound, renderTournament } from '../src/scoreboard.js';

const standings = [
  { name: 'Red', score: 14, bonus: 2, archers: [{ name: 'Ann', score: 6 }, { name: 'Bob', score: 6 }] },
  { name: 'Blue', score: 9, bonus: 0, archers: [{ name: 'Cat', score: 5 }, { name: 'Dan', score: 4 }] },
];

test('a round prints the three sections in declaration order', () => {
  assert.equal(renderRound({ roundNumber: 2, standings }), [
    'Round 2', 'Team Scores', 'Red: 14', 'Blue: 9',
    'Individual Scores', 'Ann: 6', 'Bob: 6', 'Cat: 5', 'Dan: 4',
    'Bonus Points', 'Red: 2', 'Blue: 0',
  ].join('\n'));
});

test('winner, tie and no-winner messages', () => {
  assert.equal(renderOutcome({ type: 'winner', teams: ['Red'], score: 64, winningScore: 60 }), 'Winner: Red with 64 points');
  assert.equal(
    renderOutcome({ type: 'tie', teams: ['Red', 'Blue'], score: 60, winningScore: 60 }),
    'Tie: Red, Blue share the highest score of 60 points. The rules define no tie-breaker, so no single winner is declared.',
  );
  assert.equal(
    renderOutcome({ type: 'none', teams: [], score: null, winningScore: 75 }),
    'No winner: no team reached 75 points before the rounds ran out.',
  );
  assert.throws(() => renderOutcome({ type: 'bogus' }), /Unknown outcome type/);
});

test('the ignored-rounds note uses singular and plural correctly', () => {
  const outcome = { type: 'winner', teams: ['Red'], score: 64, winningScore: 60 };
  const rounds = [{ roundNumber: 1, standings }];
  assert.match(renderTournament({ rounds, outcome, unplayedRounds: 1 }), /\(1 later round in the input ignored/);
  assert.match(renderTournament({ rounds, outcome, unplayedRounds: 3 }), /\(3 later rounds in the input ignored/);
  assert.doesNotMatch(renderTournament({ rounds, outcome, unplayedRounds: 0 }), /ignored/);
});
