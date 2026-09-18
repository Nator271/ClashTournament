import { describe, expect, it } from 'vitest';

import { AuthorizationService } from '../../../src/application/services/authorization-service.js';
import { CloseRegistration } from '../../../src/application/use-cases/close-registration.js';
import { AdvanceRound } from '../../../src/application/use-cases/advance-round.js';
import { ProposeMatchSchedule, ConfirmMatchSchedule } from '../../../src/application/use-cases/match-scheduling/index.js';
import { BracketGenerator } from '../../../src/application/services/bracket-generator.js';
import { createMatch, type Match } from '../../../src/domain/match/match.js';

const context = { guildId: 'guild-1', userId: 'organizer-1', roleIds: [], isAdmin: true };
const audit = { append: async (entry: Record<string, unknown>) => ({ ...entry, id: 'audit-1', createdAt: new Date(), guildId: 'guild-1', action: 'test', payload: {} }), listForTournament: async () => [] };

describe('US3 bracket and scheduling use cases', () => {
  it('closes registration atomically and creates an explicit bye', async () => {
    const matches: unknown[] = [];
    const rounds: unknown[] = [];
    const deadlines: string[] = [];
    let savedStatus = '';
    const close = new CloseRegistration({
      authorization: new AuthorizationService({}),
      tournament: {
        findById: async () => ({ id: 'tournament-1', guildId: 'guild-1', status: 'REGISTRATION_OPEN', roundDurationMinutes: 60 }),
        save: async (tournament) => { savedStatus = tournament.status; return tournament; },
      },
      acceptedTeamIds: async () => ['a', 'b', 'c'],
      createRound: async (round) => { rounds.push(round); },
      createMatch: async (match) => { matches.push(match); },
      scheduler: { registerDeadline: async (deadline) => { deadlines.push(deadline.id); }, recoverPendingDeadlines: async () => [], completeDeadline: async () => undefined },
      audit,
    }, new BracketGenerator(() => 0.999));

    const generated = await close.execute({ context, tournamentId: 'tournament-1' });
    expect(generated).toHaveLength(2);
    expect(matches).toHaveLength(2);
    expect((matches[1] as { teamBId: string | null }).teamBId).toBeNull();
    expect(rounds).toHaveLength(1);
    expect(savedStatus).toBe('IN_PROGRESS');
    expect(deadlines).toHaveLength(1);
  });

  it('blocks next round until all matches are resolved and confirms schedules', async () => {
    const advance = new AdvanceRound(() => 0.999);
    expect(() => advance.execute({ matchStatuses: ['RESOLVED', 'ACTIVE'], winners: ['a', 'b'] })).toThrow(/complete/i);
    expect(advance.execute({ matchStatuses: ['RESOLVED', 'STAFF_DECIDED'], winners: ['a', 'b'] })).toHaveLength(1);

    let match: Match = createMatch({ id: 'match-1', teamAId: 'a', teamBId: 'b', deadline: new Date('2026-10-01T00:00:00Z') });
    const store = { findById: async () => match, save: async (next: Match) => { match = next; return next; } };
    await new ProposeMatchSchedule(store).execute({ matchId: 'match-1', managerId: 'manager-a', scheduledAt: new Date('2026-09-25T00:00:00Z') });
    expect((await new ConfirmMatchSchedule(store).execute({ matchId: 'match-1', managerId: 'manager-b' })).status).toBe('ACTIVE');
  });
});
