import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { initializeApplication } from '../../src/bootstrap/main.js';
import type { TournamentDraft } from '../../src/application/use-cases/create-tournament-draft.js';
import {
  TournamentFormat,
  TournamentStatus,
} from '../../src/domain/tournament/tournament.js';
import { openDatabase } from '../../src/infrastructure/persistence/database.js';
import { runMigrations } from '../../src/infrastructure/persistence/migrator.js';
import {
  SqliteDraftRepository,
  SqliteOutboxRepository,
} from '../../src/infrastructure/persistence/repositories/index.js';

describe('repository and bootstrap setup', () => {
  it('persists drafts and outbox records in SQLite', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'clash-tournament-repos-'));
    try {
      const database = openDatabase(join(directory, 'app.sqlite'));
      runMigrations(database, join(process.cwd(), 'migrations'));

      const draftRepository = new SqliteDraftRepository(database);
      const draft: TournamentDraft = {
        id: 'draft-123',
        guildId: 'guild-1',
        organizerUserId: 'user-1',
        tournament: {
          id: 'tournament-123',
          guildId: 'guild-1',
          name: 'Winter Clash',
          organizerUserId: 'user-1',
          playersPerTeam: 5,
          registrationStartsAt: new Date('2026-01-01T00:00:00.000Z'),
          registrationEndsAt: new Date('2026-01-08T00:00:00.000Z'),
          roundDurationMinutes: 60,
          format: TournamentFormat.SINGLE_ELIMINATION,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          strategy: { name: 'single_elimination', isSupported: () => true },
          status: TournamentStatus.DRAFT,
          formattedFormat: 'single_elimination',
          canAcceptApplications: () => true,
          openRegistration: () => ({}) as never,
          closeRegistration: () => ({}) as never,
          withStatus: () => ({}) as never,
        },
          expiresAt: new Date('2027-01-02T00:00:00.000Z'),
        confirmed: false,
      };

      await draftRepository.save(draft);
      const savedDraft = await draftRepository.findById('draft-123');
      expect(savedDraft?.id).toBe('draft-123');
      expect(savedDraft?.tournament.name).toBe('Winter Clash');
      expect(savedDraft?.version).toBe(1);
      await draftRepository.save({ ...draft, version: 1 }, 1);
      await expect(draftRepository.save({ ...draft, version: 1 }, 1)).rejects.toThrow(/version conflict/i);

      const outboxRepository = new SqliteOutboxRepository(database);
      await outboxRepository.enqueue('tournament.created', { tournamentId: 'tournament-123' }, 'guild-1', 'tournament-123');
      const pending = await outboxRepository.listPending();
      expect(pending[0]?.eventType).toBe('tournament.created');
      expect(pending[0]?.payload).toEqual({ tournamentId: 'tournament-123' });

      database.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('initializes application dependencies without connecting to Discord', async () => {
    const runtime = await initializeApplication({
      DISCORD_TOKEN: 'token-abc',
      DISCORD_CLIENT_ID: '123456789',
      CLASH_API_TOKEN: 'clash-token',
      DATABASE_PATH: join(tmpdir(), 'bootstrap-test.sqlite'),
    });

    try {
      expect(runtime.database).toBeDefined();
      expect(runtime.scheduler).toBeDefined();
      expect(runtime.outbox).toBeDefined();
      expect(runtime.config.DISCORD_TOKEN).toBe('token-abc');
    } finally {
      runtime.database.close();
      rmSync(runtime.config.DATABASE_PATH, { force: true });
    }
  });
});
