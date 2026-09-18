import type { DiscordMessageTarget } from '../../application/ports/discord-effects.js';
import type { RecapRankingEntry, RecapRound, RecapRoundMatch, TournamentRecapInput } from './presenters/final-tournament-presenter.js';

/** Validated payload of the `tournament.completed` outbox event. */
export type FinalAnnouncement = TournamentRecapInput;

export type RegistrationAnnouncement = {
  readonly title: string;
  readonly description: string;
};

/**
 * Validates the persisted `tournament.completed` payload before it reaches Discord. Unknown or
 * malformed fields are dropped instead of being trusted, so a corrupted event can never leak
 * internal data into a public message (FR-025).
 */
export function parseFinalTournamentAnnouncement(payload: Record<string, unknown>): FinalAnnouncement | null {
  const name = asString(payload.name);
  if (name === null) return null;

  const winnerTeamId = asString(payload.winnerTeamId);
  const format = asString(payload.format);
  const ranking = asRanking(payload.ranking);
  const teamNames = asTeamNames(payload.teamNames);

  return {
    name,
    status: asString(payload.status) ?? 'COMPLETED',
    ranking,
    isRankingAvailable: ranking.length > 0,
    rounds: asRounds(payload.rounds),
    ...(format === null ? {} : { format }),
    ...(winnerTeamId === null ? {} : { winnerTeamId }),
    ...(Object.keys(teamNames).length === 0 ? {} : { teamNames }),
  };
}

/** Validates the persisted `tournament.registration.publish` payload. */
export function parseRegistrationAnnouncement(payload: Record<string, unknown>): RegistrationAnnouncement {
  return {
    title: asString(payload.name) ?? 'Tournament registration',
    description: asString(payload.description) ?? 'Registration is open.',
  };
}

/** Builds the Discord target of an outbox event, keeping the configured channel when present. */
export function parseMessageTarget(guildId: string, payload: Record<string, unknown>): DiscordMessageTarget {
  const channelId = asString(payload.channelId);
  return { guildId, ...(channelId === null ? {} : { channelId }) };
}

function asRanking(value: unknown): RecapRankingEntry[] {
  const entries: RecapRankingEntry[] = [];
  for (const candidate of asArray(value)) {
    const entry = asRecord(candidate);
    const teamId = asString(entry?.teamId);
    const position = asNumber(entry?.position);
    if (teamId === null || position === null) continue;
    entries.push({ position, teamId, isWinner: entry?.isWinner === true });
  }
  return entries.sort((first, second) => first.position - second.position || first.teamId.localeCompare(second.teamId));
}

function asRounds(value: unknown): RecapRound[] {
  const rounds: RecapRound[] = [];
  for (const candidate of asArray(value)) {
    const round = asRecord(candidate);
    const number = asNumber(round?.number);
    if (number === null) continue;
    rounds.push({ number, matches: asMatches(round?.matches) });
  }
  return rounds.sort((first, second) => first.number - second.number);
}

function asMatches(value: unknown): RecapRoundMatch[] {
  const matches: RecapRoundMatch[] = [];
  for (const candidate of asArray(value)) {
    const match = asRecord(candidate);
    const teamAId = asString(match?.teamAId);
    if (teamAId === null) continue;
    matches.push({
      matchId: asString(match?.matchId) ?? teamAId,
      teamAId,
      teamBId: asString(match?.teamBId),
      winnerTeamId: asString(match?.winnerTeamId),
      status: asString(match?.status) ?? 'SCHEDULED',
    });
  }
  return matches;
}

function asTeamNames(value: unknown): Record<string, string> {
  const record = asRecord(value);
  if (record === null) return {};
  const names: Array<[string, string]> = [];
  for (const [teamId, name] of Object.entries(record)) {
    const label = asString(name);
    if (label !== null) names.push([teamId, label]);
  }
  return Object.fromEntries(names.sort((first, second) => first[0].localeCompare(second[0])));
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}