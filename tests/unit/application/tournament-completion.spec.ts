import { describe, expect, it } from 'vitest';

import { CompleteTournament, GetTournamentSummary } from '../../../src/application/use-cases/complete-tournament.js';

describe('US5 tournament completion', () => {
  it('completes an in-progress tournament, ranks teams and is idempotent', async () => {
    let status = 'IN_PROGRESS';
    let saves = 0;
    const enqueued: string[] = [];
    const complete = new CompleteTournament({
      tournaments: { findById: async () => ({ id: 'tournament-1', guildId: 'guild-1', status }), save: async (tournament) => { status = tournament.status; saves += 1; return tournament; } },
      matches: { listFinalResults: async () => [{ teamId: 'team-a', winner: true }, { teamId: 'team-b', winner: false }] },
      outbox: { enqueue: async (eventType) => { enqueued.push(eventType); }, drain: async () => undefined },
      audit: { append: async (entry) => ({ ...entry, id: 'audit-1', createdAt: new Date() }), listForTournament: async () => [] },
    });
    const first = await complete.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' });
    const second = await complete.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' });
    expect(first.ranking[0]?.teamId).toBe('team-a');
    expect(second.ranking).toEqual(first.ranking);
    expect(status).toBe('COMPLETED');
    expect(saves).toBe(1);
    expect(enqueued).toEqual(['tournament.completed']);
  });

  it('returns a read-only summary for completed tournaments', async () => {
    const summary = await new GetTournamentSummary({ tournaments: { findById: async () => ({ id: 'tournament-1', guildId: 'guild-1', name: 'Winter Clash', status: 'COMPLETED' }) }, matches: { listFinalResults: async () => [{ teamId: 'team-a', winner: true }] } }).execute('tournament-1');
    expect(summary.status).toBe('COMPLETED');
    expect(summary.readOnly).toBe(true);
    expect(summary.winnerTeamId).toBe('team-a');
  });
});
