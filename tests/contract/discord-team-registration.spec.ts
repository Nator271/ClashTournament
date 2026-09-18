import { describe, expect, it, vi } from 'vitest';

import { InteractionRouter } from '../../src/adapters/discord/interaction-router.js';
import { createTeamCommandHandlers } from '../../src/adapters/discord/commands/team-commands.js';
import { createStaffApplicationCommandHandlers } from '../../src/adapters/discord/commands/staff-application-commands.js';
import { createTeamComponents } from '../../src/adapters/discord/components/team-components.js';
import { presentTeamApplication, teamStatusNotification } from '../../src/adapters/discord/presenters/team-presenter.js';
import { TeamApplication } from '../../src/domain/team/team-application.js';

describe('US2 Discord team registration contract', () => {
  it('uses versioned team and staff actions', () => {
    expect(createTeamComponents('application-1').addPlayer.customId).toBe('v1:team:add-player:application-1');
    expect(createTeamComponents('application-1').submit.customId).toBe('v1:team:submit:application-1');
    expect(createStaffApplicationCommandHandlers({}).acceptAction).toBe('v1:staff:accept-application');
  });

  it('defers add-player and keeps staff actions behind their handler dependency', async () => {
    const interaction = {
      isMessageComponent: () => true,
      isModalSubmit: () => false,
      customId: 'v1:team:add-player:application-1',
      replied: false,
      deferred: false,
      deferReply: vi.fn(async () => { interaction.deferred = true; }),
    };
    const calls: string[] = [];
    const router = new InteractionRouter();
    router.register('team', 'add-player', createTeamCommandHandlers({ addPlayer: async () => { calls.push('add'); } }).addPlayer);
    await router.route(interaction as never);
    expect(interaction.deferReply).toHaveBeenCalled();
    expect(calls).toEqual(['add']);
  });

  it('presents only verified player snapshots and actionable correction status', () => {
    const application = TeamApplication.create({ id: 'application-1', tournamentId: 'tournament-1', guildId: 'guild-1', name: 'Team', managerIds: ['manager-1'], playersPerTeam: 1 });
    application.addVerifiedPlayer({ tag: '#ABC123', displayName: 'Player', townHallLevel: 12 });
    application.submit();
    application.requestChanges();
    const presentation = presentTeamApplication(application);
    expect(presentation.players).toEqual([{ tag: '#ABC123', name: 'Player', townHallLevel: 12 }]);
    expect(teamStatusNotification(application)).toMatch(/changes/i);
  });
});
