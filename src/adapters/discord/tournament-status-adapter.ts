import type { GetTournamentSummary } from '../../application/use-cases/get-tournament-summary.js';
import { presentTournamentError } from './presenters/tournament-presenter.js';
import { presentTournamentStatus, type TournamentStatusPresentation } from './presenters/final-tournament-presenter.js';

/**
 * Serves the `/tournament status` recap by joining the read-only summary use case with the Discord
 * presenter. The recap is always ephemeral, never requires a new registration and reports a safe
 * message instead of an internal error (FR-027).
 */
export class TournamentStatusService {
  constructor(private readonly summary: GetTournamentSummary) {}

  async describe(input: {
    readonly tournamentId?: string;
    readonly guildId?: string;
  }): Promise<TournamentStatusPresentation> {
    if (input.tournamentId === undefined || input.tournamentId.trim().length === 0) {
      return { content: 'A tournament id is required to display the recap.', ephemeral: true };
    }

    try {
      const recap = await this.summary.execute({
        tournamentId: input.tournamentId,
        ...(input.guildId === undefined ? {} : { guildId: input.guildId }),
      });
      return presentTournamentStatus(recap);
    } catch (error) {
      return { content: presentTournamentError(error).content, ephemeral: true };
    }
  }
}