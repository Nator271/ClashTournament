import { describe, expect, it, vi } from 'vitest';

import { InteractionRouter, parseCustomId } from '../../src/adapters/discord/interaction-router.js';
import { createTournamentCommandHandlers } from '../../src/adapters/discord/commands/tournament-commands.js';
import { createTournamentCreationModal } from '../../src/adapters/discord/modals/tournament-creation-modal.js';
import { presentTournamentRulesMessage } from '../../src/adapters/discord/presenters/tournament-presenter.js';
import { DiscordOutboxWorker } from '../../src/adapters/discord/outbox-worker.js';
import { Tournament, TournamentFormat, SingleEliminationFormatStrategy } from '../../src/domain/tournament/tournament.js';

describe('US1 Discord tournament creation contract', () => {
  it('uses versioned custom IDs for the two creation steps and publish action', () => {
    expect(parseCustomId('v1:tournament:create-rules')).toEqual({
      version: 'v1',
      namespace: 'tournament',
      action: 'create-rules',
    });
    expect(createTournamentCreationModal('rules').customId).toBe('v1:tournament:create-rules');
    expect(createTournamentCreationModal('schedule').customId).toBe('v1:tournament:create-schedule');
    expect(createTournamentCreationModal('rules').components).toHaveLength(3);
  });

  it('defers the publish interaction before running the application action', async () => {
    const order: string[] = [];
    const interaction = {
      isMessageComponent: () => true,
      isModalSubmit: () => false,
      customId: 'v1:tournament:publish:draft-1',
      replied: false,
      deferred: false,
      deferReply: vi.fn(async () => {
        order.push('defer');
        interaction.deferred = true;
      }),
      editReply: vi.fn(async () => {
        order.push('reply');
      }),
    };
    const handlers = createTournamentCommandHandlers({
      publish: async () => {
        order.push('publish');
      },
    });
    const router = new InteractionRouter();
    router.register('tournament', 'publish', handlers.publish);

    await router.route(interaction as never);

    expect(order).toEqual(['defer', 'publish']);
  });

  it('renders a public registration button and publishes each guild event once', async () => {
    const tournament = Tournament.create({
      id: 'tournament-1',
      guildId: 'guild-1',
      name: 'Winter Clash',
      organizerUserId: 'organizer-1',
      playersPerTeam: 5,
      registrationStartsAt: new Date('2026-01-02T00:00:00Z'),
      registrationEndsAt: new Date('2026-01-08T00:00:00Z'),
      roundDurationMinutes: 60,
      format: TournamentFormat.SINGLE_ELIMINATION,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      strategy: new SingleEliminationFormatStrategy(),
    });
    const message = presentTournamentRulesMessage(tournament);
    expect(message.components[0].customId).toBe('v1:tournament:register:tournament-1');

    const publications: string[] = [];
    const processed: string[] = [];
    const worker = new DiscordOutboxWorker(
      {
        listPending: async () => [
          { id: 'guild-event', aggregateType: 'guild', aggregateId: 'guild-1', eventType: 'tournament.registration.publish', payload: { name: 'Winter Clash' }, processedAt: null, createdAt: new Date() },
          { id: 'tournament-event', aggregateType: 'tournament', aggregateId: 'tournament-1', eventType: 'tournament.registration.publish', payload: { name: 'Winter Clash' }, processedAt: null, createdAt: new Date() },
        ],
        markProcessed: async (id) => {
          processed.push(id);
        },
      },
      {
        publishTournamentAnnouncement: async (target) => {
          publications.push(target.guildId);
          return { messageId: 'message-1' };
        },
        createMatchSpace: async () => ({}),
        sendStatusNotice: async () => undefined,
      },
    );

    await worker.processPending();
    // The tournament-scoped mirror row is drained without producing a second publication.
    expect(publications).toEqual(['guild-1']);
    expect(processed).toEqual(['guild-event', 'tournament-event']);
  });
});