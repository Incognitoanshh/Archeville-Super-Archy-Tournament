// Builds input text for tests so each test states only what it cares about.

export const TEAMS = ['Red, Ann, Bob', 'Blue, Cat, Dan'];
export const ORDER = 'Ann, Bob, Cat, Dan';

export function buildInput({ teams = TEAMS, order = ORDER, rounds }) {
  return `${teams.join('\n')}\n\n${order}\n\n${rounds.join('\n')}\n`;
}

/** Team score lookup by name from a standings array. */
export function scoresByTeam(standings) {
  return Object.fromEntries(standings.map((team) => [team.name, team.score]));
}

export function bonusByTeam(standings) {
  return Object.fromEntries(standings.map((team) => [team.name, team.bonus]));
}

export function scoresByArcher(standings) {
  return Object.fromEntries(standings.flatMap((team) => team.archers.map((a) => [a.name, a.score])));
}
