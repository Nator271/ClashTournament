import type { RankingEntry } from '../../../application/use-cases/complete-tournament.js';

export type FinalTournamentInput = {
  readonly name: string;
  readonly status: string;
  readonly winnerTeamId?: string;
  readonly ranking: readonly RankingEntry[];
  readonly rounds: readonly { readonly number: number; readonly summary: string }[];
};

export function presentFinalTournament(input: FinalTournamentInput): { readonly title: string; readonly description: string; readonly readOnly: boolean } {
  const ranking = input.ranking.map((entry) => `${entry.position}. ${entry.teamId}`).join('\n');
  const rounds = input.rounds.map((round) => `Round ${round.number}: ${round.summary}`).join('\n');
  return { title: input.name, description: `Winner: ${input.winnerTeamId ?? 'undetermined'}\nStatus: ${input.status}\nRanking:\n${ranking}\n${rounds}\nThis summary is read-only.`, readOnly: true };
}
