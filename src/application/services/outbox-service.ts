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
    this.assertSafePayload(payload);
    return this.outbox.enqueue(eventType, payload, guildId, tournamentId);
  }

  drain(): Promise<void> {
    return this.outbox.drain();
  }

  private assertSafePayload(payload: Record<string, unknown>, visited = new Set<object>()): void {
    for (const [key, value] of Object.entries(payload)) {
      if (forbiddenPayloadKeys.test(key)) {
        throw new Error('Outbox payload contains a forbidden secret field.');
      }

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'object') {
        if (visited.has(value)) {
          continue;
        }
        visited.add(value);
        this.assertSafePayload(value as Record<string, unknown>, visited);
      }
    }
  }
}