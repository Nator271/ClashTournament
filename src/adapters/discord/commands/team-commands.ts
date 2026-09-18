import type { InteractionHandler } from '../interaction-router.js';

export type TeamCommandDependencies = {
  readonly create?: (interaction: unknown) => Promise<void>;
  readonly edit?: (applicationId: string, interaction: unknown) => Promise<void>;
  readonly addPlayer: (applicationId: string, interaction: unknown) => Promise<void>;
  readonly submit?: (applicationId: string, interaction: unknown) => Promise<void>;
};

export function createTeamCommandHandlers(dependencies: TeamCommandDependencies): { readonly apply: InteractionHandler; readonly edit: InteractionHandler; readonly addPlayer: InteractionHandler; readonly submit: InteractionHandler } {
  return {
    apply: async (interaction) => { if (dependencies.create !== undefined) await dependencies.create(interaction); },
    edit: async (interaction, parsed) => { if (dependencies.edit !== undefined) await dependencies.edit(parsed.resourceId ?? '', interaction); },
    addPlayer: async (interaction, parsed) => { await dependencies.addPlayer(parsed.resourceId ?? '', interaction); },
    submit: async (interaction, parsed) => { if (dependencies.submit !== undefined) await dependencies.submit(parsed.resourceId ?? '', interaction); },
  };
}
