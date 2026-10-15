import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseTournamentInput } from '../src/parser.js';
import { decideOutcome, playTournament, SYNC_BONUS_POINTS } from '../src/tournament.js';
import { buildInput, bonusByTeam, scoresByArcher, scoresByTeam } from './helpers.js';

// Player order in the helper is Ann, Bob (team Red), Cat, Dan (team Blue).
function play(rounds, options) {
  return playTournament(parseTournamentInput(buildInput({ rounds })), options);
}

function lastStandings(result) {
  return result.rounds.at(-1).standings;
}

describe('individual scores', () => {
  test('accumulate across rounds with the round-dependent circle values', () => {
    const result = play(['A, B, C, D', 'A, E, F, B', 'C, C, A, A']);
    // Ann: A1 5 + A2 6 + C3 5 = 16; Bob: B1 4 + E2 2 + C3 5 = 11
    // Cat: C1 3 + F2 0 + A3 7 = 10; Dan: D1 2 + B2 5 + A3 7 = 14
    assert.deepEqual(scoresByArcher(lastStandings(result)), { Ann: 16, Bob: 11, Cat: 10, Dan: 14 });
  });

  test('bonus points are never added to an individual archer', () => {
    const result = play(['A, A, F, F']);
    assert.deepEqual(scoresByArcher(lastStandings(result)), { Ann: 5, Bob: 5, Cat: 0, Dan: 0 });
    assert.deepEqual(bonusByTeam(lastStandings(result)), { Red: 2, Blue: 2 });
  });
});

describe('synchronous bonus', () => {
  test('both teammates hitting A earns the bonus', () => {
    const [round] = play(['A, A, A, B']).rounds;
    assert.equal(SYNC_BONUS_POINTS, 2);
    assert.deepEqual(bonusByTeam(round.standings), { Red: 2, Blue: 0 });
    assert.deepEqual(scoresByTeam(round.standings), { Red: 12, Blue: 9 });
  });

  test('both teammates hitting the same non-A circle earns the bonus', () => {
    const [round] = play(['D, D, C, C']).rounds;
    assert.deepEqual(bonusByTeam(round.standings), { Red: 2, Blue: 2 });
    assert.deepEqual(scoresByTeam(round.standings), { Red: 6, Blue: 8 });
  });

  test('different circles earn no bonus', () => {
    const [round] = play(['A, B, E, F']).rounds;
    assert.deepEqual(bonusByTeam(round.standings), { Red: 0, Blue: 0 });
  });

  test('F/F counts as hitting the same circle (documented interpretation)', () => {
    const [round] = play(['F, F, A, B']).rounds;
    assert.deepEqual(scoresByTeam(round.standings), { Red: 2, Blue: 9 });
  });

  test('bonus accumulates over rounds and is reported per round', () => {
    const result = play(['A, A, A, B', 'C, D, B, B', 'E, E, F, F']);
    const bonusPerRound = result.rounds.map((round) => bonusByTeam(round.standings));
    assert.deepEqual(bonusPerRound, [
      { Red: 2, Blue: 0 },
      { Red: 2, Blue: 2 },
      { Red: 4, Blue: 4 },
    ]);
  });

  test('pairs teammates by ownership, not by adjacency in the player order', () => {
    // Order interleaves teams: Ann(Red), Cat(Blue), Bob(Red), Dan(Blue).
    const input = buildInput({ order: 'Ann, Cat, Bob, Dan', rounds: ['A, B, A, C'] });
    const [round] = playTournament(parseTournamentInput(input)).rounds;
    assert.deepEqual(bonusByTeam(round.standings), { Red: 2, Blue: 0 });
  });
});

test('team score equals both archers plus accumulated bonus after every round', () => {
  const result = play(['A, A, B, C', 'F, F, D, D', 'B, C, E, E', 'A, A, A, A']);
  for (const { standings } of result.rounds) {
    for (const team of standings) {
      const individual = team.archers.reduce((sum, archer) => sum + archer.score, 0);
      assert.equal(team.score, individual + team.bonus, `${team.name}`);
    }
  }
  // Red: (5+5+2) + (0+0+2) + (6+5) + (8+8+2) = 43; Blue: (4+3) + (3+3+2) + (3+3+2) + (8+8+2) = 41
  assert.deepEqual(scoresByTeam(lastStandings(result)), { Red: 43, Blue: 41 });
});

test('player order maps selections to the right archers', () => {
  const input = buildInput({ order: 'Dan, Ann, Cat, Bob', rounds: ['A, B, C, D'] });
  const [round] = playTournament(parseTournamentInput(input)).rounds;
  assert.deepEqual(scoresByArcher(round.standings), { Ann: 4, Bob: 2, Cat: 3, Dan: 5 });
  assert.equal(round.selections.get('Dan'), 'A');
});

