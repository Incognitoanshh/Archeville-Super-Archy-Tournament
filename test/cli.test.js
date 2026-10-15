// End-to-end tests: run the real program as a child process.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { main } from '../src/cli.js';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function run(...args) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd: projectRoot, encoding: 'utf8' });
}

/** Parses "Name: value" lines of one section of one round block. */
function section(block, heading) {
  const lines = block.split('\n');
  const start = lines.indexOf(heading) + 1;
  const values = {};
  for (const line of lines.slice(start)) {
    const match = line.match(/^(.+): (-?\d+)$/);
    if (!match) break;
    values[match[1]] = Number(match[2]);
  }
  return values;
}

describe('sample input (input.txt)', () => {
  const { status, stdout, stderr } = run('input.txt');
  const blocks = stdout.split('\n\n');

  test('exits cleanly', () => {
    assert.equal(status, 0);
    assert.equal(stderr, '');
  });

  test('round 1 matches the scoreboard in the assignment exactly', () => {
    assert.equal(blocks[0], [
      'Round 1',
      'Team Scores', 'Gyrhuna: 9', 'Achni: 5', 'Bathar: 1',
      'Individual Scores', 'János Diák: 5', 'Süsü: 4', 'Meilong: 3', 'Tianlong: 2', 'Pakhangba: 1', 'Poubi Lai Paphal: 0',
      'Bonus Points', 'Gyrhuna: 0', 'Achni: 0', 'Bathar: 0',
    ].join('\n'));
  });

  test('every round lists all teams and all six archers', () => {
    const rounds = blocks.filter((block) => block.startsWith('Round '));
    assert.equal(rounds.length, 5);
    for (const block of rounds) {
      assert.deepEqual(Object.keys(section(block, 'Team Scores')), ['Gyrhuna', 'Achni', 'Bathar']);
      assert.deepEqual(Object.keys(section(block, 'Individual Scores')),
        ['János Diák', 'Süsü', 'Meilong', 'Tianlong', 'Pakhangba', 'Poubi Lai Paphal']);
      assert.deepEqual(Object.keys(section(block, 'Bonus Points')), ['Gyrhuna', 'Achni', 'Bathar']);
    }
  });

  test('hand-checked team and bonus totals for every round (see docs/SAMPLE_VERIFICATION.md)', () => {
    const rounds = blocks.filter((block) => block.startsWith('Round '));
    assert.deepEqual(rounds.map((block) => section(block, 'Team Scores')), [
      { Gyrhuna: 9, Achni: 5, Bathar: 1 },
      { Gyrhuna: 23, Achni: 19, Bathar: 10 },
      { Gyrhuna: 36, Achni: 35, Bathar: 22 },
      { Gyrhuna: 54, Achni: 50, Bathar: 34 },
      { Gyrhuna: 71, Achni: 70, Bathar: 36 },
    ]);
    // Round 4: Gyrhuna shoots A/A, so its bonus rises from 2 to 4.
    assert.deepEqual(section(rounds[3], 'Bonus Points'), { Gyrhuna: 4, Achni: 4, Bathar: 4 });
    assert.deepEqual(section(rounds[4], 'Bonus Points'), { Gyrhuna: 4, Achni: 6, Bathar: 6 });
  });

  test('two teams pass 60 in round 5; the higher final score wins and round 6 is not played', () => {
    assert.match(stdout, /Winner: Gyrhuna with 71 points/);
    assert.doesNotMatch(stdout, /Round 6/);
    assert.match(stdout, /1 later round in the input ignored/);
  });
});

describe('command-line errors', () => {
  test('missing argument prints usage and exits 2', () => {
    const { status, stderr } = run();
    assert.equal(status, 2);
    assert.match(stderr, /Usage: node src\/cli\.js <input-file>/);
  });

  test('missing file exits 1 with a readable message', () => {
    const { status, stderr, stdout } = run('does-not-exist.txt');
    assert.equal(status, 1);
    assert.equal(stdout, '');
    assert.match(stderr, /cannot read "does-not-exist.txt": file not found/);
  });

  test('a directory instead of a file exits 1', () => {
    const { status, stderr } = run('samples');
    assert.equal(status, 1);
    assert.match(stderr, /it is a directory/);
  });

  test('every file in samples/invalid is rejected with an explanation and no scoreboard', () => {
    const cases = {
      'invalid-circle.txt': /Line 9: Round 2: invalid circle "Z" for Meilong/,
      'missing-selection.txt': /Round 1 has 5 selections but there are 6 archers \(missing selections\)/,
      'unknown-player.txt': /unknown archer "Meelong"/,
      'duplicate-archer.txt': /Archer "Süsü" is already registered with team "Gyrhuna"/,
      'malformed-team.txt': /Malformed team declaration "Achni, Meilong"/,
      'empty.txt': /Input is empty/,
    };
    for (const [file, pattern] of Object.entries(cases)) {
      const { status, stdout, stderr } = run(`samples/invalid/${file}`);
      assert.equal(status, 1, file);
      assert.equal(stdout, '', file);
      assert.match(stderr, pattern, file);
    }
  });

  test('unexpected errors are not swallowed', () => {
    const readFile = () => { throw Object.assign(new Error('disk on fire'), { code: 'EIO' }); };
    assert.throws(() => main(['x.txt'], { readFile, stdout: { write() {} }, stderr: { write() {} } }), /disk on fire/);
  });

  test('main() writes the scoreboard to the provided stream', () => {
    let out = '';
    const code = main(['input.txt'], {
      readFile: () => readFileSync(new URL('../input.txt', import.meta.url), 'utf8'),
      stdout: { write: (chunk) => { out += chunk; } },
      stderr: { write: () => assert.fail('nothing should be written to stderr') },
    });
    assert.equal(code, 0);
    assert.ok(out.startsWith('Round 1\nTeam Scores\nGyrhuna: 9\n'));
  });
});
