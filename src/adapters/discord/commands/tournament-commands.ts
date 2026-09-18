import type { InteractionHandler } from '../interaction-router.js';
import { createTournamentCreationModal } from '../modals/tournament-creation-modal.js';

export type TournamentCommandDependencies = {
  readonly publish: (draftId: string, interaction: unknown) => Promise<void>;
  readonly create?: (interaction: unknown) => Promise<void>;
  readonly status?: (tournamentId: string | undefined, interaction: unknown) => Promise<void>;
};

export function createTournamentCommandHandlers(
  dependencies: TournamentCommandDependencies,
): { readonly publish: InteractionHandler; readonly create: InteractionHandler; readonly status: InteractionHandler } {
  return {
    publish: async (interaction, parsed) => {
      await dependencies.publish(parsed.resourceId ?? '', interaction);
    },
    create: async (interaction) => {
      if (dependencies.create !== undefined) {
        await dependencies.create(interaction);
      }
    },
    status: async (interaction, parsed) => {
      if (dependencies.status !== undefined) {
        await dependencies.status(parsed.resourceId, interaction);
      }
    },
  };
}

export function getTournamentCreationModal(step: 'rules' | 'schedule') {
  return createTournamentCreationModal(step);
}