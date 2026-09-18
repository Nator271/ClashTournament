import { DomainError } from '../../domain/shared/index.js';
import { isReadOnlyTournamentStatus } from '../../domain/tournament/tournament.js';
import { buildSingleEliminationStandings, isBracketResolved, summarizeRounds } from '../../domain/tournament/standings.js';
import type {
  TournamentBracketSource,
  TournamentCompletionStore,
  TournamentSummary,
} from '../ports/tournament-standings.js';

export type TournamentSummaryDependencies = {
  readonly tournaments: TournamentCompletionStore;
  readonly bracket: TournamentBracketSource;
};

/**
 * Builds the consultable recap of a tournament (FR-023, FR-027): public status, final ranking when
 * the bracket is resolved, round results and the read-only state of a completed or archived event.
 * Reading a summary never writes anything, so the recap stays available without a new registration.
 */
export class GetTournamentSummary {
  constructor(private readonly dependencies: TournamentSummaryDependencies) {}

  async execute(input: { readonly tournamentId: string; readonly guildId?: string }): Promise<TournamentSummary> {
    const tournament = await this.dependencies.tournaments.findById(input.tournamentId);
    if (tournament === null) throw new DomainError('NOT_FOUND', 'Tournament not found.');
    if (input.guildId !== undefined && tournament.guildId !== input.guildId) {
      throw new DomainError('NOT_FOUND', 'Tournament not found.');
    }

    const matches = await this.dependencies.bracket.listMatches(tournament.id);
    const isRankingAvailable = isBracketResolved(matches);
    const ranking = isRankingAvailable ? buildSingleEliminationStandings(matches, tournament.format).entries : [];
    const winnerTeamId = ranking.find((entry) => entry.isWinner)?.teamId;
    const teamNames = await this.loadTeamNames(tournament.id);

    return {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      format: tournament.format,
      ranking,
      isRankingAvailable,
      rounds: summarizeRounds(matches),
      isReadOnly: isReadOnlyTournamentStatus(tournament.status),
      ...(winnerTeamId === undefined ? {} : { winnerTeamId }),
      ...(teamNames === undefined ? {} : { teamNames }),
    };
  }

  private async loadTeamNames(tournamentId: string): Promise<Record<string, string> | undefined> {
    const teams = await this.dependencies.bracket.listTeamNames?.(tournamentId);
    if (teams === undefined || teams.length === 0) return undefined;
    return Object.fromEntries(
      [...teams].sort((first, second) => first.id.localeCompare(second.id)).map((team) => [team.id, team.name]),
    );
  }
}
