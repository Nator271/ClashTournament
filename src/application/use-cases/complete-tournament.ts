import type { AuditPort, OutboxPort } from '../ports/audit.js';

export type TournamentCompletionRecord = { readonly id: string; readonly guildId: string; readonly status: string; readonly name?: string };
export type FinalResult = { readonly teamId: string; readonly winner: boolean; readonly round?: number };
export type RankingEntry = { readonly teamId: string; readonly position: number };

type CompletionDependencies = {
  readonly tournaments: { findById(id: string): Promise<TournamentCompletionRecord | null>; save(tournament: TournamentCompletionRecord): Promise<TournamentCompletionRecord> };
  readonly matches: { listFinalResults(tournamentId: string): Promise<readonly FinalResult[]> };
  readonly outbox: OutboxPort;
  readonly audit: AuditPort;
};

export class CompleteTournament {
  private readonly completed = new Map<string, readonly RankingEntry[]>();

  constructor(private readonly dependencies: CompletionDependencies) {}

  async execute(input: { readonly tournamentId: string; readonly guildId: string; readonly actorUserId: string }): Promise<{ readonly ranking: readonly RankingEntry[] }> {
    const existing = this.completed.get(input.tournamentId);
    if (existing !== undefined) return { ranking: existing };
    const tournament = await this.dependencies.tournaments.findById(input.tournamentId);
    if (tournament === null || tournament.guildId !== input.guildId) throw new Error('Tournament not found.');
    if (tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
      const results = await this.dependencies.matches.listFinalResults(input.tournamentId);
      const ranking = rankResults(results);
      this.completed.set(input.tournamentId, ranking);
      return { ranking };
    }
    if (tournament.status !== 'IN_PROGRESS') throw new Error('Only an in-progress tournament can be completed.');
    const results = await this.dependencies.matches.listFinalResults(input.tournamentId);
    if (results.length === 0) throw new Error('The final match is not resolved.');
    const ranking = rankResults(results);
    await this.dependencies.tournaments.save({ ...tournament, status: 'COMPLETED' });
    await this.dependencies.outbox.enqueue('tournament.completed', { tournamentId: input.tournamentId, name: tournament.name ?? 'Tournament', winnerTeamId: ranking[0]?.teamId ?? null, ranking }, input.guildId, input.tournamentId);
    await this.dependencies.audit.append({ guildId: input.guildId, tournamentId: input.tournamentId, actorUserId: input.actorUserId, action: 'tournament.completed', payload: { winnerTeamId: ranking[0]?.teamId ?? null } });
    this.completed.set(input.tournamentId, ranking);
    return { ranking };
  }
}

export class GetTournamentSummary {
  constructor(private readonly dependencies: { readonly tournaments: { findById(id: string): Promise<TournamentCompletionRecord | null> }; readonly matches: { listFinalResults(tournamentId: string): Promise<readonly FinalResult[]> } }) {}

  async execute(tournamentId: string): Promise<{ readonly id: string; readonly name: string; readonly status: string; readonly winnerTeamId?: string; readonly ranking: readonly RankingEntry[]; readonly readOnly: boolean }> {
    const tournament = await this.dependencies.tournaments.findById(tournamentId);
    if (tournament === null) throw new Error('Tournament not found.');
    const ranking = rankResults(await this.dependencies.matches.listFinalResults(tournamentId));
    const winnerTeamId = ranking[0]?.teamId;
    return { id: tournament.id, name: tournament.name ?? 'Tournament', status: tournament.status, ranking, readOnly: tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED', ...(winnerTeamId === undefined ? {} : { winnerTeamId }) };
  }
}

function rankResults(results: readonly FinalResult[]): RankingEntry[] {
  return [...results].sort((first, second) => Number(second.winner) - Number(first.winner)).map((result, index) => ({ teamId: result.teamId, position: index + 1 }));
}
