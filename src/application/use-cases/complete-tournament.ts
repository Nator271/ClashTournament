import { DomainError, type Clock } from '../../domain/shared/index.js';
import { systemClock } from '../../domain/shared/index.js';
import { TournamentFormat, TournamentStatus, isReadOnlyTournamentStatus } from '../../domain/tournament/tournament.js';
import {
  buildSingleEliminationStandings,
  isBracketResolved,
  summarizeRounds,
  type RoundSummary,
  type StandingEntry,
  type StandingMatch,
} from '../../domain/tournament/standings.js';
import type { AuditPort, OutboxPort } from '../ports/audit.js';
import type { TournamentBracketSource, TournamentCompletionStore } from '../ports/tournament-standings.js';

/** Outbox event type published once when a tournament is completed (FR-022, FR-023). */
export const TOURNAMENT_COMPLETED_EVENT = 'tournament.completed';

export type CompletionDependencies = {
  readonly tournaments: TournamentCompletionStore;
  readonly bracket: TournamentBracketSource;
  readonly outbox: OutboxPort;
  readonly audit: AuditPort;
  readonly clock?: Clock;
};

export type TournamentCompletionResult = {
  readonly tournamentId: string;
  readonly winnerTeamId: string;
  readonly ranking: readonly StandingEntry[];
  readonly rounds: readonly RoundSummary[];
  readonly alreadyCompleted: boolean;
};

/** Returns `true` when the bracket may still be completed by this use case. */
export function canCompleteTournament(matches: readonly StandingMatch[], status: string, format: string): boolean {
  if (format !== TournamentFormat.SINGLE_ELIMINATION) return false;
  if (!isReadOnlyTournamentStatus(status) && status !== TournamentStatus.IN_PROGRESS) return false;
  return isBracketResolved(matches);
}

/**
 * Completes an in-progress tournament once its bracket is fully resolved, publishes the final
 * announcement exactly once through the outbox and appends an audit trail entry. Repeated calls,
 * including calls issued after a restart, are idempotent and never republish the announcement.
 */
export class CompleteTournament {
  private readonly clock: Clock;

  constructor(private readonly dependencies: CompletionDependencies) {
    this.clock = dependencies.clock ?? systemClock;
  }

  async execute(input: {
    readonly tournamentId: string;
    readonly guildId: string;
    readonly actorUserId: string;
  }): Promise<TournamentCompletionResult> {
    const tournament = await this.dependencies.tournaments.findById(input.tournamentId);
    if (tournament === null || tournament.guildId !== input.guildId) {
      throw new DomainError('NOT_FOUND', 'Tournament not found.');
    }

    const alreadyCompleted = isReadOnlyTournamentStatus(tournament.status);
    if (!alreadyCompleted && tournament.status !== TournamentStatus.IN_PROGRESS) {
      throw new DomainError('CONFLICT', 'Only an in-progress tournament can be completed.');
    }

    const matches = await this.dependencies.bracket.listMatches(tournament.id);
    if (!canCompleteTournament(matches, tournament.status, tournament.format)) {
      throw new DomainError('CONFLICT', 'The final match is not resolved yet.');
    }

    const standings = buildSingleEliminationStandings(matches, tournament.format);
    const rounds = summarizeRounds(matches);

    if (alreadyCompleted) {
      return {
        tournamentId: tournament.id,
        winnerTeamId: standings.winnerTeamId,
        ranking: standings.entries,
        rounds,
        alreadyCompleted: true,
      };
    }

    await this.dependencies.tournaments.save({ ...tournament, status: TournamentStatus.COMPLETED });
    await this.dependencies.outbox.enqueue(
      TOURNAMENT_COMPLETED_EVENT,
      await this.buildAnnouncementPayload(tournament.id, tournament.name, standings.entries, rounds),
      tournament.guildId,
      tournament.id,
    );
    await this.dependencies.audit.append({
      guildId: tournament.guildId,
      tournamentId: tournament.id,
      actorUserId: input.actorUserId,
      action: TOURNAMENT_COMPLETED_EVENT,
      payload: {
        winnerTeamId: standings.winnerTeamId,
        teamCount: standings.entries.length,
        finalRoundNumber: standings.finalRoundNumber,
        completedAt: this.clock.now().toISOString(),
      },
    });

    return {
      tournamentId: tournament.id,
      winnerTeamId: standings.winnerTeamId,
      ranking: standings.entries,
      rounds,
      alreadyCompleted: false,
    };
  }

  private async buildAnnouncementPayload(
    tournamentId: string,
    name: string,
    ranking: readonly StandingEntry[],
    rounds: readonly RoundSummary[],
  ): Promise<Record<string, unknown>> {
    const teams = (await this.dependencies.bracket.listTeamNames?.(tournamentId)) ?? [];
    const teamNames = Object.fromEntries(
      [...teams].sort((first, second) => first.id.localeCompare(second.id)).map((team) => [team.id, team.name]),
    );

    return {
      tournamentId,
      name,
      status: TournamentStatus.COMPLETED,
      winnerTeamId: ranking.find((entry) => entry.isWinner)?.teamId ?? null,
      ranking: ranking.map((entry) => ({
        position: entry.position,
        teamId: entry.teamId,
        isWinner: entry.isWinner,
      })),
      rounds: rounds.map((round) => ({
        number: round.number,
        matches: round.matches.map((match) => ({
          matchId: match.matchId,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          winnerTeamId: match.winnerTeamId,
          status: match.status,
        })),
      })),
      teamNames,
    };
  }
}
