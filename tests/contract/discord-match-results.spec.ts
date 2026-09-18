import { describe, expect, it, vi } from 'vitest';

import { InteractionRouter } from '../../src/adapters/discord/interaction-router.js';
import { createMatchResultCommandHandlers } from '../../src/adapters/discord/commands/match-result-command.js';
import { createStaffResultCommandHandlers } from '../../src/adapters/discord/commands/staff-result-command.js';
import { presentResultNotification } from '../../src/adapters/discord/presenters/result-presenter.js';

describe('US4 Discord match results contract', () => {
  it('uses progressive result actions and staff-only resolution actions', async () => {
    const interaction = { isMessageComponent: () => true, isModalSubmit: () => false, customId: 'v1:match:result:match-1', replied: false, deferred: false, deferReply: vi.fn(async () => { interaction.deferred = true; }) };
    const calls: string[] = [];
    const router = new InteractionRouter();
    const handlers = createMatchResultCommandHandlers({ submit: async (matchId) => { calls.push(matchId); } });
    router.register('match', 'result', handlers.submit);
    await router.route(interaction as never);
    expect(calls).toEqual(['match-1']);
    expect(createStaffResultCommandHandlers({}).resolveAction).toBe('v1:staff:resolve-result');
  });

  it('renders safe result and contest messages with audit references', () => {
    expect(presentResultNotification('submitted', 'audit-1')).toMatch(/audit-1/);
    expect(presentResultNotification('contested', 'audit-2')).toMatch(/staff/i);
  });
});