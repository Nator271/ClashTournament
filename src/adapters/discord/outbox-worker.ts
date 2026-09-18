import type { DiscordEffectsPort } from '../../application/ports/discord-effects.js';
import type { PersistedOutboxEvent } from '../../infrastructure/persistence/repositories/index.js';
import { presentFinalTournament } from './presenters/final-tournament-presenter.js';
import {
  parseFinalTournamentAnnouncement,
  parseMessageTarget,
  parseRegistrationAnnouncement,
} from './outbox-payload.js';

export type OutboxEventSource = {
  listPending(): Promise<readonly PersistedOutboxEvent[]>;
  markProcessed?(id: string): Promise<void>;
};

const HANDLED_EVENTS = ['tournament.registration.publish', 'tournament.completed'] as const;
const SUPPORTED_AGGREGATES = ['guild', 'tournament'] as const;

/**
 * Publishes pending outbox events to Discord. The outbox stores one row per aggregate, so a single
 * logical event may appear twice with the same payload; publication therefore happens once per
 * event type and payload, and every matching row is marked as processed only after a successful
 * publication. A restart thus recovers a pending announcement without duplicating or losing it
 * (FR-022, FR-023).
 */
export class DiscordOutboxWorker {
  constructor(
    private readonly source: OutboxEventSource,
    private readonly effects: DiscordEffectsPort,
  ) {}

  async processPending(): Promise<void> {
    const groups = groupPendingEvents(await this.source.listPending());
    for (const group of groups) {
      const guildEvent = group.find((event) => event.aggregateType === 'guild');
      if (guildEvent === undefined) continue;
      await this.publish(guildEvent);
      if (this.source.markProcessed !== undefined) {
        for (const event of group) await this.source.markProcessed(event.id);
      }
    }
  }

  private async publish(event: PersistedOutboxEvent): Promise<void> {
    const target = parseMessageTarget(event.aggregateId, event.payload);

    if (event.eventType === 'tournament.completed') {
      const announcement = parseFinalTournamentAnnouncement(event.payload);
      if (announcement === null) return;
      const presentation = presentFinalTournament(announcement);
      await this.effects.publishTournamentAnnouncement(target, {
        title: presentation.title,
        description: presentation.description,
        color: presentation.color,
      });
      return;
    }

    const announcement = parseRegistrationAnnouncement(event.payload);
    await this.effects.publishTournamentAnnouncement(target, {
      title: announcement.title,
      description: announcement.description,
      color: 0x2f80ed,
    });
  }
}

/** Groups publishable outbox rows sharing the same event type and payload. */
function groupPendingEvents(events: readonly PersistedOutboxEvent[]): PersistedOutboxEvent[][] {
  const groups = new Map<string, PersistedOutboxEvent[]>();
  for (const event of events) {
    if (!isHandledEvent(event.eventType) || !isSupportedAggregate(event.aggregateType)) continue;
    const key = `${event.eventType}:${stableStringify(event.payload)}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()];
}

function isHandledEvent(eventType: string): boolean {
  return HANDLED_EVENTS.some((handled) => handled === eventType);
}

function isSupportedAggregate(aggregateType: string): boolean {
  return SUPPORTED_AGGREGATES.some((supported) => supported === aggregateType);
}

/** Serializes a payload with sorted object keys so equivalent payloads share a single key. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}