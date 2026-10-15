# Archeville Super-Archy Tournament

A console application that reads an archery tournament from a text file, scores it round by round, prints a scoreboard after every round, and announces the winning team. It is written in plain JavaScript (Node.js ES modules) and has no third-party dependencies.

## Requirements

- Node.js **20 or newer** (developed and tested on Node.js 22.18.0)
- Nothing else: no `npm install` is needed, because there are no dependencies.

## Project structure

```
archeville-tournament/
├── input.txt                  Sample tournament (see docs/SAMPLE_VERIFICATION.md)
├── package.json               npm scripts: start, test
├── src/
│   ├── circles.js             Circle names and points-per-round formula
│   ├── parser.js              Reads and validates the input text; InputError
│   ├── tournament.js          Round scoring, synchronous bonus, winner decision (pure logic)
│   ├── scoreboard.js          Turns results into the printed text
│   └── cli.js                 Command-line entry point: file in, scoreboard out, exit code
├── test/
│   ├── circles.test.js        Point values
│   ├── parser.test.js         Input format and every validation error
│   ├── tournament.test.js     Scoring, bonus, winning, ties
│   ├── scoreboard.test.js     Exact text of every result message
│   ├── cli.test.js            End-to-end runs of the real program, incl. the full sample
│   └── helpers.js             Small builders shared by the tests
├── samples/invalid/           One broken input file per kind of error, for manual demos
├── docs/SAMPLE_VERIFICATION.md  Hand calculation of every sample round
└── INTERVIEW_NOTES.md         Design walkthrough and likely questions
```

## Run

```bash
npm start
```

This is the same as `node src/cli.js input.txt`. To score any other file:

```bash
node src/cli.js path/to/tournament.txt
```

Exit codes: `0` success, `1` unreadable or invalid input (message on stderr, no scoreboard printed), `2` wrong usage.

## Test

```bash
npm test
```

This runs `node --test test/*.test.js` with the built-in `node:test` runner and `node:assert/strict`.

## Input format

A UTF-8 text file with three sections separated by blank lines:

1. **Teams.** One line per team: `Team Name, First Archer, Second Archer`.
2. **Player order.** One line listing every archer exactly once, in the order their selections arrive each round.
3. **Rounds.** One line per round: the circles hit, comma-separated, **in the player order from section 2**. A `Round N:` prefix is allowed but optional.

Lines starting with `#` are comments. Extra spaces around names and circles are ignored, and Windows line endings and a byte-order mark are accepted. Circles are case-insensitive (`a` is read as `A`).

### Complete sample (`input.txt`)

```
# Section 1: one team per line -> Team, First Archer, Second Archer
Gyrhuna, János Diák, Süsü
Achni, Meilong, Tianlong
Bathar, Pakhangba, Poubi Lai Paphal

# Section 2: the order in which archers' scores arrive (every archer exactly once)
János Diák, Meilong, Pakhangba, Süsü, Tianlong, Poubi Lai Paphal

# Section 3: one line per round, circles listed in the player order above
A, C, E, B, D, F
A, A, B, A, A, C
B, A, C, A, A, C
A, A, D, A, B, D
A, A, F, B, A, F
A, A, A, A, A, A
```

The first round line means János Diák hit A, Meilong hit C, Pakhangba hit E, Süsü hit B, Tianlong hit D and Poubi Lai Paphal hit F.

> **Note:** Rounds 2–6 of this file are a reconstruction. The assignment's original sample input was not available when this was written; see `docs/SAMPLE_VERIFICATION.md`. Swap in the original sample before submission.

## Output

After each round:

```
Round 1
Team Scores
Gyrhuna: 9
Achni: 5
Bathar: 1
Individual Scores
János Diák: 5
Süsü: 4
Meilong: 3
Tianlong: 2
Pakhangba: 1
Poubi Lai Paphal: 0
Bonus Points
Gyrhuna: 0
Achni: 0
Bathar: 0
```

At the end, one of:

```
Winner: Gyrhuna with 71 points
Tie: Red, Blue share the highest score of 60 points. The rules define no tie-breaker, so no single winner is declared.
No winner: no team reached 60 points before the rounds ran out.
```

If the input has rounds after the deciding one, a closing note says how many were ignored.

The ordering is deterministic. Teams appear in the order they were declared. Archers are grouped by team, and within a team they appear in the order they were declared. The player order affects only how round lines are read, not how results are listed.

- **Individual Scores** are circle points only.
- **Bonus Points** are each team's accumulated synchronous bonus.
- **Team Scores** = first archer + second archer + bonus. This value is computed fresh every round and never stored separately, so it cannot drift.

## Scoring rules

### Circle points

For round `r` (first round is `r = 1`):

| Circle | Points |
|---|---|
| A | 5 + (r − 1) |
| B | 4 + (r − 1) |
| C | 3 + (r − 1) |
| D | 2 + (r − 1) |
| E | 1 + (r − 1) |
| F | 0, always |

