# Interview notes

## Problem and solution in one paragraph

Teams of two archers shoot one arrow each per round. Each circle is worth more as rounds go on (A = 4 + r … E = r, F = 0). A team gets +2 when both of its archers hit the same circle. After each complete round we print team, individual and bonus scores. The first round after which some team has ≥ 60 ends the game, and the highest score in that round wins. The program reads a three-section text file and validates all of it up front. It then scores round by round with two `Map`s, builds an immutable snapshot after each round, stops at the deciding round, and renders the snapshots as text.

## Walkthrough of the scoring algorithm (`src/tournament.js`)

```
individualScores = Map(archer -> 0)
bonusScores      = Map(team   -> 0)
for each round r = 1, 2, ...:
    selections = Map(playerOrder[j] -> circles[j])        # mapSelectionsToArchers
    for each team:
        c1, c2 = selections[team.archer1], selections[team.archer2]
        add circlePoints(c1, r) to archer1, circlePoints(c2, r) to archer2
        if c1 == c2: bonusScores[team] += 2                # earnsSyncBonus
    standings = for each team: {archers' scores, bonus, score = sum + bonus}
    outcome = decideOutcome(standings, 60)
    if outcome: stop, return all snapshots + outcome + unplayed round count
return snapshots + "no winner"
```

`decideOutcome`: if no team has ≥ 60, return null. Otherwise take the maximum score and collect every team with that score. One team means a winner, several mean a tie.

Why the round can never stop half-way: the loop scores a whole round before `decideOutcome` is called, and `selections` always holds every archer, because the parser rejected any round with the wrong count.

## Module responsibilities

| Module | Responsibility | Depends on |
|---|---|---|
| `circles.js` | Circle names and `circlePoints(circle, round)`. The only place the point formula lives. | nothing |
| `parser.js` | Text → `{teams, playerOrder, rounds}`. All validation lives here, and errors are `InputError` with a line number. | `circles.js` (valid names) |
| `tournament.js` | Game rules: per-round scoring, bonus, standings, winner. Pure functions, no I/O. | `circles.js` |
| `scoreboard.js` | Snapshots and outcome → text. No arithmetic. | nothing |
| `cli.js` | Reads the file, wires parser → game → renderer, maps errors to exit codes. `main()` takes injected streams and `readFile` so it is testable. | all of the above |

## Complexity

Let P = number of archers (2 per team), T = teams = P/2, R = rounds in the file, L = input size in characters.

- **Parsing:** O(L). Each name and circle is looked up in a `Set`/`Map` (O(1)), and the circle list has a constant 6 entries.
- **Scoring:** O(P) per round for the scoring, the snapshot and the winner check, so O(R·P) overall. R is not bounded by the rules (a team shooting F with mismatched partners scores nothing), so the program simply processes however many rounds the file has.
- **Space:** O(R·P). The parsed rounds plus one snapshot per played round are kept so they can be rendered after the game finishes. A streaming version could print each round and keep only O(P).

## Edge cases handled (each has a test)

- F/F bonus; bonus never added to an individual.
- Exactly 60 wins; jumping past 60 wins; nobody at 60 after the file ends.
- Two teams over 60 in the same round: the higher one wins, even when the bonus reverses who was ahead on individual points.
- A team behind in the player order still gets scored in the deciding round.
- A team reaching 60 only thanks to that round's bonus.
- Ties at the top are reported, not broken.
- Player order different from declaration order; teams interleaved in the order.
- Unicode names, names with spaces, NFC vs NFD spellings, BOM, CRLF, comments, lower-case circles.
- Every validation error: empty file, missing sections, malformed teams, duplicates, unknown names, missing/extra selections, invalid circles, mislabelled `Round N:`.
- File not found, path is a directory, unexpected I/O errors (rethrown, not swallowed).

## Why these data structures

- **`Map` keyed by archer/team name** gives O(1) updates and keeps insertion order. Insertion order is declaration order, which is also the display order.
- **Arrays for teams and rounds**, because order matters and they are only iterated.
- **`Set`s in the parser**, because duplicate detection is exactly what a set is for.
- **Plain-object snapshots** per round, so the renderer and tests can inspect results without knowing the internals.

## Why it is easy to extend

- **Different threshold:** already an option (`{ winningScore }`).
- **Different point formula:** change `circlePoints` only.
- **Different bonus rule** (e.g. 3 points, or exclude F/F): change `earnsSyncBonus` / `SYNC_BONUS_POINTS` only.
- **New output format:** write another renderer over the same `playTournament` result. No game logic changes.
- **Replay / step through:** the result already contains every round's snapshot and selections.
- **Teams of N archers:** `ARCHERS_PER_TEAM` in the parser and `earnsSyncBonus` (compare all circles) are the only places that assume two.

