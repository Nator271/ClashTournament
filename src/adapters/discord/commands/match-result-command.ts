import type { InteractionHandler } from '../interaction-router.js';

export type MatchResultCommandDependencies = { readonly submit: (matchId: string, interaction: unknown) => Promise<void> };

export function createMatchResultCommandHandlers(dependencies: MatchResultCommandDependencies): { readonly submit: InteractionHandler } {
  return { submit: async (interaction, parsed) => { await dependencies.submit(parsed.resourceId ?? '', interaction); } };
}