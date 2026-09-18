import { isReadOnlyTournamentStatus } from '../../../domain/tournament/tournament.js';

/** Maximum length of a Discord embed description. */
export const DISCORD_EMBED_DESCRIPTION_LIMIT = 4000;
/** Maximum length of a Discord message content. */
export const DISCORD_MESSAGE_CONTENT_LIMIT = 2000;

export type RecapRankingEntry = {
  readonly position: number;
  readonly teamId: string;
  readonly isWinner?: boolean;
};

export type RecapRoundMatch = {
  readonly matchId: string;
  readonly teamAId: string;
  readonly teamBId: string | null;
  readonly winnerTeamId: string | null;
  readonly status: string;
};

export type RecapRound = {
  readonly number: number;
  readonly matches: readonly RecapRoundMatch[];
};

export type TournamentRecapInput = {
  readonly name: string;
  readonly status: string;
  readonly format?: string;
  readonly winnerTeamId?: string;
  readonly ranking: readonly RecapRankingEntry[];
  readonly isRankingAvailable: boolean;
  readonly rounds: readonly RecapRound[];
  readonly teamNames?: Readonly<Record<string, string>>;
};

export type FinalTournamentPresentation = {
  readonly title: string;
  readonly description: string;
  readonly color: number;
  readonly readOnly: boolean;
};

export type TournamentStatusPresentation = {
  readonly content: string;
  readonly ephemeral: true;
};

/**
 * Renders the public end-of-tournament announcement: winner, final ranking when it is available,
 * round results and the closed/read-only status of the event (FR-023).
 */
export function presentFinalTournament(input: TournamentRecapInput): FinalTournamentPresentation {
  const readOnly = isReadOnlyTournamentStatus(input.status);
  return {
    title: `${input.name} — final results`,
    description: truncate(buildRecapBody(input, readOnly), DISCORD_EMBED_DESCRIPTION_LIMIT),
    color: 0x27ae60,
    readOnly,
  };
}

/**
 * Renders the ephemeral `/tournament status` recap. The recap stays consultable for the whole
 * lifetime of the tournament and never requires a new registration (FR-027).
 */
export function presentTournamentStatus(input: TournamentRecapInput): TournamentStatusPresentation {
  const readOnly = isReadOnlyTournamentStatus(input.status);
  return {
    content: truncate(buildRecapBody(input, readOnly), DISCORD_MESSAGE_CONTENT_LIMIT),
    ephemeral: true,
  };
}

function buildRecapBody(input: TournamentRecapInput, readOnly: boolean): string {
  const winner = input.winnerTeamId === undefined ? undefined : teamLabel(input, input.winnerTeamId);
  const sections = [
    `${input.name} — status: ${input.status}`,
    winner === undefined ? 'Winner: undetermined' : `Winner: ${winner}`,
    rankingSection(input),
    roundSection(input),
    readOnly
      ? 'Registrations are closed and this recap is read-only. No further change is accepted.'
      : 'This recap is read-only and updates as the tournament progresses.',
  ];
  if (input.format !== undefined) sections.splice(1, 0, `Format: ${input.format}`);
  return sections.join('\n');
}

function rankingSection(input: TournamentRecapInput): string {
  if (!input.isRankingAvailable || input.ranking.length === 0) {
    return 'Final ranking: not available yet.';
  }
  const lines = input.ranking.map((entry) => `${entry.position}. ${teamLabel(input, entry.teamId)}`);
  return ['Final ranking:', ...lines].join('\n');
}

function roundSection(input: TournamentRecapInput): string {
  if (input.rounds.length === 0) return 'Round results: no match has been played yet.';
  const lines = input.rounds.map(
    (round) => `Round ${round.number}: ${round.matches.map((match) => matchLine(input, match)).join(' | ')}`,
  );
  return ['Round results:', ...lines].join('\n');
}

function matchLine(input: TournamentRecapInput, match: RecapRoundMatch): string {
  const teamA = teamLabel(input, match.teamAId);
  if (match.teamBId === null) return `${teamA} — bye`;
  const teamB = teamLabel(input, match.teamBId);
  if (match.winnerTeamId === null) return `${teamA} vs ${teamB} — ${match.status.toLowerCase()}`;
  const winner = teamLabel(input, match.winnerTeamId);
  const loser = match.winnerTeamId === match.teamAId ? teamB : teamA;
  return `${winner} beat ${loser}`;
}

function teamLabel(input: TournamentRecapInput, teamId: string): string {
  return input.teamNames?.[teamId] ?? teamId;
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const head = value.slice(0, limit - 1);
  const lastBreak = head.lastIndexOf('\n');
  return `${lastBreak > 0 ? head.slice(0, lastBreak) : head}…`;
}