## Alternatives considered

| Alternative | Why not |
|---|---|
| JSON input | Heavier to hand-write, and the assignment's example is plain lines. Text with three sections is enough. |
| Classes (`Team`, `Archer`, `Tournament`) | The data is small and has no behaviour of its own. Classes would add ceremony without encapsulating anything meaningful. |
| Storing a running team total | It could drift from archers + bonus. Deriving it makes the invariant impossible to break. |
| Processing archer-by-archer and checking 60 after each | Violates "finish the round first" and invites a premature winner. |
| Breaking ties by some extra rule | Not in the spec. Silent invention is worse than an explicit "Tie" message. |
| Reading the file line by line as a stream | Errors would surface after partial output. Files are tiny, so reading the whole file is simpler and safer. |
| A test framework like Jest | `node:test` ships with Node and covers everything needed, with zero dependencies. |

## Likely interview questions

1. **Why is the bonus not added to the archer's score?** The rules award it to the team. The scoreboard prints it separately, and the team score is archers + bonus.
2. **How do you make sure the game doesn't stop mid-round?** `decideOutcome` runs only after `scoreRound` has processed every team for that round, and the parser guarantees every round has all archers' selections.
3. **Two teams reach 60 in the same round. Who wins?** The highest score after that whole round, bonuses included. The test "the winner is decided after bonuses…" has a case where the bonus flips the result.
4. **What if they tie?** `outcome.type === 'tie'` lists every leader, and the CLI says no tie-breaker exists. To add one, you would only change `decideOutcome`.
5. **Why does F/F get a bonus?** The rule is "same circle"; F is a circle. It is documented as an interpretation, and changing it is one line in `earnsSyncBonus`.
6. **The sample shows no bonus for Gyrhuna's A/A in round 4. Why doesn't your output match?** The written rule takes precedence. Matching the sample would mean adding an unstated exception. The discrepancy is documented in `docs/SAMPLE_VERIFICATION.md`.
7. **How are names with accents handled?** The file is read as UTF-8 and names are NFC-normalised before comparison, so precomposed and combining-character spellings match. Output prints them unchanged.
8. **Why validate everything before scoring?** So a bad line 40 can't produce a misleading partial scoreboard. All-or-nothing is easier to reason about.
9. **How would you test the CLI without spawning processes?** `main(args, { stdout, stderr, readFile })` accepts fakes. Both styles are in `test/cli.test.js`.
10. **What's the complexity?** O(L) to parse and O(R·P) to score, with O(R·P) memory for the per-round snapshots.
11. **Why `process.exitCode` instead of `process.exit()`?** It lets pending output flush and keeps `main()` free of side effects, so tests can call it.
12. **Why do you rethrow unknown errors in the CLI?** Only expected, user-fixable problems (bad input, missing file) get friendly messages. Anything else is a bug or an environment failure and should crash loudly with a stack trace, not be hidden.
13. **How would you make the threshold a CLI flag?** Parse `--winning-score N` in `cli.js` (e.g. with `node:util`'s `parseArgs`), validate it, and pass `{ winningScore }` to `playTournament`.

## Live-coding tasks an interviewer might ask for

1. **Add `--winning-score`.** Use `util.parseArgs` in `cli.js` and pass the value through. Add a CLI test.
2. **Add a tie-breaker** (e.g. most A hits, or highest last-round score). Track hit counts in `scoreRound`, extend `decideOutcome`, and turn the tie test into a winner test.
3. **JSON output mode.** Add `renderJson(result)` in `scoreboard.js` (Maps → objects) and a `--format json` flag. Game logic is untouched.
4. **Teams of three.** Make `ARCHERS_PER_TEAM` configurable. Change `earnsSyncBonus` to `new Set(circles).size === 1` and decide whether two-of-three matching earns a partial bonus (a product question).
5. **Sort the scoreboard by score** instead of declaration order, with a stable tie order. This is a renderer-only change, and the tests that rely on declaration order would need updating.

## Weaknesses and limitations

- Names cannot contain commas, and name matching is case-sensitive (`meilong` ≠ `Meilong`). This is deliberate strictness, but a "did you mean" hint would be friendlier.
- All rounds must be in the file up front, so it cannot score a live tournament as arrows land.
- The scoreboard is plain text only, with no column alignment.
- Snapshots are kept for every round (O(R·P) memory). This is irrelevant at this size but avoidable.
- The sample `input.txt` past Round 1 is a reconstruction because the original sample wasn't available. The real sample must be checked before submission.
- The F/F bonus and tie handling are interpretations. They are documented and isolated, but the assignment owner hasn't confirmed them.
