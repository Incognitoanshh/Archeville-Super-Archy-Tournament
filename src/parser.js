// Turns the text input file into validated tournament data. Throws InputError
// with a line number for anything it cannot interpret unambiguously.

import { CIRCLES, isCircle } from './circles.js';

export const MIN_TEAMS = 2;
export const ARCHERS_PER_TEAM = 2;

export class InputError extends Error {
  constructor(message, lineNumber) {
    super(lineNumber ? `Line ${lineNumber}: ${message}` : message);
    this.name = 'InputError';
    this.lineNumber = lineNumber;
  }
}

/**
 * Parses the whole input file.
 * @returns {{
 *   teams: {name: string, archers: string[]}[],
 *   playerOrder: string[],
 *   rounds: string[][]   // rounds[i][j] = circle shot by playerOrder[j] in round i+1
 * }}
 */
export function parseTournamentInput(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new InputError('Input is empty. Expected team lines, a player-order line and round lines.');
  }

  const [teamLines, orderLines, ...roundSections] = splitIntoSections(text);
  if (!orderLines) {
    throw new InputError(
      'Missing player-order section. Leave one blank line after the teams, then list every archer in the order their scores arrive.',
    );
  }
  const roundLines = roundSections.flat();

  const teams = parseTeams(teamLines);
  const playerOrder = parsePlayerOrder(orderLines, teams);
  const rounds = parseRounds(roundLines, playerOrder);
  return { teams, playerOrder, rounds };
}

// Names are compared after Unicode NFC normalisation so that "ü" typed as one
// code point and "u + combining diaeresis" are the same archer.
export function normalizeName(raw) {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function splitIntoSections(text) {
  const sections = [];
  let current = [];
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const content = rawLine.trim(); // trim() also strips a UTF-8 byte-order mark
    if (content.startsWith('#')) return; // comment line
    if (content === '') {
      if (current.length > 0) sections.push(current);
      current = [];
      return;
    }
    current.push({ number: index + 1, content });
  });
  if (current.length > 0) sections.push(current);
  return sections;
}

function splitFields(line) {
  return line.content.split(',').map(normalizeName);
}

function parseTeams(lines) {
  const teams = [];
  const teamOfArcher = new Map();
  const teamNames = new Set();

  for (const line of lines) {
    const fields = splitFields(line);
    if (fields.length !== 1 + ARCHERS_PER_TEAM || fields.some((field) => field === '')) {
      throw new InputError(
        `Malformed team declaration "${line.content}". Expected "Team, First Archer, Second Archer".`,
        line.number,
      );
    }
    const [name, ...archers] = fields;

    if (teamNames.has(name)) {
      throw new InputError(`Team "${name}" is declared more than once.`, line.number);
    }
    if (archers[0] === archers[1]) {
      throw new InputError(`Team "${name}" lists archer "${archers[0]}" twice; a team needs two different archers.`, line.number);
    }
    for (const archer of archers) {
      if (teamOfArcher.has(archer)) {
        throw new InputError(
          `Archer "${archer}" is already registered with team "${teamOfArcher.get(archer)}"; an archer can belong to only one team.`,
          line.number,
        );
      }
      teamOfArcher.set(archer, name);
    }
    teamNames.add(name);
    teams.push({ name, archers });
  }

  if (teams.length < MIN_TEAMS) {
    throw new InputError(`At least ${MIN_TEAMS} teams are required, found ${teams.length}.`, lines[0]?.number);
  }
  return teams;
}

function parsePlayerOrder(lines, teams) {
  if (lines.length !== 1) {
    throw new InputError(
      'The player-order section must be a single line. Separate it from the round lines with a blank line.',
      lines[1].number,
    );
  }
  const [line] = lines;
  const order = splitFields(line);
  const registered = teams.flatMap((team) => team.archers);
  const registeredSet = new Set(registered);
  const seen = new Set();

  for (const name of order) {
    if (name === '') {
      throw new InputError('Player order contains an empty name (check for a stray comma).', line.number);
    }
    if (!registeredSet.has(name)) {
      throw new InputError(
        `Player order names unknown archer "${name}". Registered archers: ${registered.join(', ')}.`,
        line.number,
      );
    }
    if (seen.has(name)) {
      throw new InputError(`Player order lists "${name}" more than once.`, line.number);
    }
    seen.add(name);
  }

  const missing = registered.filter((name) => !seen.has(name));
  if (missing.length > 0) {
    throw new InputError(`Player order is missing: ${missing.join(', ')}.`, line.number);
  }
  return order;
}

const ROUND_LABEL = /^round\s+(\d+)\s*:\s*/i;

function parseRounds(lines, playerOrder) {
  if (lines.length === 0) {
    throw new InputError('No rounds found. Add one line of circle selections per round after the player order.');
  }

  return lines.map((line, index) => {
    const expectedRound = index + 1;
    let content = line.content;
    const label = content.match(ROUND_LABEL);
    if (label) {
      if (Number(label[1]) !== expectedRound) {
        throw new InputError(`Round label says ${label[1]} but this is round ${expectedRound}.`, line.number);
      }
      content = content.slice(label[0].length);
    }

    const circles = content.split(',').map((field) => field.trim().toUpperCase());
    if (circles.length !== playerOrder.length) {
      const problem = circles.length < playerOrder.length ? 'missing selections' : 'extra selections';
      throw new InputError(
        `Round ${expectedRound} has ${circles.length} selections but there are ${playerOrder.length} archers (${problem}). ` +
          `Expected one circle for each of: ${playerOrder.join(', ')}.`,
        line.number,
      );
    }
    circles.forEach((circle, position) => {
      if (!isCircle(circle)) {
        const shown = circle === '' ? '(empty)' : `"${circle}"`;
        throw new InputError(
          `Round ${expectedRound}: invalid circle ${shown} for ${playerOrder[position]}. Valid circles: ${CIRCLES.join(', ')}.`,
          line.number,
        );
      }
    });
    return circles;
  });
}
