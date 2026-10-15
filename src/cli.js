#!/usr/bin/env node
// Command-line entry point: read the file, run the game, print the result.

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { InputError, parseTournamentInput } from './parser.js';
import { renderTournament } from './scoreboard.js';
import { playTournament } from './tournament.js';

export const EXIT_OK = 0;
export const EXIT_INPUT_ERROR = 1;
export const EXIT_USAGE = 2;

const USAGE = 'Usage: node src/cli.js <input-file>';

/** Returns an exit code instead of exiting, so tests can call it directly. */
export function main(args, { stdout = process.stdout, stderr = process.stderr, readFile = readFileSync } = {}) {
  if (args.length !== 1) {
    stderr.write(`${USAGE}\n`);
    return EXIT_USAGE;
  }
  const [inputPath] = args;

  let text;
  try {
    text = readFile(inputPath, 'utf8');
  } catch (error) {
    const reasons = { ENOENT: 'file not found', EACCES: 'permission denied', EISDIR: 'it is a directory' };
    if (!reasons[error.code]) throw error;
    stderr.write(`Error: cannot read "${inputPath}": ${reasons[error.code]}.\n`);
    return EXIT_INPUT_ERROR;
  }

  try {
    const result = playTournament(parseTournamentInput(text));
    stdout.write(renderTournament(result));
    return EXIT_OK;
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    stderr.write(`Invalid input in "${inputPath}": ${error.message}\n`);
    return EXIT_INPUT_ERROR;
  }
}

// Run only when executed directly (realpath handles npm's bin symlink), not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
