import type { InteractionHandler } from '../interaction-router.js';

export type StaffResultCommandDependencies = { readonly resolve?: (matchId: string, interaction: unknown) => Promise<void> };

export function createStaffResultCommandHandlers(dependencies: StaffResultCommandDependencies): { readonly resolveAction: string; readonly resolve: InteractionHandler } {
  return { resolveAction: 'v1:staff:resolve-result', resolve: async (interaction, parsed) => { if (dependencies.resolve !== undefined) await dependencies.resolve(parsed.resourceId ?? '', interaction); } };
}