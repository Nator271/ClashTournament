import { describe, expect, it } from 'vitest';

import { CreateTournamentDraft } from '../../../src/application/use-cases/create-tournament-draft.js';
import { PublishTournament } from '../../../src/application/use-cases/publish-tournament.js';
import { CreateTournament } from '../../../src/application/use-cases/create-tournament.js';
import type { AuthorizationPort } from '../../../src/application/ports/authorization.js';
import type { AuditPort, OutboxPort } from '../../../src/application/ports/audit.js';
import { defaultTournamentFormatRegistry } from '../../../src/domain/tournament/format-strategy.js';
import { TournamentStatus } from '../../../src/domain/tournament/tournament.js';

const authorization: AuthorizationPort = {
  canManageTournament: () => ({ allowed: true }),
  canModerateApplications: () => ({ allowed: true }),
  canViewGuildData: () => ({ allowed: true }),
};

const audit: AuditPort = {
  append: async (entry) => ({ ...entry, id: 'audit-1', createdAt: new Date() }),
  listForTournament: async () => [],
};

const outboxEvents: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
const outbox: OutboxPort = {
  enqueue: async (eventType, payload) => {
    outboxEvents.push({ eventType, payload });
  },
  drain: async () => undefined,
};

describe('US1 tournament publication flow', () => {
  it('rejects unauthorized organizers and supports draft cancellation', async () => {
    const deniedAuthorization: AuthorizationPort = {
      ...authorization,
      canManageTournament: () => ({ allowed: false, reason: 'Organizer role required.' }),
    };
    const draftRepo = {
      save: async (draft: import('../../../src/application/use-cases/create-tournament-draft.js').TournamentDraft) => draft,
      findById: async () => null,
    };
    const createDraft = new CreateTournamentDraft(draftRepo, deniedAuthorization, audit);

    await expect(
      createDraft.execute({
        context: { guildId: 'guild-1', userId: 'user-1', roleIds: [], isAdmin: false },
        name: 'Denied',
        playersPerTeam: 1,
        registrationStartsAt: new Date('2026-01-02T00:00:00Z'),
        registrationEndsAt: new Date('2026-01-08T00:00:00Z'),
        roundDurationMinutes: 60,
      }),
    ).rejects.toThrow('Organizer role required.');
  });

  it('keeps only single-elimination as the enabled v1 format strategy', () => {
    expect(Array.from(defaultTournamentFormatRegistry.keys())).toEqual(['SINGLE_ELIMINATION']);
  });

  it('publishes a confirmed tournament draft and opens registration on the start date', async () => {
    const draftRepo = {
      save: async (draft: import('../../../src/application/use-cases/create-tournament-draft.js').TournamentDraft) => draft,
      findById: async () => null,
    };

    const createDraft = new CreateTournamentDraft(draftRepo, authorization, audit);
    const draft = await createDraft.execute({
      context: {
        guildId: 'guild-1',
        userId: 'organizer-1',
        roleIds: [],
        isAdmin: false,
      },
      name: 'Winter Clash',
      playersPerTeam: 5,
      registrationStartsAt: new Date('2026-01-02T00:00:00Z'),
      registrationEndsAt: new Date('2026-01-08T00:00:00Z'),
      roundDurationMinutes: 60,
    });

    const publisher = new PublishTournament(authorization, audit, outbox);
    const flow = new CreateTournament(createDraft, publisher, authorization);
    const confirmed = flow.confirm(
      { guildId: 'guild-1', userId: 'organizer-1', roleIds: [], isAdmin: false },
      draft,
    );
    expect(confirmed.confirmed).toBe(true);
    expect(flow.cancel({ guildId: 'guild-1', userId: 'organizer-1', roleIds: [], isAdmin: false }, draft).cancelled).toBe(true);
    const published = await publisher.execute({
      context: {
        guildId: 'guild-1',
        userId: 'organizer-1',
        roleIds: [],
        isAdmin: false,
      },
      draft,
    });

    expect(published.confirmed).toBe(true);
    expect(published.tournament.status).toBe(TournamentStatus.REGISTRATION_OPEN);

    await publisher.execute({
      context: {
        guildId: 'guild-1',
        userId: 'organizer-1',
        roleIds: [],
        isAdmin: false,
      },
      draft,
    });
    expect(outboxEvents).toHaveLength(1);
  });
});
