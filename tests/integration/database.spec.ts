import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../../src/infrastructure/persistence/database.js';
import { runMigrations } from '../../src/infrastructure/persistence/migrator.js';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('SQLite persistence setup', () => {
  it('runs migrations and enforces player uniqueness within a tournament', () => {
    const directory = mkdtempSync(join(tmpdir(), 'clash-tournament-'));
    temporaryDirectories.push(directory);
    const database = openDatabase(join(directory, 'test.sqlite'));

    runMigrations(database, join(process.cwd(), 'migrations'));
    database.prepare(
      `INSERT INTO Tournament (
        id, guildId, organizerId, title, format, playersPerTeam,
        registrationStartsAt, registrationEndsAt, roundDurationMinutes,
        optionalMessage, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'tournament-1',
      'guild-1',
      'organizer-1',
      'Winter Clash',
      'SINGLE_ELIMINATION',
      1,
      '2026-01-01T00:00:00Z',
      '2026-01-02T00:00:00Z',
      60,
      null,
      'REGISTRATION_OPEN',
      '2026-01-01T00:00:00Z',
      '2026-01-01T00:00:00Z',
    );

    database.prepare(
      `INSERT INTO TeamApplication (
        id, tournamentId, name, createdByUserId, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'application-1',
      'tournament-1',
      'Team One',
      'manager-1',
      'ACCEPTED',
      '2026-01-01T00:00:00Z',
      '2026-01-01T00:00:00Z',
    );

    database.prepare(
      `INSERT INTO VerifiedPlayer (
        id, teamApplicationId, tournamentId, tag, displayName, townHallLevel, verifiedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'player-1',
      'application-1',
      'tournament-1',
      '#ABC123',
      'Player One',
      15,
      '2026-01-01T00:00:00Z',
    );

    expect(() =>
      database.prepare(
        `INSERT INTO VerifiedPlayer (
          id, teamApplicationId, tournamentId, tag, displayName, townHallLevel, verifiedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        'player-2',
        'application-1',
        'tournament-1',
        '#ABC123',
        'Duplicate Player',
        15,
        '2026-01-01T00:00:00Z',
      ),
    ).toThrow();

    database.close();
  });
});