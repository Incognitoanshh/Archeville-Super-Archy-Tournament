# Sample verification

This report recomputes the sample tournament by hand, round by round, and compares it with the program's output. The same numbers are asserted in `test/cli.test.js`.

## Important: what this sample is (and is not)

The assignment's original sample input and full sample output were **not available** while this was built. Only the following came from the assignment brief:

- the three teams and their archers,
- the Round 1 scoreboard (reproduced exactly, see below),
- the statement that in **Round 4 Gyrhuna's archers both hit A**, so a 2-point bonus is due, and that the assignment's sample output appears not to include it,
- the statement that **more than one team reaches 60 in Round 5**.

`input.txt` is a reconstruction consistent with all of those facts. Rounds 2–6 are my own values, not the assignment's. **Before submitting, replace `input.txt` with the assignment's sample input, run `npm start`, and redo the per-round check below against the assignment's printed output.** If the assignment's format differs from the one documented in the README, convert it (only the layout changes) and say so in the README.

## Point values per round

| Round | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| 1 | 5 | 4 | 3 | 2 | 1 | 0 |
| 2 | 6 | 5 | 4 | 3 | 2 | 0 |
| 3 | 7 | 6 | 5 | 4 | 3 | 0 |
| 4 | 8 | 7 | 6 | 5 | 4 | 0 |
| 5 | 9 | 8 | 7 | 6 | 5 | 0 |

## Round-by-round check

Player order: János Diák, Meilong, Pakhangba, Süsü, Tianlong, Poubi Lai Paphal.
In each cell: circles → individual points (+ bonus) = round total → running total.

| Round | Input line | Gyrhuna (János, Süsü) | Achni (Meilong, Tianlong) | Bathar (Pakhangba, Poubi) |
|---|---|---|---|---|
| 1 | `A, C, E, B, D, F` | A/B → 5+4 = 9 → **9** | C/D → 3+2 = 5 → **5** | E/F → 1+0 = 1 → **1** |
| 2 | `A, A, B, A, A, C` | A/A → 6+6 (+2) = 14 → **23** | A/A → 6+6 (+2) = 14 → **19** | B/C → 5+4 = 9 → **10** |
| 3 | `B, A, C, A, A, C` | B/A → 6+7 = 13 → **36** | A/A → 7+7 (+2) = 16 → **35** | C/C → 5+5 (+2) = 12 → **22** |
| 4 | `A, A, D, A, B, D` | **A/A → 8+8 (+2) = 18 → 54** | A/B → 8+7 = 15 → **50** | D/D → 5+5 (+2) = 12 → **34** |
| 5 | `A, A, F, B, A, F` | A/B → 9+8 = 17 → **71** | A/A → 9+9 (+2) = 20 → **70** | F/F → 0+0 (+2) = 2 → **36** |
| 6 | `A, A, A, A, A, A` | not played: game decided in round 5 | | |

After round 4 nobody has 60 (54 / 50 / 34), so the game continues. In round 5, Gyrhuna (71) and Achni (70) both reach 60. The whole round is scored first, and the higher final score wins: **Gyrhuna, 71**.

Final individual scores: János Diák 5+6+6+8+9 = 34, Süsü 4+6+7+8+8 = 33, Meilong 3+6+7+8+9 = 33, Tianlong 2+6+7+7+9 = 31, Pakhangba 1+5+5+5+0 = 16, Poubi Lai Paphal 0+4+5+5+0 = 14.
Check (team = archers + bonus): Gyrhuna 34+33+4 = 71, Achni 33+31+6 = 70, Bathar 16+14+6 = 36. ✔

## The Round 4 bonus

The brief says the assignment's sample shows Gyrhuna hitting A/A in Round 4, but the cumulative score printed after it does not include the 2-point bonus. The written rule is unambiguous: two teammates hitting the same circle in the same round earn 2 points. This implementation follows the written rule and **does not reproduce the sample's arithmetic**.

Why this matters: an omitted bonus is not cosmetic, because it can change the winner. In this reconstruction, dropping the Round 4 bonus would leave Gyrhuna on 69 against Achni's 70, and **Achni** would be declared the winner. Whether the same reversal happens in the original sample can only be checked once its exact input is pasted in.

If the assignment owner confirms the sample is right, then there is an unstated rule (for example "no bonus on A", or "bonus only from Round 5"). That rule would change `earnsSyncBonus` in `src/tournament.js`, which is the single place the bonus condition lives.

## Other interpretations used here

- **F/F earns the bonus.** Both archers selected the same circle, and the rule text has no exception for F. Sample Round 5 (Bathar F/F) depends on this, and so does a dedicated unit test.
- **Tie at the top after the deciding round:** reported as a tie with all tied teams. No tie-breaker is invented.
