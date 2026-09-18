import { describe, expect, it } from 'vitest';

import { DeadlineScheduler } from '../../src/infrastructure/scheduling/deadline-scheduler.js';
import { MatchSpaceService } from '../../src/adapters/discord/match-space-adapter.js';

describe('bracket and scheduling integration', () => {
  it('recovers a pending deadline after scheduler restart', async () => {
    const scheduler = new DeadlineScheduler();
    await scheduler.registerDeadline({ id: 'round-1', kind: 'round', dueAt: new Date(Date.now() + 60_000), guildId: 'guild-1' });
    const recovered = await scheduler.recoverPendingDeadlines();
    expect(recovered.map((deadline) => deadline.id)).toContain('round-1');
  });

  it('creates a match space idempotently and exposes permission fallback', async () => {
    let calls = 0;
    const service = new MatchSpaceService({
      createMatchSpace: async () => { calls += 1; return { threadId: 'thread-1' }; },
      sendStatusNotice: async () => undefined,
    });
    expect(await service.ensureMatchSpace({ guildId: 'guild-1', channelId: 'channel-1' }, 'match-1')).toBe('thread-1');
    expect(await service.ensureMatchSpace({ guildId: 'guild-1', channelId: 'channel-1' }, 'match-1')).toBe('thread-1');
    expect(calls).toBe(1);
    await service.notifyPermissionFailure({ guildId: 'guild-1' }, 'match-1');
  });
});
