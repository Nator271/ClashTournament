import type { DiscordEffectsPort, DiscordMessageTarget } from '../../application/ports/discord-effects.js';

export class MatchSpaceService {
  private readonly spaces = new Map<string, string>();

  constructor(private readonly effects: Pick<DiscordEffectsPort, 'createMatchSpace' | 'sendStatusNotice'>) {}

  async ensureMatchSpace(target: DiscordMessageTarget, matchId: string): Promise<string> {
    const existing = this.spaces.get(matchId);
    if (existing !== undefined) return existing;
    try {
      const result = await this.effects.createMatchSpace(target, `Match ${matchId}`);
      const threadId = result.threadId ?? result.messageId;
      if (threadId === undefined) throw new Error('Discord did not return a match space id.');
      this.spaces.set(matchId, threadId);
      return threadId;
    } catch (error) {
      await this.notifyPermissionFailure(target, matchId);
      throw error;
    }
  }

  async notifyPermissionFailure(target: DiscordMessageTarget, matchId: string): Promise<void> {
    await this.effects.sendStatusNotice(target, `Staff fallback: match ${matchId} remains accessible because its private space could not be created.`);
  }
}
