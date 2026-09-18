import type { AuditEntry, AuditPort } from '../ports/audit.js';

const forbiddenPayloadKeys = /token|secret|authorization|api[-_]?key|password/i;

export class AuditService {
  constructor(private readonly audit: AuditPort) {}

  append(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<AuditEntry> {
    this.assertSafePayload(entry.payload);
    return this.audit.append(entry);
  }

  listForTournament(tournamentId: string): Promise<AuditEntry[]> {
    return this.audit.listForTournament(tournamentId);
  }

  private assertSafePayload(payload: Record<string, unknown>, visited = new Set<object>()): void {
    for (const [key, value] of Object.entries(payload)) {
      if (forbiddenPayloadKeys.test(key)) {
        throw new Error('Audit payload contains a forbidden secret field.');
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