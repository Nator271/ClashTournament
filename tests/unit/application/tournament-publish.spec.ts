import { describe, expect, it } from 'vitest';

import { CreateTournamentDraft } from '../../../src/application/use-cases/create-tournament-draft.js';
import { PublishTournament } from '../../../src/application/use-cases/publish-tournament.js';
import { defaultTournamentFormatRegistry } from '../../../src/domain/tournament/format-strategy.js';
import { TournamentStatus } from '../../../src/domain/tournament/tournament.js';

const authorization = {
  canManageTournament: () => ({ allowed: true }),
  canModerateApplications: () => ({ allowed: true }),
  canViewGuildData: () => ({ allowed: true }),
};

const audit = {
  append: async (entry: Record<string, unknown>) => ({ ...entry, id: 'audit-1', createdAt: new Date() }),
  listForTournament: async () => [],
};

const outbox = {
  enqueue: async () => undefined,
  drain: async () => undefined,
};

describe('US1 tournament publication flow', () => {
  it('keeps only single-elimination as the enabled v1 format strategy', () => {
    expect(Array.from(defaultTournamentFormatRegistry.keys())).toEqual(['SINGLE_ELIMINATION']);
  });

  it('publishes a confirmed tournament draft and opens registration on the start date', async () => {
    const draftRepo = {
      save: async (draft: unknown) => draft,
      findById: async () => null,
    };

    const createDraft = new CreateTournamentDraft(draftRepo as any, authorization as any, audit as any);
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

    const publisher = new PublishTournament(authorization as any, audit as any, outbox as any);
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
  });
});
