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

  private assertSafePayload(payload: Record<string, unknown>): void {
    for (const key of Object.keys(payload)) {
      if (forbiddenPayloadKeys.test(key)) {
        throw new Error('Audit payload contains a forbidden secret field.');
      }
    }
  }
}