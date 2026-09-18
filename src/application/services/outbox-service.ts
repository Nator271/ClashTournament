import type { OutboxPort } from '../ports/audit.js';

const forbiddenPayloadKeys = /token|secret|authorization|api[-_]?key|password/i;

export class OutboxService {
  constructor(private readonly outbox: OutboxPort) {}

  enqueue(
    eventType: string,
    payload: Record<string, unknown>,
    guildId: string,
    tournamentId?: string,
  ): Promise<void> {
    for (const key of Object.keys(payload)) {
      if (forbiddenPayloadKeys.test(key)) {
        throw new Error('Outbox payload contains a forbidden secret field.');
      }
    }

    return this.outbox.enqueue(eventType, payload, guildId, tournamentId);
  }

  drain(): Promise<void> {
    return this.outbox.drain();
  }
}