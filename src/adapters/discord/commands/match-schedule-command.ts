import type { InteractionHandler } from '../interaction-router.js';

export type MatchScheduleCommandDependencies = {
  readonly schedule: (matchId: string, interaction: unknown) => Promise<void>;
  readonly confirm?: (matchId: string, interaction: unknown) => Promise<void>;
};

export function createMatchScheduleCommandHandlers(dependencies: MatchScheduleCommandDependencies): { readonly schedule: InteractionHandler; readonly confirm: InteractionHandler } {
  return {
    schedule: async (interaction, parsed) => { await dependencies.schedule(parsed.resourceId ?? '', interaction); },
    confirm: async (interaction, parsed) => { if (dependencies.confirm !== undefined) await dependencies.confirm(parsed.resourceId ?? '', interaction); },
  };
}
