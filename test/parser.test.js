import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, parseTournamentInput } from '../src/parser.js';
import { buildInput } from './helpers.js';

function assertInputError(text, messagePattern) {
  assert.throws(() => parseTournamentInput(text), (error) => {
    assert.ok(error instanceof InputError, `expected InputError, got ${error.name}`);
    assert.match(error.message, messagePattern);
    return true;
  });
}

describe('valid input', () => {
  test('parses teams, player order and rounds', () => {
    const parsed = parseTournamentInput(buildInput({ rounds: ['A, B, C, D', 'F, F, E, E'] }));
    assert.deepEqual(parsed, {
      teams: [
        { name: 'Red', archers: ['Ann', 'Bob'] },
        { name: 'Blue', archers: ['Cat', 'Dan'] },
      ],
      playerOrder: ['Ann', 'Bob', 'Cat', 'Dan'],
      rounds: [
        ['A', 'B', 'C', 'D'],
        ['F', 'F', 'E', 'E'],
      ],
    });
  });

  test('keeps Unicode names and names with spaces intact', () => {
    const text = buildInput({
      teams: ['Gyrhuna, János Diák, Süsü', 'Bathar, Pakhangba, Poubi Lai Paphal'],
      order: 'Poubi Lai Paphal, János Diák, Süsü, Pakhangba',
      rounds: ['A, B, C, D'],
    });
    const parsed = parseTournamentInput(text);
    assert.deepEqual(parsed.teams[0].archers, ['János Diák', 'Süsü']);
    assert.deepEqual(parsed.playerOrder, ['Poubi Lai Paphal', 'János Diák', 'Süsü', 'Pakhangba']);
  });

  test('treats composed and decomposed Unicode spellings as the same archer', () => {
    const decomposed = 'Süsü'; // "Süsü" with combining diaeresis
    const text = buildInput({ teams: [`Gyrhuna, János Diák, ${decomposed}`, 'Achni, Meilong, Tianlong'],
      order: 'Süsü, János Diák, Meilong, Tianlong', rounds: ['A, A, A, A'] });
    assert.equal(parseTournamentInput(text).teams[0].archers[1], 'Süsü');
  });

  test('ignores comments, extra whitespace, CRLF line endings, a byte-order mark, and lower-case circles', () => {
    const text = '﻿# header\r\nRed ,  Ann ,Bob\r\nBlue, Cat,   Dan\r\n\r\n# order\r\nAnn, Bob, Cat, Dan\r\n\r\na, b , c,d\r\n\r\n\r\nf,F,e,E\r\n';
    const parsed = parseTournamentInput(text);
    assert.deepEqual(parsed.teams[0], { name: 'Red', archers: ['Ann', 'Bob'] });
    assert.deepEqual(parsed.rounds, [['A', 'B', 'C', 'D'], ['F', 'F', 'E', 'E']]);
  });

  test('accepts optional "Round N:" labels', () => {
    const parsed = parseTournamentInput(buildInput({ rounds: ['Round 1: A, B, C, D', 'round 2 : B, B, B, B'] }));
    assert.equal(parsed.rounds.length, 2);
    assertInputError(buildInput({ rounds: ['Round 2: A, B, C, D'] }), /Round label says 2 but this is round 1/);
  });
});

describe('invalid input', () => {
  test('empty input', () => {
    assertInputError('', /Input is empty/);
    assertInputError('  \n\n# only a comment\n', /Missing player-order section|Input is empty/);
  });

  test('missing player order and missing rounds', () => {
    assertInputError('Red, Ann, Bob\nBlue, Cat, Dan\n', /Missing player-order section/);
    assertInputError('Red, Ann, Bob\nBlue, Cat, Dan\n\nAnn, Bob, Cat, Dan\n', /No rounds found/);
  });

  test('invalid circle names, with line number and archer', () => {
    assertInputError(buildInput({ rounds: ['A, B, C, D', 'A, G, C, D'] }), /^Line 7: Round 2: invalid circle "G" for Bob/);
    assertInputError(buildInput({ rounds: ['A, , C, D'] }), /invalid circle \(empty\) for Bob/);
    assertInputError(buildInput({ rounds: ['A, AA, C, D'] }), /invalid circle "AA"/);
  });

  test('missing and extra selections in a round', () => {
    assertInputError(buildInput({ rounds: ['A, B, C'] }), /Round 1 has 3 selections but there are 4 archers \(missing selections\)/);
    assertInputError(buildInput({ rounds: ['A, B, C, D', 'A, B, C, D, E'] }), /Round 2 has 5 selections .* \(extra selections\)/);
  });

  test('malformed team declarations', () => {
    assertInputError(buildInput({ teams: ['Red, Ann', 'Blue, Cat, Dan'], rounds: ['A, B, C'] }), /^Line 1: Malformed team declaration "Red, Ann"/);
    assertInputError(buildInput({ teams: ['Red, Ann, Bob, Eve', 'Blue, Cat, Dan'], rounds: ['A'] }), /Malformed team declaration/);
    assertInputError(buildInput({ teams: ['Red, , Bob', 'Blue, Cat, Dan'], rounds: ['A'] }), /Malformed team declaration/);
    assertInputError(buildInput({ teams: ['Red, Ann, Bob'], order: 'Ann, Bob', rounds: ['A, A'] }), /At least 2 teams are required/);
  });

  test('duplicate registrations and ambiguous ownership', () => {
    assertInputError(buildInput({ teams: ['Red, Ann, Ann', 'Blue, Cat, Dan'], rounds: ['A'] }), /lists archer "Ann" twice/);
    assertInputError(buildInput({ teams: ['Red, Ann, Bob', 'Blue, Ann, Dan'], rounds: ['A'] }), /^Line 2: Archer "Ann" is already registered with team "Red"/);
    assertInputError(buildInput({ teams: ['Red, Ann, Bob', 'Red, Cat, Dan'], rounds: ['A'] }), /Team "Red" is declared more than once/);
  });

  test('unknown, duplicated or missing names in the player order', () => {
    assertInputError(buildInput({ order: 'Ann, Bob, Cat, Zed', rounds: ['A, A, A, A'] }), /unknown archer "Zed"\. Registered archers: Ann, Bob, Cat, Dan/);
    assertInputError(buildInput({ order: 'ann, Bob, Cat, Dan', rounds: ['A, A, A, A'] }), /unknown archer "ann"/);
    assertInputError(buildInput({ order: 'Ann, Bob, Cat, Ann', rounds: ['A, A, A, A'] }), /lists "Ann" more than once/);
    assertInputError(buildInput({ order: 'Ann, Bob, Cat', rounds: ['A, A, A'] }), /Player order is missing: Dan/);
    assertInputError(buildInput({ order: 'Ann, Bob, , Cat, Dan', rounds: ['A'] }), /empty name/);
  });

  test('a player order split across lines is rejected rather than guessed', () => {
    const text = 'Red, Ann, Bob\nBlue, Cat, Dan\n\nAnn, Bob\nCat, Dan\n\nA, A, A, A\n';
    assertInputError(text, /^Line 5: The player-order section must be a single line/);
  });
});
