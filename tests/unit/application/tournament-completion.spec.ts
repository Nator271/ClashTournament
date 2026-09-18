import { describe, expect, it } from 'vitest';

import { CompleteTournament } from '../../../src/application/use-cases/complete-tournament.js';
import { GetTournamentSummary } from '../../../src/application/use-cases/get-tournament-summary.js';
import { TournamentLifecycle } from '../../../src/application/services/tournament-lifecycle.js';
import type { AuditEntry } from '../../../src/application/ports/audit.js';
import type { StandingMatch } from '../../../src/domain/tournament/standings.js';
import { TournamentFormat, TournamentStatus } from '../../../src/domain/tournament/tournament.js';

type TournamentRecord = {
  id: string;
  guildId: string;
  name: string;
  status: string;
  format: string;
};

/** In-memory completion dependencies so the use cases stay testable without SQLite or Discord. */
function createHarness(options: { status?: string; matches: readonly StandingMatch[] } = { matches: [] }) {
  const tournament: TournamentRecord = {
    id: 'tournament-1',
    guildId: 'guild-1',
    name: 'Winter Clash',
    status: options.status ?? TournamentStatus.IN_PROGRESS,
    format: TournamentFormat.SINGLE_ELIMINATION,
  };
  const matches = options.matches;
  const enqueued: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
  const auditActions: string[] = [];
  let saves = 0;

  const dependencies = {
    tournaments: {
      findById: async (id: string) => (id === tournament.id ? { ...tournament } : null),
      save: async (record: TournamentRecord) => {
        tournament.status = record.status;
        saves += 1;
        return record;
      },
    },
    bracket: {
      listMatches: async () => matches,
      listTeamNames: async () => [
        { id: 'team-a', name: 'Alpha' },
        { id: 'team-b', name: 'Bravo' },
        { id: 'team-c', name: 'Charlie' },
        { id: 'team-d', name: 'Delta' },
      ],
    },
    outbox: {
      enqueue: async (eventType: string, payload: Record<string, unknown>) => {
        enqueued.push({ eventType, payload });
      },
      drain: async () => undefined,
    },
    audit: {
      append: async (entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<AuditEntry> => {
        auditActions.push(entry.action);
        return { ...entry, id: 'audit-1', createdAt: new Date() };
      },
      listForTournament: async () => [],
    },
  };

  return {
    dependencies,
    enqueued,
    auditActions,
    get status() {
      return tournament.status;
    },
    get saves() {
      return saves;
    },
  };
}


describe('US5 tournament completion', () => {
  it('completes the tournament when the final round is resolved and publishes the ranking once', async () => {
    const harness = createHarness({ matches: resolvedBracket });
    const complete = new CompleteTournament(harness.dependencies);

    const first = await complete.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' });

    expect(harness.status).toBe(TournamentStatus.COMPLETED);
    expect(harness.saves).toBe(1);
    expect(first.winnerTeamId).toBe('team-a');
    expect(first.alreadyCompleted).toBe(false);
    expect(first.ranking).toEqual([
      { teamId: 'team-a', position: 1, isWinner: true },
      { teamId: 'team-c', position: 2, isWinner: false, eliminatedInRound: 2 },
      { teamId: 'team-b', position: 3, isWinner: false, eliminatedInRound: 1 },
      { teamId: 'team-d', position: 3, isWinner: false, eliminatedInRound: 1 },
    ]);
    expect(first.rounds.map((round) => round.number)).toEqual([1, 2]);
    expect(harness.auditActions).toEqual(['tournament.completed']);
    expect(harness.enqueued).toHaveLength(1);
    expect(harness.enqueued[0]?.eventType).toBe('tournament.completed');
    expect(harness.enqueued[0]?.payload).toMatchObject({ winnerTeamId: 'team-a', teamNames: { 'team-a': 'Alpha' } });
  });

  it('stays idempotent across repeated calls and never republishes the announcement', async () => {
    const harness = createHarness({ matches: resolvedBracket });
    const complete = new CompleteTournament(harness.dependencies);

    const first = await complete.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' });
    const second = await complete.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' });

    expect(second.alreadyCompleted).toBe(true);
    expect(second.ranking).toEqual(first.ranking);
    expect(harness.saves).toBe(1);
    expect(harness.enqueued).toHaveLength(1);
    expect(harness.auditActions).toEqual(['tournament.completed']);
  });

  it('rejects completion while a match is still unresolved', async () => {
    const unresolved = resolvedBracket.map((match) =>
      match.matchId === 'match-3' ? { ...match, winnerTeamId: null, status: 'AWAITING_RESULT' } : match,
    );
    const harness = createHarness({ matches: unresolved });
    const complete = new CompleteTournament(harness.dependencies);

    await expect(
      complete.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' }),
    ).rejects.toThrow(/not resolved/i);
    expect(harness.status).toBe(TournamentStatus.IN_PROGRESS);
    expect(harness.enqueued).toEqual([]);
  });

  it('rejects completion for a tournament that has not started', async () => {
    const harness = createHarness({ status: TournamentStatus.DRAFT, matches: resolvedBracket });
    const complete = new CompleteTournament(harness.dependencies);

    await expect(
      complete.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' }),
    ).rejects.toThrow(/in-progress/i);
    expect(harness.status).toBe(TournamentStatus.DRAFT);
    expect(harness.enqueued).toEqual([]);
  });

  it('rejects completion for a tournament owned by another guild', async () => {
    const harness = createHarness({ matches: resolvedBracket });
    const complete = new CompleteTournament(harness.dependencies);

    await expect(
      complete.execute({ tournamentId: 'tournament-1', guildId: 'other-guild', actorUserId: 'staff-1' }),
    ).rejects.toThrow(/not found/i);
  });

  it('completes automatically when the lifecycle observes the last resolved match', async () => {
    const harness = createHarness({ matches: resolvedBracket });
    const complete = new CompleteTournament(harness.dependencies);
    const lifecycle = new TournamentLifecycle(complete, harness.dependencies.bracket);

    const early = await new TournamentLifecycle(complete, {
      listMatches: async () => resolvedBracket.slice(0, 2),
    }).onMatchResolved({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' });
    expect(early).toEqual({ completed: false });
    expect(harness.status).toBe(TournamentStatus.IN_PROGRESS);

    const outcome = await lifecycle.onMatchResolved({
      tournamentId: 'tournament-1',
      guildId: 'guild-1',
      actorUserId: 'staff-1',
    });
    expect(outcome).toEqual({ completed: true, winnerTeamId: 'team-a' });
    expect(harness.status).toBe(TournamentStatus.COMPLETED);
    expect(harness.enqueued).toHaveLength(1);
  });

  it('exposes the available standings and round results in the consultable summary', async () => {
    const harness = createHarness({ matches: resolvedBracket });
    const summary = new GetTournamentSummary({
      tournaments: harness.dependencies.tournaments,
      bracket: harness.dependencies.bracket,
    });

    const recap = await summary.execute({ tournamentId: 'tournament-1', guildId: 'guild-1' });

    expect(recap.isRankingAvailable).toBe(true);
    expect(recap.winnerTeamId).toBe('team-a');
    expect(recap.ranking).toEqual([
      { teamId: 'team-a', position: 1, isWinner: true },
      { teamId: 'team-c', position: 2, isWinner: false, eliminatedInRound: 2 },
      { teamId: 'team-b', position: 3, isWinner: false, eliminatedInRound: 1 },
      { teamId: 'team-d', position: 3, isWinner: false, eliminatedInRound: 1 },
    ]);
    expect(recap.rounds.map((round) => round.number)).toEqual([1, 2]);
    expect(recap.isReadOnly).toBe(false);
  });

  it('keeps an archived tournament summary available and read-only', async () => {
    const harness = createHarness({ status: TournamentStatus.ARCHIVED, matches: resolvedBracket });
    const summary = new GetTournamentSummary({
      tournaments: harness.dependencies.tournaments,
      bracket: harness.dependencies.bracket,
    });

    const recap = await summary.execute({ tournamentId: 'tournament-1' });

    expect(recap.status).toBe(TournamentStatus.ARCHIVED);
    expect(recap.isReadOnly).toBe(true);
    expect(recap.isRankingAvailable).toBe(true);
    expect(recap.winnerTeamId).toBe('team-a');
  });

  it('omits the ranking while the bracket is still unfinished', async () => {
    const harness = createHarness({ matches: resolvedBracket.slice(0, 2) });
    const summary = new GetTournamentSummary({
      tournaments: harness.dependencies.tournaments,
      bracket: harness.dependencies.bracket,
    });

    const recap = await summary.execute({ tournamentId: 'tournament-1' });

    expect(recap.isRankingAvailable).toBe(false);
    expect(recap.ranking).toEqual([]);
    expect(recap.winnerTeamId).toBeUndefined();
    expect(recap.rounds).toHaveLength(1);
  });
});

/** A four-team bracket whose two semifinals and final are all resolved. */
const resolvedBracket: readonly StandingMatch[] = [
  { matchId: 'match-1', roundNumber: 1, teamAId: 'team-a', teamBId: 'team-b', winnerTeamId: 'team-a', status: 'RESOLVED' },
  { matchId: 'match-2', roundNumber: 1, teamAId: 'team-c', teamBId: 'team-d', winnerTeamId: 'team-c', status: 'RESOLVED' },
  { matchId: 'match-3', roundNumber: 2, teamAId: 'team-a', teamBId: 'team-c', winnerTeamId: 'team-a', status: 'RESOLVED' },
];
