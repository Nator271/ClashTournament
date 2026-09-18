import type { Interaction } from 'discord.js';

export type ParsedCustomId = {
  readonly version: string;
  readonly namespace: string;
  readonly action: string;
  readonly resourceId?: string;
};

export function parseCustomId(customId: string): ParsedCustomId | null {
  const [version, namespace, action, resourceId] = customId.split(':');
  if (version === undefined || namespace === undefined || action === undefined) return null;
  if (!/^v\d+$/.test(version)) return null;
  return {
    version,
    namespace,
    action,
    ...(resourceId === undefined ? {} : { resourceId }),
  };
}

export type InteractionHandler = (interaction: Interaction, parsed: ParsedCustomId) => Promise<void>;

export class InteractionRouter {
  private readonly handlers = new Map<string, InteractionHandler>();

  register(namespace: string, action: string, handler: InteractionHandler): void {
    this.handlers.set(`${namespace}:${action}`, handler);
  }

  async route(interaction: Interaction): Promise<void> {
    if (!interaction.isMessageComponent() && !interaction.isModalSubmit()) return;
    const parsed = parseCustomId(interaction.customId);
    if (parsed === null) return;
    const handler = this.handlers.get(`${parsed.namespace}:${parsed.action}`);
    if (handler === undefined) return;
    if (!interaction.replied && !interaction.deferred) await interaction.deferReply({ ephemeral: true });
    await handler(interaction, parsed);
  }
}