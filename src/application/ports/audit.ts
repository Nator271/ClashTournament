export type AuditEntry = {
  readonly id: string;
  readonly guildId: string;
  readonly tournamentId?: string;
  readonly actorUserId?: string;
  readonly action: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: Date;
};

export type AuditPort = {
  append(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<AuditEntry>;
  listForTournament(tournamentId: string): Promise<AuditEntry[]>;
};

export type OutboxPort = {
  enqueue(eventType: string, payload: Record<string, unknown>, guildId: string, tournamentId?: string): Promise<void>;
  drain(): Promise<void>;
};
