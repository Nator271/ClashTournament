import type { TournamentBracketSource } from '../ports/tournament-standings.js';
import { isBracketResolved } from '../../domain/tournament/standings.js';
import { CompleteTournament } from '../use-cases/complete-tournament.js';

export type MatchResolvedInput = {
  readonly tournamentId: string;
  readonly guildId: string;
  readonly actorUserId: string;
};

export type TournamentLifecycleOutcome = {
  readonly completed: boolean;
  readonly winnerTeamId?: string;
};

/**
 * Reacts to tournament lifecycle events. When the last unresolved match of the bracket is
 * resolved, the tournament is completed and the final announcement is enqueued exactly once;
 * every other resolution leaves the tournament untouched (FR-021, FR-022, FR-023).
 */
export class TournamentLifecycle {
  constructor(
    private readonly completion: CompleteTournament,
    private readonly bracket: TournamentBracketSource,
  ) {}

  async onMatchResolved(input: MatchResolvedInput): Promise<TournamentLifecycleOutcome> {
    const matches = await this.bracket.listMatches(input.tournamentId);
    if (!isBracketResolved(matches)) return { completed: false };

    const result = await this.completion.execute(input);
    return { completed: true, winnerTeamId: result.winnerTeamId };
  }
}