describe('winning', () => {
  test('a team wins on reaching exactly 60, and later rounds are not played', () => {
    // Red A/A each round: 12 + 14 + 16 + 18 = 60 after round 4.
    const result = play(['A, A, E, F', 'A, A, E, F', 'A, A, E, F', 'A, A, E, F', 'A, A, E, F']);
    assert.equal(result.rounds.length, 4);
    assert.equal(result.unplayedRounds, 1);
    assert.deepEqual(result.outcome, { type: 'winner', teams: ['Red'], score: 60, winningScore: 60 });
  });

  test('a team wins when it jumps past 60', () => {
    // Red: 9, 14, 16, 18 -> 57 after round 4, then A/A 20 -> 77.
    const result = play(['A, B, E, F', 'A, A, E, F', 'A, A, E, F', 'A, A, E, F', 'A, A, E, F']);
    assert.equal(scoresByTeam(result.rounds[3].standings).Red, 57);
    assert.equal(result.outcome.type, 'winner');
    assert.equal(result.outcome.score, 77);
    assert.equal(result.rounds.length, 5);
  });

  test('when several teams pass 60 in one round, the highest final score wins', () => {
    // After round 4: Red 57, Blue 55. Round 5: Red 77, Blue 75.
    const result = play(['A, B, B, C', 'A, A, A, A', 'A, A, A, A', 'A, A, A, A', 'A, A, A, A']);
    assert.deepEqual(scoresByTeam(result.rounds[3].standings), { Red: 57, Blue: 55 });
    assert.deepEqual(scoresByTeam(lastStandings(result)), { Red: 77, Blue: 75 });
    assert.deepEqual(result.outcome.teams, ['Red']);
  });

  test('the winner is decided after bonuses, even if that reverses the individual totals', () => {
    // Four rounds of A/B for both teams: 48 each. Round 5: Red A/B = 17, Blue B/B = 16 + 2 bonus.
    const result = play(['A, B, A, B', 'A, B, A, B', 'A, B, A, B', 'A, B, A, B', 'A, B, B, B']);
    const final = lastStandings(result);
    const individualTotal = (team) => team.archers.reduce((sum, archer) => sum + archer.score, 0);
    assert.equal(individualTotal(final[0]), 65); // Red, no bonus
    assert.equal(individualTotal(final[1]), 64); // Blue, before its bonus
    assert.deepEqual(result.outcome, { type: 'winner', teams: ['Blue'], score: 66, winningScore: 60 });
  });

  test('a later archer in the deciding round is still scored (no early stop mid-round)', () => {
    // Red shoots first in the order and reaches 65; Blue shoots afterwards and overtakes.
    const result = play(['A, B, A, B', 'A, B, A, B', 'A, B, A, B', 'A, B, A, B', 'A, B, B, B']);
    assert.deepEqual(scoresByArcher(lastStandings(result)), { Ann: 35, Bob: 30, Cat: 34, Dan: 30 });
  });

  test('a team crosses 60 only once the round bonus is applied', () => {
    // Red: 48 after four A/B rounds; round 5 E/E = 10 -> 58 individual, + 2 bonus = 60.
    const result = play(['A, B, F, E', 'A, B, F, E', 'A, B, F, E', 'A, B, F, E', 'E, E, F, E']);
    const red = lastStandings(result)[0];
    assert.equal(red.score - red.bonus, 58);
    assert.equal(red.bonus, 2);
    assert.equal(red.score, 60);
    assert.deepEqual(result.outcome.teams, ['Red']);
  });

  test('a tie for the highest score is reported, not broken arbitrarily', () => {
    const result = play(['A, A, A, A', 'A, A, A, A', 'A, A, A, A', 'A, A, A, A']);
    assert.deepEqual(result.outcome, { type: 'tie', teams: ['Red', 'Blue'], score: 60, winningScore: 60 });
  });

  test('no winner when the rounds run out first', () => {
    const result = play(['A, A, A, B']);
    assert.equal(result.outcome.type, 'none');
    assert.equal(result.rounds.length, 1);
  });

  test('the winning threshold is configurable', () => {
    const result = play(['A, A, E, F', 'A, A, E, F'], { winningScore: 12 });
    assert.deepEqual(result.outcome, { type: 'winner', teams: ['Red'], score: 12, winningScore: 12 });
    assert.throws(() => play(['A, A, E, F'], { winningScore: 0 }), RangeError);
  });

  test('decideOutcome ignores teams below the leader even if they also qualified', () => {
    const standings = [
      { name: 'X', score: 61 },
      { name: 'Y', score: 64 },
      { name: 'Z', score: 64 },
      { name: 'W', score: 10 },
    ];
    assert.deepEqual(decideOutcome(standings).teams, ['Y', 'Z']);
    assert.equal(decideOutcome([{ name: 'X', score: 59 }]), null);
  });
});
