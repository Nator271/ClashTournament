import { canAdvanceRound } from '../../domain/match/round.js';
import { advanceElimination, type FirstRoundMatch } from '../../domain/match/bracket.js';

export class AdvanceRound {
  constructor(private readonly random: () => number = Math.random) {}

  execute(input: { readonly matchStatuses: readonly string[]; readonly winners: readonly string[] }): FirstRoundMatch[] {
    if (!canAdvanceRound(input.matchStatuses)) throw new Error('The current round is not complete.');
    return advanceElimination(input.winners, this.random);
  }
}
