import { describe, expect, it } from 'vitest';

import { DiscordOutboxWorker } from '../../src/adapters/discord/outbox-worker.js';

describe('tournament completion outbox', () => {
  it('publishes the final announcement once and can recover it after restart', async () => {
    let processed = false;
    let publications = 0;
    const source = {
      listPending: async () => processed ? [] : [{ id: 'final-1', aggregateType: 'guild', aggregateId: 'guild-1', eventType: 'tournament.completed', payload: { name: 'Winter Clash', winnerTeamId: 'team-a' }, processedAt: null, createdAt: new Date() }],
      markProcessed: async () => { processed = true; },
    };
    const effects = { publishTournamentAnnouncement: async () => { publications += 1; return { messageId: 'message-1' }; }, createMatchSpace: async () => ({}), sendStatusNotice: async () => undefined };
    const worker = new DiscordOutboxWorker(source, effects);
    await worker.processPending();
    await worker.processPending();
    expect(publications).toBe(1);
  });
});
