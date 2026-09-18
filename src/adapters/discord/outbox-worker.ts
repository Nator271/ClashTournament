import type { DiscordEffectsPort, DiscordMessageTarget } from '../../application/ports/discord-effects.js';
import type { PersistedOutboxEvent } from '../../infrastructure/persistence/repositories/index.js';

export type OutboxEventSource = {
  listPending(): Promise<readonly PersistedOutboxEvent[]>;
  markProcessed?(id: string): Promise<void>;
};

export class DiscordOutboxWorker {
  constructor(
    private readonly source: OutboxEventSource,
    private readonly effects: DiscordEffectsPort,
  ) {}

  async processPending(): Promise<void> {
    const events = await this.source.listPending();
    for (const event of events) {
      if (event.aggregateType !== 'guild' || (event.eventType !== 'tournament.registration.publish' && event.eventType !== 'tournament.completed')) continue;
      const payload = event.payload;
      const target: DiscordMessageTarget = {
        guildId: event.aggregateId,
        ...(typeof payload.channelId === 'string' ? { channelId: payload.channelId } : {}),
      };
      const isCompletion = event.eventType === 'tournament.completed';
      await this.effects.publishTournamentAnnouncement(target, {
        title: typeof payload.name === 'string' ? payload.name : isCompletion ? 'Tournament completed' : 'Tournament registration',
        description: isCompletion
          ? `Winner: ${typeof payload.winnerTeamId === 'string' ? payload.winnerTeamId : 'undetermined'}. Final summary is read-only.`
          : (typeof payload.description === 'string' ? payload.description : 'Registration is open.'),
        color: 0x2f80ed,
      });
      if (this.source.markProcessed !== undefined) await this.source.markProcessed(event.id);
    }
  }
}