### Synchronous bonus

If both archers of a team hit the **same circle in the same round**, the team gets **+2**. This also applies to **F/F**, because the rule only asks for identical circles. The bonus is checked only after the whole round has been read, so it can never be awarded on half a round. It is added to the team, never to an archer, and it accumulates across rounds.

### Winning and ties

- After each **fully scored** round, if any team has **≥ 60**, the game ends. Remaining rounds in the file are not scored.
- If several teams are at or above 60, the team with the **highest score after that round** (bonuses included) wins.
- If two or more teams share that highest score, the program reports a **tie** and names every tied team. The assignment gives no tie-breaker, and inventing one (e.g. "most A hits") would be guessing.
- If the input runs out before anyone reaches 60, the program reports **no winner**.

## Input validation

Invalid input is never skipped or guessed at. The program stops before printing any scoreboard and gives a message with the line number:

| Problem | Example message |
|---|---|
| Empty file | `Input is empty. Expected team lines, a player-order line and round lines.` |
| Malformed team | `Line 3: Malformed team declaration "Achni, Meilong". Expected "Team, First Archer, Second Archer".` |
| Archer in two teams | `Line 3: Archer "Süsü" is already registered with team "Gyrhuna"; an archer can belong to only one team.` |
| Same archer twice in a team / duplicate team name | `Team "Red" lists archer "Ann" twice; ...` / `Team "Red" is declared more than once.` |
| Fewer than 2 teams | `At least 2 teams are required, found 1.` |
| Unknown name in player order | `Line 6: Player order names unknown archer "Meelong". Registered archers: ...` |
| Name repeated / missing in player order | `Player order lists "Ann" more than once.` / `Player order is missing: Dan.` |
| Missing or extra selections | `Line 8: Round 1 has 5 selections but there are 6 archers (missing selections). Expected one circle for each of: ...` |
| Invalid circle | `Line 9: Round 2: invalid circle "Z" for Meilong. Valid circles: A, B, C, D, E, F.` |
| Missing sections | `Missing player-order section. ...` / `No rounds found. ...` |
| Unreadable file | `Error: cannot read "nope.txt": file not found.` |

Try them with `node src/cli.js samples/invalid/<file>.txt`.

Names are matched exactly and are case-sensitive, after trimming, collapsing repeated spaces, and Unicode NFC normalisation. Normalisation means `Süsü` typed with a precomposed `ü` and `Süsü` typed with a combining diaeresis count as the same archer. Names cannot contain commas, because commas separate the fields.

## Design decisions and trade-offs

- **Plain text over JSON.** The input is easy to type by hand, matches the shape of the assignment's example, and needs no schema. The cost is that names cannot contain commas.
- **Business logic is separate from I/O.** `tournament.js` never prints, and `scoreboard.js` never computes scores. `playTournament` returns plain data (one snapshot per round plus an outcome), so another output format (JSON, HTML, CSV) would only need a new renderer.
- **Validate everything up front.** The whole file is parsed and checked before a single point is scored. You never get three rounds of scoreboard followed by an error.
- **Team score is derived, not stored**, so the invariant "team = archers + bonus" holds by construction.
- **No classes.** The state is two `Map`s local to one function call, which is enough. Functions are small and pure where possible, and there is no global mutable state.
- **Ties are reported, not broken.** See above.
- **Not done on purpose:** live/streaming input, a CLI flag for the threshold, more than two archers per team. Each would be a small, contained change (see INTERVIEW_NOTES.md), but nothing was asked for and nothing is claimed.

## Changing the winning score

The threshold is already a parameter of the game logic:

```js
import { playTournament } from './src/tournament.js';
playTournament(parsedInput, { winningScore: 100 });
```

The default is `DEFAULT_WINNING_SCORE = 60` in `src/tournament.js`, and a test covers a custom value. To expose it on the command line, read a `--winning-score` argument in `src/cli.js` and pass it through as above. Nothing else needs to change. The final "No winner" message already prints whatever threshold was used.

## Assumptions and ambiguities

1. **Sample Round 4 bonus.** The written rule (A/A ⇒ +2) takes precedence over sample arithmetic that omits it. Details in `docs/SAMPLE_VERIFICATION.md`.
2. **F/F earns the bonus.** The rule only requires identical circles.
3. **Ties** after the deciding round are reported as ties.
4. **Rounds after the deciding round** are ignored, and a note says how many.
5. **Running out of rounds** with nobody at 60 gives "No winner".
6. **At least two teams** are required for a tournament. The rules do not limit the number of rounds.
7. **The scoreboard is printed after every round**, and the game is decided only at round boundaries. An archer whose result arrives later in the same round is still scored even if an earlier archer's team has already passed 60.
# Archeville-Super-Archy-Tournament
