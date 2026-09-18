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
    application.addVerifiedPlayer({ tag: '#A', displayName: 'A', townHallLevel: 10 });
    application.addVerifiedPlayer({ tag: '#B', displayName: 'B', townHallLevel: 11 });
    expect(application.submit().status).toBe('PENDING');
  });
});