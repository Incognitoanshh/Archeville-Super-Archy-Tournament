// Game rules: scoring each round, the synchronous bonus, and deciding the winner.
// Pure logic only. Nothing here reads files or prints.

import { circlePoints } from './circles.js';

export const DEFAULT_WINNING_SCORE = 60;
export const SYNC_BONUS_POINTS = 2;

/**
 * Plays rounds in order until, after a fully scored round, at least one team
 * has reached `winningScore`. Rounds after that are never scored.
 *
 * @param {{teams, playerOrder, rounds}} input  as returned by parseTournamentInput
 * @returns {{
 *   rounds: RoundResult[],          // one snapshot per round played
 *   outcome: Outcome,
 *   unplayedRounds: number          // rounds in the input after the deciding one
 * }}
 */
export function playTournament({ teams, playerOrder, rounds }, { winningScore = DEFAULT_WINNING_SCORE } = {}) {
  if (!Number.isInteger(winningScore) || winningScore < 1) {
    throw new RangeError(`winningScore must be a positive integer, got ${winningScore}.`);
  }

  const individualScores = new Map(teams.flatMap((team) => team.archers.map((archer) => [archer, 0])));
  const bonusScores = new Map(teams.map((team) => [team.name, 0]));
  const results = [];

  for (const [index, circles] of rounds.entries()) {
    const roundNumber = index + 1;
    const selections = mapSelectionsToArchers(playerOrder, circles);

    scoreRound({ teams, selections, roundNumber, individualScores, bonusScores });

    const standings = buildStandings(teams, individualScores, bonusScores);
    results.push({ roundNumber, selections, standings });

    const outcome = decideOutcome(standings, winningScore);
    if (outcome) {
      return { rounds: results, outcome, unplayedRounds: rounds.length - roundNumber };
    }
  }

  return { rounds: results, outcome: { type: 'none', teams: [], score: null, winningScore }, unplayedRounds: 0 };
}

/** Pairs the j-th circle with the j-th archer of the declared player order. */
export function mapSelectionsToArchers(playerOrder, circles) {
  if (circles.length !== playerOrder.length) {
    throw new RangeError(`Expected ${playerOrder.length} selections, got ${circles.length}.`);
  }
  return new Map(playerOrder.map((archer, position) => [archer, circles[position]]));
}

/** Teammates who hit the same circle (including F/F) earn the bonus. */
export function earnsSyncBonus([firstCircle, secondCircle]) {
  return firstCircle === secondCircle;
}

// The bonus is only evaluated once both archers' selections for the round are
// known, which is guaranteed because `selections` is a complete round.
function scoreRound({ teams, selections, roundNumber, individualScores, bonusScores }) {
  for (const team of teams) {
    const teamCircles = team.archers.map((archer) => selections.get(archer));
    team.archers.forEach((archer, i) => {
      individualScores.set(archer, individualScores.get(archer) + circlePoints(teamCircles[i], roundNumber));
    });
    if (earnsSyncBonus(teamCircles)) {
      bonusScores.set(team.name, bonusScores.get(team.name) + SYNC_BONUS_POINTS);
    }
  }
}

// Team score is always derived, never stored, so it cannot drift from
// "sum of the two archers' points + accumulated bonus".
function buildStandings(teams, individualScores, bonusScores) {
  return teams.map((team) => {
    const archers = team.archers.map((name) => ({ name, score: individualScores.get(name) }));
    const bonus = bonusScores.get(team.name);
    const score = archers.reduce((sum, archer) => sum + archer.score, 0) + bonus;
    return { name: team.name, score, bonus, archers };
  });
}

/**
 * @returns {Outcome|null} null while nobody has reached the target.
 *   {type: 'winner', teams: [name], score} or {type: 'tie', teams: [...names], score}
 */
export function decideOutcome(standings, winningScore = DEFAULT_WINNING_SCORE) {
  const anyoneQualified = standings.some((team) => team.score >= winningScore);
  if (!anyoneQualified) return null;

  const topScore = Math.max(...standings.map((team) => team.score));
  const leaders = standings.filter((team) => team.score === topScore).map((team) => team.name);
  return { type: leaders.length === 1 ? 'winner' : 'tie', teams: leaders, score: topScore, winningScore };
}
