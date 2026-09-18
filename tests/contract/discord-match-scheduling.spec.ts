import { describe, expect, it, vi } from 'vitest';

import { InteractionRouter } from '../../src/adapters/discord/interaction-router.js';
import { createMatchScheduleCommandHandlers } from '../../src/adapters/discord/commands/match-schedule-command.js';
import { presentMatchNotification } from '../../src/adapters/discord/match-notifications.js';

describe('US3 Discord match scheduling contract', () => {
  it('uses versioned scheduling actions and acknowledges quickly', async () => {
    const interaction = {
      isMessageComponent: () => true,
      isModalSubmit: () => false,
      customId: 'v1:match:schedule:match-1',
      replied: false,
      deferred: false,
      deferReply: vi.fn(async () => { interaction.deferred = true; }),
    };
    const calls: string[] = [];
    const router = new InteractionRouter();
    const handlers = createMatchScheduleCommandHandlers({ schedule: async (matchId) => { calls.push(matchId); } });
    router.register('match', 'schedule', handlers.schedule);
    await router.route(interaction as never);
    expect(calls).toEqual(['match-1']);
    expect(interaction.deferReply).toHaveBeenCalled();
  });

  it('renders deadline and fallback notices for match spaces', () => {
    expect(presentMatchNotification('deadline', 'match-1', new Date('2026-10-01T00:00:00Z'))).toMatch(/deadline/i);
    expect(presentMatchNotification('permission-failure', 'match-1')).toMatch(/staff/i);
  });
});
