import type { InteractionHandler } from '../interaction-router.js';

export type TournamentCloseCommandDependencies = {
  readonly close: (tournamentId: string, interaction: unknown) => Promise<void>;
};

export function createTournamentCloseCommandHandler(dependencies: TournamentCloseCommandDependencies): InteractionHandler {
  return async (interaction, parsed) => { await dependencies.close(parsed.resourceId ?? '', interaction); };
}
