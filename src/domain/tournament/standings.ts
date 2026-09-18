import { TournamentFormat } from './tournament.js';

/**
 * A single-elimination bracket match projected for final standings.
 * `teamBId` is `null` for a bye and `winnerTeamId` stays `null` until the match is resolved.
 */
export type StandingMatch = {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly teamAId: string;
  readonly teamBId: string | null;
  readonly winnerTeamId: string | null;
  readonly status: string;
};

/** A resolved match as exposed in a tournament recap. */
export type MatchSummary = {
  readonly matchId: string;
  readonly teamAId: string;
  readonly teamBId: string | null;
  readonly winnerTeamId: string | null;
  readonly status: string;
};

export type RoundSummary = {
  readonly number: number;
  readonly matches: readonly MatchSummary[];
};

export type StandingEntry = {
  readonly teamId: string;
  readonly position: number;
  readonly isWinner: boolean;
  readonly eliminatedInRound?: number;
};

export type FinalStandings = {
  readonly winnerTeamId: string;
  readonly entries: readonly StandingEntry[];
  readonly finalRoundNumber: number;
};

const RESOLVED_MATCH_STATUSES: readonly string[] = ['RESOLVED', 'STAFF_DECIDED'];

/** Returns `true` when a match status counts as resolved for bracket progression. */
export function isMatchResolved(status: string): boolean {
  return RESOLVED_MATCH_STATUSES.includes(status);
}

/** Returns the loser of a resolved match, or `null` for a bye or a match without an identified winner. */
export function losingTeamId(match: StandingMatch): string | null {
  if (match.teamBId === null || match.winnerTeamId === null) return null;
  if (match.winnerTeamId === match.teamAId) return match.teamBId;
  if (match.winnerTeamId === match.teamBId) return match.teamAId;
  return null;
}

/**
 * Returns `true` when every real match is resolved with an identified winner and exactly one
 * team remains undefeated, which is the precondition for a final single-elimination ranking.
 */
export function isBracketResolved(matches: readonly StandingMatch[]): boolean {
  const realMatches = matches.filter((match) => match.teamBId !== null);
  if (realMatches.length === 0) return false;
  if (!realMatches.every((match) => isMatchResolved(match.status) && losingTeamId(match) !== null)) {
    return false;
  }

  const participants = new Set<string>();
  const eliminated = new Set<string>();
  for (const match of realMatches) {
    participants.add(match.teamAId);
    if (match.teamBId !== null) participants.add(match.teamBId);
    const loser = losingTeamId(match);
    if (loser !== null) eliminated.add(loser);
  }

  return [...participants].filter((teamId) => !eliminated.has(teamId)).length === 1;
}

/**
 * Builds the final single-elimination ranking: the final winner is first, the final loser second and
 * every team eliminated in the same round shares the same position, as published in the rules.
 */
export function buildSingleEliminationStandings(
  matches: readonly StandingMatch[],
  format: string = TournamentFormat.SINGLE_ELIMINATION,
): FinalStandings {
  if (format !== TournamentFormat.SINGLE_ELIMINATION) {
    throw new Error(`Final standings are not supported for the ${format} format.`);
  }
  if (!isBracketResolved(matches)) {
    throw new Error('The tournament bracket is not fully resolved.');
  }

  const finalRoundNumber = Math.max(...matches.map((match) => match.roundNumber));
  const finalMatches = matches.filter((match) => match.roundNumber === finalRoundNumber && match.teamBId !== null);
  if (finalMatches.length !== 1) {
    throw new Error('The final round must contain a single match.');
  }
  const finalMatch = finalMatches[0];
  if (finalMatch === undefined || finalMatch.winnerTeamId === null) {
    throw new Error('The final match has no winner.');
  }

  const eliminatedByRound = new Map<number, string[]>();
  for (const match of matches) {
    const loser = losingTeamId(match);
    if (loser === null) continue;
    const losers = eliminatedByRound.get(match.roundNumber) ?? [];
    losers.push(loser);
    eliminatedByRound.set(match.roundNumber, losers);
  }

  const entries: StandingEntry[] = [{ teamId: finalMatch.winnerTeamId, position: 1, isWinner: true }];
  let nextPosition = 2;
  const roundsDescending = [...eliminatedByRound.keys()].sort((first, second) => second - first);
  for (const roundNumber of roundsDescending) {
    const losers = [...(eliminatedByRound.get(roundNumber) ?? [])].sort();
    for (const teamId of losers) {
      entries.push({ teamId, position: nextPosition, isWinner: false, eliminatedInRound: roundNumber });
    }
    nextPosition += losers.length;
  }

  return { winnerTeamId: finalMatch.winnerTeamId, entries, finalRoundNumber };
}

/** Groups bracket matches per round in ascending order for a tournament recap. */
export function summarizeRounds(matches: readonly StandingMatch[]): RoundSummary[] {
  const ordered = [...matches].sort(
    (first, second) => first.roundNumber - second.roundNumber || first.matchId.localeCompare(second.matchId),
  );
  const byRound = new Map<number, MatchSummary[]>();
  for (const match of ordered) {
    const roundMatches = byRound.get(match.roundNumber) ?? [];
    roundMatches.push({
      matchId: match.matchId,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      winnerTeamId: match.winnerTeamId,
      status: match.status,
    });
    byRound.set(match.roundNumber, roundMatches);
  }

  return [...byRound.entries()]
    .sort((first, second) => first[0] - second[0])
    .map(([number, roundMatches]) => ({ number, matches: roundMatches }));
}

/**
 * Overrides the winner of the final match, for example after a staff result decision that is not
 * derived from submitted statistics.
 */
export function applyFinalWinner(matches: readonly StandingMatch[], winnerTeamId: string): StandingMatch[] {
  const finalRoundNumber = Math.max(...matches.map((match) => match.roundNumber));
  const finalMatches = matches.filter((match) => match.roundNumber === finalRoundNumber && match.teamBId !== null);
  const finalMatch = finalMatches[0];
  if (finalMatches.length !== 1 || finalMatch === undefined) {
    throw new Error('The final round must contain a single match.');
  }
  if (winnerTeamId !== finalMatch.teamAId && winnerTeamId !== finalMatch.teamBId) {
    throw new Error('The announced winner does not belong to the final match.');
  }

  return matches.map((match) => (match === finalMatch ? { ...match, winnerTeamId } : match));
}