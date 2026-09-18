import { generateFirstRound, type FirstRoundMatch } from '../../domain/match/bracket.js';

export type GeneratedMatch = FirstRoundMatch & { readonly id: string };

export class BracketGenerator {
  constructor(private readonly random: () => number = Math.random) {}

  firstRound(acceptedTeamIds: readonly string[]): GeneratedMatch[] {
    return generateFirstRound(acceptedTeamIds, this.random).map((match, index) => ({ ...match, id: `match-${index + 1}` }));
  }
}
