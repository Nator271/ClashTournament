import type { RoundSummary, StandingEntry, StandingMatch } from '../../domain/tournament/standings.js';

/** Minimal tournament projection required to complete a tournament or render its summary. */
export type TournamentCompletionRecord = {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly status: string;
  readonly format: string;
};

export type TournamentCompletionStore = {
  findById(id: string): Promise<TournamentCompletionRecord | null>;
  save(tournament: TournamentCompletionRecord): Promise<TournamentCompletionRecord>;
};

/** Read access to the persisted bracket needed to compute final standings. */
export type TournamentBracketSource = {
  listMatches(tournamentId: string): Promise<readonly StandingMatch[]>;
  /** Optional lookup used to render human-readable team names in the final recap. */
  listTeamNames?(tournamentId: string): Promise<readonly { readonly id: string; readonly name: string }[]>;
};

/** Consultable tournament recap exposed to the status query and the final announcement. */
export type TournamentSummary = {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly format: string;
  readonly winnerTeamId?: string;
  readonly ranking: readonly StandingEntry[];
  readonly isRankingAvailable: boolean;
  readonly rounds: readonly RoundSummary[];
  /** Human-readable team names, when the bracket source can provide them. */
  readonly teamNames?: Readonly<Record<string, string>>;
  readonly isReadOnly: boolean;
};
