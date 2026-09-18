import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DiscordOutboxWorker } from '../../src/adapters/discord/outbox-worker.js';
import { CompleteTournament } from '../../src/application/use-cases/complete-tournament.js';
import { TournamentFormat, TournamentStatus } from '../../src/domain/tournament/tournament.js';
import { openDatabase } from '../../src/infrastructure/persistence/database.js';
import { runMigrations } from '../../src/infrastructure/persistence/migrator.js';
import {
  SqliteAuditRepository,
  SqliteOutboxRepository,
} from '../../src/infrastructure/persistence/repositories/index.js';
import { SqliteTournamentStandingsRepository } from '../../src/infrastructure/persistence/repositories/tournament-standings-repository.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

type Database = ReturnType<typeof openDatabase>;

function createDatabase(): Database {
  const directory = mkdtempSync(join(tmpdir(), 'clash-tournament-completion-'));
  temporaryDirectories.push(directory);
  const database = openDatabase(join(directory, 'completion.sqlite'));
  runMigrations(database, join(process.cwd(), 'migrations'));
  return database;
}

/** Seeds a two-team, fully resolved single-elimination bracket through the real repositories. */
function seedResolvedBracket(database: Database, status = TournamentStatus.IN_PROGRESS): void {
  database
    .prepare(`
      INSERT INTO Tournament (
        id, guildId, organizerId, title, format, playersPerTeam,
        registrationStartsAt, registrationEndsAt, roundDurationMinutes,
        optionalMessage, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      'tournament-1', 'guild-1', 'organizer-1', 'Winter Clash', TournamentFormat.SINGLE_ELIMINATION, 1,
      '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z', 60, null, status,
      '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    );
  database
    .prepare('INSERT INTO TeamApplication (id, tournamentId, name, createdByUserId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('team-a', 'tournament-1', 'Alpha', 'manager-a', 'ACCEPTED', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
  database
    .prepare('INSERT INTO TeamApplication (id, tournamentId, name, createdByUserId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('team-b', 'tournament-1', 'Bravo', 'manager-b', 'ACCEPTED', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
  database
    .prepare('INSERT INTO Round (id, tournamentId, indexNumber, state, startsAt, endsAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('round-1', 'tournament-1', 1, 'RESOLVED', null, null, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
  database
    .prepare(`
      INSERT INTO MatchRecord (
        id, tournamentId, roundId, homeTeamApplicationId, awayTeamApplicationId,
        winnerTeamApplicationId, status, scheduledFor, threadId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      'match-1', 'tournament-1', 'round-1', 'team-a', 'team-b', 'team-a', 'RESOLVED', null, null,
      '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    );
}

function createCompletion(database: Database): CompleteTournament {
  const standings = new SqliteTournamentStandingsRepository(database);
  return new CompleteTournament({
    tournaments: standings,
    bracket: standings,
    outbox: new SqliteOutboxRepository(database),
    audit: new SqliteAuditRepository(database),
  });
}

describe('US5 tournament completion integration', () => {
  it('persists the completion and the final announcement in SQLite exactly once', async () => {
    const database = createDatabase();
    try {
      seedResolvedBracket(database);
      const completion = createCompletion(database);

      const result = await completion.execute({
        tournamentId: 'tournament-1',
        guildId: 'guild-1',
        actorUserId: 'staff-1',
      });

      expect(result.winnerTeamId).toBe('team-a');
      const tournamentRow = database
        .prepare('SELECT status FROM Tournament WHERE id = ?')
        .get('tournament-1') as { status: string };
      expect(tournamentRow.status).toBe(TournamentStatus.COMPLETED);

      const outboxRows = database
        .prepare("SELECT id, payload FROM OutboxEvent WHERE eventType = 'tournament.completed'")
        .all() as Array<{ id: string; payload: string }>;
      expect(outboxRows).toHaveLength(2);
      expect(JSON.parse(outboxRows[0]?.payload ?? '{}')).toMatchObject({
        tournamentId: 'tournament-1',
        winnerTeamId: 'team-a',
        teamNames: { 'team-a': 'Alpha', 'team-b': 'Bravo' },
      });

      const auditRows = database
        .prepare("SELECT eventType FROM AuditEvent WHERE eventType = 'tournament.completed'")
        .all() as Array<{ eventType: string }>;
      expect(auditRows).toHaveLength(1);

      await completion.execute({ tournamentId: 'tournament-1', guildId: 'guild-1', actorUserId: 'staff-1' });
      const afterSecondCall = database
        .prepare("SELECT COUNT(*) AS count FROM OutboxEvent WHERE eventType = 'tournament.completed'")
        .get() as { count: number };
      expect(afterSecondCall.count).toBe(2);
    } finally {
      database.close();
    }
  });

  it('recovers the pending final announcement after a restart without duplicating it', async () => {
    const database = createDatabase();
    try {
      seedResolvedBracket(database);
      await createCompletion(database).execute({
        tournamentId: 'tournament-1',
        guildId: 'guild-1',
        actorUserId: 'staff-1',
      });

      const publications: string[] = [];
      const effects = {
        publishTournamentAnnouncement: async (
          target: { guildId: string },
          payload: { title: string; description?: string },
        ) => {
          publications.push(`${target.guildId}:${payload.title}:${payload.description ?? ''}`);
          return { messageId: 'message-1' };
        },
        createMatchSpace: async () => ({}),
        sendStatusNotice: async () => undefined,
      };

      // Simulate a restart: a brand new worker over the same database drains the persisted outbox.
      const worker = new DiscordOutboxWorker(new SqliteOutboxRepository(database), effects);
      await worker.processPending();
      await worker.processPending();

      expect(publications).toHaveLength(1);
      expect(publications[0]).toContain('Winter Clash — final results');
      expect(publications[0]).toContain('Alpha');
      expect(publications[0]).toMatch(/read-only/i);

      const pending = await new SqliteOutboxRepository(database).listPending();
      expect(pending).toEqual([]);
    } finally {
      database.close();
    }
  });
});

