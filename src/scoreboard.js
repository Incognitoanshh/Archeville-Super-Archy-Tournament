// Text rendering only. Ordering always follows the team declaration order,
// and within a team the order the archers were declared, so output is stable.

export function renderRound({ roundNumber, standings }) {
  return [
    `Round ${roundNumber}`,
    'Team Scores',
    ...standings.map((team) => `${team.name}: ${team.score}`),
    'Individual Scores',
    ...standings.flatMap((team) => team.archers.map((archer) => `${archer.name}: ${archer.score}`)),
    'Bonus Points',
    ...standings.map((team) => `${team.name}: ${team.bonus}`),
  ].join('\n');
}

export function renderOutcome(outcome) {
  switch (outcome.type) {
    case 'winner':
      return `Winner: ${outcome.teams[0]} with ${outcome.score} points`;
    case 'tie':
      return `Tie: ${outcome.teams.join(', ')} share the highest score of ${outcome.score} points. ` +
        'The rules define no tie-breaker, so no single winner is declared.';
    case 'none':
      return `No winner: no team reached ${outcome.winningScore} points before the rounds ran out.`;
    default:
      throw new Error(`Unknown outcome type "${outcome.type}".`);
  }
}

export function renderTournament({ rounds, outcome, unplayedRounds }) {
  const blocks = rounds.map(renderRound);
  blocks.push(renderOutcome(outcome));
  if (unplayedRounds > 0) {
    blocks.push(`(${unplayedRounds} later round${unplayedRounds === 1 ? '' : 's'} in the input ignored: the game was already decided.)`);
  }
  return `${blocks.join('\n\n')}\n`;
}
