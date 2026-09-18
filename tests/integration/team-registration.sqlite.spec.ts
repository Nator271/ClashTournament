import { mkdtempSync } from 'node:fs';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openDatabase } from '../../src/infrastructure/persistence/database.js';
import { runMigrations } from '../../src/infrastructure/persistence/migrator.js';
import { SqliteDecisionRepository } from '../../src/infrastructure/persistence/repositories/index.js';
import { SqliteTeamApplicationRepository } from '../../src/infrastructure/persistence/repositories/team-application-repository.js';
import { TeamApplication } from '../../src/domain/team/team-application.js';

describe('team registration SQLite constraints', () => {
  it('enforces foreign keys, normalized duplicate tags and append-only decisions', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'clash-team-registration-'));
    const database = openDatabase(join(directory, 'registration.sqlite'));
    try {
      runMigrations(database, join(process.cwd(), 'migrations'));
      const now = new Date().toISOString();
      database.prepare('INSERT INTO Tournament (id, guildId, organizerId, title, format, playersPerTeam, registrationStartsAt, registrationEndsAt, roundDurationMinutes, status, createdAt, updatedAt, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('tournament-1', 'guild-1', 'organizer-1', 'Tournament', 'SINGLE_ELIMINATION', 1, now, now, 60, 'REGISTRATION_OPEN', now, now, 1);
      database.prepare('INSERT INTO TeamApplication (id, tournamentId, name, createdByUserId, status, createdAt, updatedAt, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('application-1', 'tournament-1', 'Team', 'manager-1', 'PENDING', now, now, 1);
      database.prepare('INSERT INTO VerifiedPlayer (id, teamApplicationId, tournamentId, tag, displayName, townHallLevel, verifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run('player-1', 'application-1', 'tournament-1', '#ABC123', 'Player', 12, now);
      expect(() => database.prepare('INSERT INTO VerifiedPlayer (id, teamApplicationId, tournamentId, tag, displayName, townHallLevel, verifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run('player-2', 'application-1', 'tournament-1', '#ABC123', 'Other', 12, now)).toThrow();
      expect(() => database.prepare('INSERT INTO TeamApplication (id, tournamentId, name, createdByUserId, status, createdAt, updatedAt, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('orphan', 'missing-tournament', 'Orphan', 'user', 'DRAFT', now, now, 1)).toThrow();
      const application = TeamApplication.create({ id: 'application-1', tournamentId: 'tournament-1', guildId: 'guild-1', name: 'Team', managerIds: ['manager-1'], playersPerTeam: 1 });
      application.addVerifiedPlayer({ tag: '#ABC123', displayName: 'Player', townHallLevel: 12 });
      application.submit();
      application.accept();
      const applicationRepository = new SqliteTeamApplicationRepository(database);
      await applicationRepository.save(application);
      application.players.push({ tag: '#DEF456', displayName: 'Other', townHallLevel: 12 });
      await expect(applicationRepository.save(application)).rejects.toThrow(/immutable/i);
      const decisions = new SqliteDecisionRepository(database);
      await decisions.save({ id: 'decision-1', tournamentId: 'tournament-1', targetType: 'application', targetId: 'application-1', actorUserId: 'staff-1', decision: 'ACCEPT', reason: 'Complete', createdAt: new Date() });
      expect((await decisions.listForTournament('tournament-1'))).toHaveLength(1);
    } finally {
      if (database.open) database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
