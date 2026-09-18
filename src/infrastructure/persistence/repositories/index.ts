import type { AuditEntry, AuditPort, OutboxPort } from '../../../application/ports/audit.js';
import type {
  ApplicationRepository,
  PersistedEntity,
  TournamentRepository,
} from '../../../application/ports/persistence.js';
import type { TournamentDraft } from '../../../application/use-cases/create-tournament-draft.js';
import type { SqliteDatabase } from '../database.js';

export type { TournamentRepository, ApplicationRepository, RepositoryError, PersistedEntity } from '../../../application/ports/persistence.js';

export type ServerConfigurationRecord = {
  readonly id: string;
  readonly guildId: string;
  readonly leagueName: string;
  readonly organizerRoleId?: string | null;
  readonly staffRoleId?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type PersistedTournament = PersistedEntity & {
  readonly guildId: string;
  readonly organizerId: string;
  readonly title: string;
  readonly format: string;
  readonly playersPerTeam: number;
  readonly registrationStartsAt: Date;
  readonly registrationEndsAt: Date;
  readonly roundDurationMinutes: number;
  readonly optionalMessage?: string | null;
  readonly status: string;
};

export type PersistedApplication = PersistedEntity & {
  readonly tournamentId: string;
  readonly name: string;
  readonly status: string;
  readonly createdByUserId: string;
};

export type PersistedMatch = PersistedEntity & {
  readonly tournamentId: string;
  readonly roundId: string;
  readonly homeTeamApplicationId?: string | null;
  readonly awayTeamApplicationId?: string | null;
  readonly status: string;
  readonly scheduledFor?: Date | null;
  readonly threadId?: string | null;
};

export type PersistedDecision = {
  readonly id: string;
  readonly tournamentId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly actorUserId: string;
  readonly decision: string;
  readonly reason: string;
  readonly createdAt: Date;
};

export type PersistedOutboxEvent = {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly processedAt: Date | null;
  readonly createdAt: Date;
};

function toIsoDate(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) {
    return new Date(0).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function parseJson<T>(value: string | null): T | null {
  if (value === null) {
    return null;
  }

  return JSON.parse(value) as T;
}

export class SqliteServerConfigurationRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async save(configuration: ServerConfigurationRecord): Promise<ServerConfigurationRecord> {
    this.database
      .prepare(`
      INSERT INTO ServerConfiguration (
        id, guildId, leagueName, organizerRoleId, staffRoleId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        guildId = excluded.guildId,
        leagueName = excluded.leagueName,
        organizerRoleId = excluded.organizerRoleId,
        staffRoleId = excluded.staffRoleId,
        updatedAt = excluded.updatedAt
    `)
      .run(
        configuration.id,
        configuration.guildId,
        configuration.leagueName,
        configuration.organizerRoleId ?? null,
        configuration.staffRoleId ?? null,
        toIsoDate(configuration.createdAt),
        toIsoDate(configuration.updatedAt),
      );

    return configuration;
  }

  async findByGuildId(guildId: string): Promise<ServerConfigurationRecord | null> {
    const row = this.database
      .prepare('SELECT * FROM ServerConfiguration WHERE guildId = ? ORDER BY createdAt DESC LIMIT 1')
      .get(guildId) as
      | ({
          id: string;
          guildId: string;
          leagueName: string;
          organizerRoleId: string | null;
          staffRoleId: string | null;
          createdAt: string;
          updatedAt: string;
        })
      | undefined;

    if (row === undefined) {
      return null;
    }

    const organizerRoleId = row.organizerRoleId ?? undefined;
    const staffRoleId = row.staffRoleId ?? undefined;

    return {
      id: row.id,
      guildId: row.guildId,
      leagueName: row.leagueName,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      ...(organizerRoleId === undefined ? {} : { organizerRoleId }),
      ...(staffRoleId === undefined ? {} : { staffRoleId }),
    };
  }
}

export class SqliteTournamentRepository implements TournamentRepository<PersistedTournament> {
  constructor(private readonly database: SqliteDatabase) {}

  async save(entity: PersistedTournament): Promise<PersistedTournament> {
    this.database
      .prepare(`
        INSERT INTO Tournament (
          id, guildId, organizerId, title, format, playersPerTeam,
          registrationStartsAt, registrationEndsAt, roundDurationMinutes,
          optionalMessage, status, createdAt, updatedAt, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          guildId = excluded.guildId,
          organizerId = excluded.organizerId,
          title = excluded.title,
          format = excluded.format,
          playersPerTeam = excluded.playersPerTeam,
          registrationStartsAt = excluded.registrationStartsAt,
          registrationEndsAt = excluded.registrationEndsAt,
          roundDurationMinutes = excluded.roundDurationMinutes,
          optionalMessage = excluded.optionalMessage,
          status = excluded.status,
          updatedAt = excluded.updatedAt,
          version = excluded.version
      `)
      .run(
        entity.id,
        entity.guildId,
        entity.organizerId,
        entity.title,
        entity.format,
        entity.playersPerTeam,
        toIsoDate(entity.registrationStartsAt),
        toIsoDate(entity.registrationEndsAt),
        entity.roundDurationMinutes,
        entity.optionalMessage ?? null,
        entity.status,
        toIsoDate(entity.createdAt),
        toIsoDate(entity.updatedAt ?? entity.createdAt),
        1,
      );

    return entity;
  }

  async findById(id: string): Promise<PersistedTournament | null> {
    const row = this.database.prepare('SELECT * FROM Tournament WHERE id = ?').get(id) as
      | ({
          id: string;
          guildId: string;
          organizerId: string;
          title: string;
          format: string;
          playersPerTeam: number;
          registrationStartsAt: string;
          registrationEndsAt: string;
          roundDurationMinutes: number;
          optionalMessage: string | null;
          status: string;
          createdAt: string;
          updatedAt: string;
        })
      | undefined;

    if (row === undefined) {
      return null;
    }

    const optionalMessage = row.optionalMessage ?? undefined;
    return {
      id: row.id,
      guildId: row.guildId,
      organizerId: row.organizerId,
      title: row.title,
      format: row.format,
      playersPerTeam: row.playersPerTeam,
      registrationStartsAt: new Date(row.registrationStartsAt),
      registrationEndsAt: new Date(row.registrationEndsAt),
      roundDurationMinutes: row.roundDurationMinutes,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      ...(optionalMessage === undefined ? {} : { optionalMessage }),
    };
  }

  async listForGuild(guildId: string): Promise<PersistedTournament[]> {
    const rows = this.database
      .prepare('SELECT * FROM Tournament WHERE guildId = ? ORDER BY createdAt DESC')
      .all(guildId) as Array<{
      id: string;
      guildId: string;
      organizerId: string;
      title: string;
      format: string;
      playersPerTeam: number;
      registrationStartsAt: string;
      registrationEndsAt: string;
      roundDurationMinutes: number;
      optionalMessage: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;

    return rows.map((row) => {
      const optionalMessage = row.optionalMessage ?? undefined;
      return {
        id: row.id,
        guildId: row.guildId,
        organizerId: row.organizerId,
        title: row.title,
        format: row.format,
        playersPerTeam: row.playersPerTeam,
        registrationStartsAt: new Date(row.registrationStartsAt),
        registrationEndsAt: new Date(row.registrationEndsAt),
        roundDurationMinutes: row.roundDurationMinutes,
        status: row.status,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        ...(optionalMessage === undefined ? {} : { optionalMessage }),
      };
    });
  }
}

export class SqliteApplicationRepository implements ApplicationRepository<PersistedApplication> {
  constructor(private readonly database: SqliteDatabase) {}

  async save(entity: PersistedApplication): Promise<PersistedApplication> {
    this.database
      .prepare(`
        INSERT INTO TeamApplication (
          id, tournamentId, name, createdByUserId, status, createdAt, updatedAt, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          tournamentId = excluded.tournamentId,
          name = excluded.name,
          createdByUserId = excluded.createdByUserId,
          status = excluded.status,
          updatedAt = excluded.updatedAt,
          version = excluded.version
      `)
      .run(
        entity.id,
        entity.tournamentId,
        entity.name,
        entity.createdByUserId,
        entity.status,
        toIsoDate(entity.createdAt),
        toIsoDate(entity.updatedAt ?? entity.createdAt),
        1,
      );

    return entity;
  }

  async findById(id: string): Promise<PersistedApplication | null> {
    const row = this.database.prepare('SELECT * FROM TeamApplication WHERE id = ?').get(id) as
      | ({
          id: string;
          tournamentId: string;
          name: string;
          status: string;
          createdByUserId: string;
          createdAt: string;
          updatedAt: string;
        })
      | undefined;

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      tournamentId: row.tournamentId,
      name: row.name,
      status: row.status,
      createdByUserId: row.createdByUserId,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async findByTournamentId(tournamentId: string): Promise<PersistedApplication[]> {
    const rows = this.database
      .prepare('SELECT * FROM TeamApplication WHERE tournamentId = ? ORDER BY createdAt DESC')
      .all(tournamentId) as Array<{
      id: string;
      tournamentId: string;
      name: string;
      status: string;
      createdByUserId: string;
      createdAt: string;
      updatedAt: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      tournamentId: row.tournamentId,
      name: row.name,
      status: row.status,
      createdByUserId: row.createdByUserId,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }
}

export class SqliteDecisionRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async save(decision: PersistedDecision): Promise<PersistedDecision> {
    this.database
      .prepare(`
        INSERT INTO StaffDecision (
          id, tournamentId, targetType, targetId, actorUserId, decision, reason, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        decision.id,
        decision.tournamentId,
        decision.targetType,
        decision.targetId,
        decision.actorUserId,
        decision.decision,
        decision.reason,
        toIsoDate(decision.createdAt),
      );

    return decision;
  }

  async listForTournament(tournamentId: string): Promise<PersistedDecision[]> {
    const rows = this.database
      .prepare('SELECT * FROM StaffDecision WHERE tournamentId = ? ORDER BY createdAt DESC')
      .all(tournamentId) as Array<{ id: string; tournamentId: string; targetType: string; targetId: string; actorUserId: string; decision: string; reason: string; createdAt: string }>;

    return rows.map((row) => ({
      id: row.id,
      tournamentId: row.tournamentId,
      targetType: row.targetType,
      targetId: row.targetId,
      actorUserId: row.actorUserId,
      decision: row.decision,
      reason: row.reason,
      createdAt: new Date(row.createdAt),
    }));
  }
}

export class SqliteAuditRepository implements AuditPort {
  constructor(private readonly database: SqliteDatabase) {}

  async append(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<AuditEntry> {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const record = { ...entry, id, createdAt: new Date() };

    this.database
      .prepare(
        'INSERT INTO AuditEvent (id, tournamentId, eventType, actorUserId, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        record.id,
        record.tournamentId ?? null,
        record.action,
        record.actorUserId ?? null,
        JSON.stringify(record.payload),
        toIsoDate(record.createdAt),
      );

    return record;
  }

  async listForTournament(tournamentId: string): Promise<AuditEntry[]> {
    const rows = this.database
      .prepare('SELECT * FROM AuditEvent WHERE tournamentId = ? ORDER BY createdAt DESC')
      .all(tournamentId) as Array<{
      id: string;
      guildId?: string | null;
      tournamentId?: string | null;
      actorUserId?: string | null;
      eventType: string;
      payload: string;
      createdAt: string;
    }>;

    return rows.map((row) => {
      const tournamentId = row.tournamentId ?? undefined;
      const actorUserId = row.actorUserId ?? undefined;
      const auditEntry: AuditEntry = {
        id: row.id,
        guildId: row.guildId ?? '',
        action: row.eventType,
        payload: parseJson<Record<string, unknown>>(row.payload) ?? {},
        createdAt: new Date(row.createdAt),
        ...(tournamentId === undefined ? {} : { tournamentId }),
        ...(actorUserId === undefined ? {} : { actorUserId }),
      };
      return auditEntry;
    });
  }
}

export class SqliteOutboxRepository implements OutboxPort {
  constructor(private readonly database: SqliteDatabase) {}

  async enqueue(
    eventType: string,
    payload: Record<string, unknown>,
    guildId: string,
    tournamentId?: string,
  ): Promise<void> {
    const serializedPayload = JSON.stringify(payload);
    const existing = this.database
      .prepare('SELECT id FROM OutboxEvent WHERE aggregateType = ? AND aggregateId = ? AND eventType = ? AND payload = ? LIMIT 1')
      .get('guild', guildId, eventType, serializedPayload) as { id: string } | undefined;
    if (existing !== undefined) return;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.database
      .prepare(
        'INSERT INTO OutboxEvent (id, aggregateType, aggregateId, eventType, payload, createdAt, processedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        id,
        'guild',
        guildId,
        eventType,
        serializedPayload,
        toIsoDate(new Date()),
        null,
      );

    if (tournamentId !== undefined) {
      this.database
        .prepare(
          'INSERT INTO OutboxEvent (id, aggregateType, aggregateId, eventType, payload, createdAt, processedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          `${id}-tournament`,
          'tournament',
          tournamentId,
          eventType,
          serializedPayload,
          toIsoDate(new Date()),
          null,
        );
    }
  }

  async drain(): Promise<void> {
    this.database
      .prepare('UPDATE OutboxEvent SET processedAt = ? WHERE processedAt IS NULL')
      .run(toIsoDate(new Date()));
  }

  async listPending(): Promise<PersistedOutboxEvent[]> {
    const rows = this.database
      .prepare('SELECT * FROM OutboxEvent WHERE processedAt IS NULL ORDER BY createdAt DESC')
      .all() as Array<{
      id: string;
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: string;
      processedAt: string | null;
      createdAt: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      payload: parseJson<Record<string, unknown>>(row.payload) ?? {},
      processedAt: row.processedAt === null ? null : new Date(row.processedAt),
      createdAt: new Date(row.createdAt),
    }));
  }

  async markProcessed(id: string): Promise<void> {
    this.database
      .prepare('UPDATE OutboxEvent SET processedAt = ? WHERE id = ?')
      .run(toIsoDate(new Date()), id);
  }
}

export class SqliteDraftRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async save(draft: TournamentDraft, expectedVersion?: number): Promise<TournamentDraft> {
    const existing = this.database
      .prepare('SELECT version, expiresAt FROM Draft WHERE id = ?')
      .get(draft.id) as { version: number; expiresAt: string } | undefined;
    if (existing !== undefined && expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new Error('Draft version conflict.');
    }
    if (existing !== undefined && new Date(existing.expiresAt) <= new Date()) {
      throw new Error('Draft has expired.');
    }
    const version = existing === undefined ? (draft.version ?? 1) : existing.version + 1;
    const persistedDraft = { ...draft, version };
    this.database
      .prepare(`
      INSERT INTO Draft (
        id, guildId, organizerId, data, expiresAt, createdAt, updatedAt, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        guildId = excluded.guildId,
        organizerId = excluded.organizerId,
        data = excluded.data,
        expiresAt = excluded.expiresAt,
        updatedAt = excluded.updatedAt,
        version = excluded.version
    `)
      .run(
        draft.id,
        draft.guildId,
        draft.organizerUserId,
        JSON.stringify(persistedDraft),
        toIsoDate(persistedDraft.expiresAt),
        toIsoDate(new Date()),
        toIsoDate(new Date()),
        version,
      );

    return persistedDraft;
  }

  async findById(id: string): Promise<TournamentDraft | null> {
    const row = this.database.prepare('SELECT * FROM Draft WHERE id = ?').get(id) as
      | {
          id: string;
          guildId: string;
          organizerId: string;
          data: string;
          expiresAt: string;
          createdAt: string;
          updatedAt: string;
          version: number;
        }
      | undefined;

    if (row === undefined) {
      return null;
    }

    if (new Date(row.expiresAt) <= new Date()) return null;
    return parseJson<TournamentDraft>(row.data) ?? null;
  }
}

export class SqliteMatchRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async save(entity: Partial<PersistedMatch> & { id: string }): Promise<PersistedMatch> {
    this.database
      .prepare(`
        INSERT INTO MatchRecord (
          id, tournamentId, roundId, homeTeamApplicationId, awayTeamApplicationId,
          status, scheduledFor, threadId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          tournamentId = excluded.tournamentId,
          roundId = excluded.roundId,
          homeTeamApplicationId = excluded.homeTeamApplicationId,
          awayTeamApplicationId = excluded.awayTeamApplicationId,
          status = excluded.status,
          scheduledFor = excluded.scheduledFor,
          threadId = excluded.threadId,
          updatedAt = excluded.updatedAt
      `)
      .run(
        entity.id,
        entity.tournamentId ?? '',
        entity.roundId ?? '',
        entity.homeTeamApplicationId ?? null,
        entity.awayTeamApplicationId ?? null,
        entity.status ?? 'SCHEDULED',
        entity.scheduledFor === undefined ? null : toIsoDate(entity.scheduledFor),
        entity.threadId ?? null,
        toIsoDate(new Date()),
        toIsoDate(new Date()),
      );

    return {
      id: entity.id,
      tournamentId: entity.tournamentId ?? '',
      roundId: entity.roundId ?? '',
      homeTeamApplicationId: entity.homeTeamApplicationId ?? null,
      awayTeamApplicationId: entity.awayTeamApplicationId ?? null,
      status: entity.status ?? 'SCHEDULED',
      scheduledFor: entity.scheduledFor ?? null,
      threadId: entity.threadId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export class SqliteResultRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async save(entity: {
    id: string;
    matchId: string;
    teamApplicationId: string;
    stars: number;
    destructionPercent?: number | null;
    attackMinutes?: number | null;
    submittedByUserId: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Promise<unknown> {
    this.database
      .prepare(`
        INSERT INTO ResultSubmission (
          id, matchId, teamApplicationId, stars, destructionPercent, attackMinutes,
          submittedByUserId, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          matchId = excluded.matchId,
          teamApplicationId = excluded.teamApplicationId,
          stars = excluded.stars,
          destructionPercent = excluded.destructionPercent,
          attackMinutes = excluded.attackMinutes,
          submittedByUserId = excluded.submittedByUserId,
          status = excluded.status,
          updatedAt = excluded.updatedAt
      `)
      .run(
        entity.id,
        entity.matchId,
        entity.teamApplicationId,
        entity.stars,
        entity.destructionPercent ?? null,
        entity.attackMinutes ?? null,
        entity.submittedByUserId,
        entity.status,
        toIsoDate(entity.createdAt ?? new Date()),
        toIsoDate(entity.updatedAt ?? new Date()),
      );

    return entity;
  }
}
