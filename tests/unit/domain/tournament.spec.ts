import { describe, expect, it } from 'vitest';

import {
  SingleEliminationFormatStrategy,
  Tournament,
  TournamentFormat,
  TournamentStatus,
} from '../../../src/domain/tournament/tournament.js';
import { advanceTournamentAt } from '../../../src/domain/tournament/tournament.js';

describe('Tournament domain', () => {
  it('creates a valid draft tournament with the single-elimination format', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    const tournament = Tournament.create({
      id: 'tournament-1',
      guildId: 'guild-1',
      name: 'Winter Clash',
      organizerUserId: 'organizer-1',
      playersPerTeam: 5,
      registrationStartsAt: new Date('2026-01-02T00:00:00Z'),
      registrationEndsAt: new Date('2026-01-08T00:00:00Z'),
      roundDurationMinutes: 120,
      format: TournamentFormat.SINGLE_ELIMINATION,
      createdAt: now,
      strategy: new SingleEliminationFormatStrategy(),
    });

    expect(tournament.status).toBe(TournamentStatus.DRAFT);
    expect(tournament.formattedFormat).toBe('single_elimination');
    expect(tournament.canAcceptApplications(now)).toBe(false);
  });

  it('rejects invalid players per team and invalid format boundaries', () => {
    expect(() =>
      Tournament.create({
        id: 'tournament-2',
        guildId: 'guild-1',
        name: 'Broken',
        organizerUserId: 'organizer-1',
        playersPerTeam: 0,
        registrationStartsAt: new Date('2026-01-02T00:00:00Z'),
        registrationEndsAt: new Date('2026-01-08T00:00:00Z'),
        roundDurationMinutes: 120,
        format: TournamentFormat.SINGLE_ELIMINATION,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        strategy: new SingleEliminationFormatStrategy(),
      }),
    ).toThrow(/playersPerTeam/i);

    expect(() =>
      Tournament.create({
        id: 'tournament-3',
        guildId: 'guild-1',
        name: 'Broken',
        organizerUserId: 'organizer-1',
        playersPerTeam: 5,
        registrationStartsAt: new Date('2026-01-08T00:00:00Z'),
        registrationEndsAt: new Date('2026-01-02T00:00:00Z'),
        roundDurationMinutes: 120,
        format: TournamentFormat.SINGLE_ELIMINATION,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        strategy: new SingleEliminationFormatStrategy(),
      }),
    ).toThrow(/registration/);

    expect(() =>
      Tournament.create({
        id: 'tournament-4',
        guildId: 'guild-1',
        name: 'Broken',
        organizerUserId: 'organizer-1',
        playersPerTeam: 11,
        registrationStartsAt: new Date('2026-01-02T00:00:00Z'),
        registrationEndsAt: new Date('2026-01-08T00:00:00Z'),
        roundDurationMinutes: 120,
        format: TournamentFormat.SINGLE_ELIMINATION,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        strategy: new SingleEliminationFormatStrategy(),
      }),
    ).toThrow(/playersPerTeam/i);
  });

  it('supports a format strategy contract while keeping single elimination as the v1 default', () => {
    const strategy = new SingleEliminationFormatStrategy();

    expect(strategy.name).toBe('single_elimination');
    expect(strategy.isSupported(TournamentFormat.SINGLE_ELIMINATION)).toBe(true);
    expect(strategy.isSupported('custom_format' as TournamentFormat)).toBe(false);
  });

  it('opens and closes registration only through valid status transitions', () => {
    const tournament = Tournament.create({
      id: 'tournament-5',
      guildId: 'guild-1',
      name: 'Winter Clash',
      organizerUserId: 'organizer-1',
      playersPerTeam: 5,
      registrationStartsAt: new Date('2026-01-02T00:00:00Z'),
      registrationEndsAt: new Date('2026-01-08T00:00:00Z'),
      roundDurationMinutes: 120,
      format: TournamentFormat.SINGLE_ELIMINATION,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      strategy: new SingleEliminationFormatStrategy(),
    });

    expect(() => tournament.openRegistration(new Date('2026-01-01T23:59:59Z'))).toThrow();
    const open = tournament.openRegistration(new Date('2026-01-02T00:00:00Z'));
    expect(open.status).toBe(TournamentStatus.REGISTRATION_OPEN);
    expect(advanceTournamentAt(tournament, new Date('2026-01-02T00:00:00Z')).status).toBe(
      TournamentStatus.REGISTRATION_OPEN,
    );
    expect(open.canAcceptApplications(new Date('2026-01-04T00:00:00Z'))).toBe(true);
    const closed = open.closeRegistration(new Date('2026-01-08T00:00:00Z'));
    expect(closed.status).toBe(TournamentStatus.REGISTRATION_CLOSED);
    expect(() => closed.closeRegistration(new Date('2026-01-08T00:00:01Z'))).toThrow();
  });
});
