export type DiscordEmbedPayload = {
  readonly title: string;
  readonly description?: string;
  readonly color?: number;
};

export type DiscordMessageTarget = {
  readonly guildId: string;
  readonly channelId?: string;
  readonly threadId?: string;
};

export type DiscordEffectResult = {
  readonly messageId?: string;
  readonly threadId?: string;
};

export type DiscordEffectsPort = {
  publishTournamentAnnouncement(target: DiscordMessageTarget, payload: DiscordEmbedPayload): Promise<DiscordEffectResult>;
  createMatchSpace(target: DiscordMessageTarget, title: string): Promise<DiscordEffectResult>;
  sendStatusNotice(target: DiscordMessageTarget, message: string): Promise<void>;
};
