import { describe, expect, it } from 'vitest';

import { TeamApplication } from '../../../src/domain/team/team-application.js';

describe('team application', () => {
  it('requires a manager and the exact configured player count', () => {
    const application = TeamApplication.create({
      id: 'application-1',
      tournamentId: 'tournament-1',
      guildId: 'guild-1',
      name: 'Team One',
      managerIds: ['manager-1'],
      playersPerTeam: 2,
    });

    expect(() => application.submit()).toThrow(/players/i);
    application.addVerifiedPlayer({ tag: '#ABC123', displayName: 'A', townHallLevel: 10 });
    application.addVerifiedPlayer({ tag: '#DEF456', displayName: 'B', townHallLevel: 11 });
    expect(application.submit().status).toBe('PENDING');
  });

  it('validates team size, player snapshots, edits and staff statuses', () => {
    expect(() =>
      TeamApplication.create({
        id: 'application-invalid',
        tournamentId: 'tournament-1',
        guildId: 'guild-1',
        name: 'Team',
        managerIds: ['manager-1'],
        playersPerTeam: 11,
      }),
    ).toThrow(/1 and 10/i);

    const application = TeamApplication.create({
      id: 'application-2',
      tournamentId: 'tournament-1',
      guildId: 'guild-1',
      name: 'Team Two',
      managerIds: ['manager-1'],
      playersPerTeam: 1,
      editableUntil: new Date('2027-01-10T00:00:00Z'),
    });
    application.addVerifiedPlayer({
      tag: '#abc123',
      displayName: 'Player',
      townHallLevel: 12,
      verifiedAt: new Date('2026-01-01T00:00:00Z'),
      source: 'clash-api',
    });
    expect(application.canEdit(new Date('2027-01-09T00:00:00Z'))).toBe(true);
    expect(application.canEdit(new Date('2027-01-11T00:00:00Z'))).toBe(false);
    application.submit();
    expect(() => application.addVerifiedPlayer({ tag: '#def456', displayName: 'Other', townHallLevel: 10 })).toThrow();
    application.requestChanges();
    expect(application.status).toBe('CHANGES_REQUESTED');
    application.accept();
    expect(application.status).toBe('ACCEPTED');
    expect(() => application.reject('late')).toThrow();
  });
});