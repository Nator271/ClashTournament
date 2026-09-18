import { CompleteTournament } from '../use-cases/complete-tournament.js';

export class TournamentLifecycle {
  constructor(private readonly completion: CompleteTournament) {}

  async onMatchResolved(input: { readonly tournamentId: string; readonly guildId: string; readonly actorUserId: string; readonly isFinalMatch: boolean }): Promise<void> {
    if (!input.isFinalMatch) return;
    await this.completion.execute(input);
  }
}
