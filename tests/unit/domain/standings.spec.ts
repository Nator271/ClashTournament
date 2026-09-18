import { describe, expect, it } from 'vitest';

import {
  applyFinalWinner,
  buildSingleEliminationStandings,
  isBracketResolved,
  isMatchResolved,
  losingTeamId,
  summarizeRounds,
  type StandingMatch,
} from '../../../src/domain/tournament/standings.js';

/** A four-team bracket whose two semifinals and the final are all resolved. */
const resolvedBracket: readonly StandingMatch[] = [
  { matchId: 'match-1', roundNumber: 1, teamAId: 'team-a', teamBId: 'team-b', winnerTeamId: 'team-a', status: 'RESOLVED' },
  { matchId: 'match-2', roundNumber: 1, teamAId: 'team-c', teamBId: 'team-d', winnerTeamId: 'team-c', status: 'RESOLVED' },
  { matchId: 'match-3', roundNumber: 2, teamAId: 'team-a', teamBId: 'team-c', winnerTeamId: 'team-a', status: 'RESOLVED' },
];

describe('single-elimination final standings', () => {
  it('ranks the winner first and shares a position between teams eliminated in the same round', () => {
    const standings = buildSingleEliminationStandings(resolvedBracket);

    expect(standings.winnerTeamId).toBe('team-a');
    expect(standings.finalRoundNumber).toBe(2);
    expect(standings.entries).toEqual([
      { teamId: 'team-a', position: 1, isWinner: true },
      { teamId: 'team-c', position: 2, isWinner: false, eliminatedInRound: 2 },
      { teamId: 'team-b', position: 3, isWinner: false, eliminatedInRound: 1 },
      { teamId: 'team-d', position: 3, isWinner: false, eliminatedInRound: 1 },
    ]);
  });

  it('produces the same ranking for a shuffled bracket and for a staff-decided final', () => {
    const shuffled = [...resolvedBracket].reverse();
    expect(buildSingleEliminationStandings(shuffled)).toEqual(buildSingleEliminationStandings(resolvedBracket));

    const staffDecided: readonly StandingMatch[] = [
      ...resolvedBracket.slice(0, 2),
      { matchId: 'match-3', roundNumber: 2, teamAId: 'team-a', teamBId: 'team-c', winnerTeamId: 'team-c', status: 'STAFF_DECIDED' },
    ];
    const standings = buildSingleEliminationStandings(staffDecided);
    expect(standings.winnerTeamId).toBe('team-c');
    expect(standings.entries[1]).toEqual({ teamId: 'team-a', position: 2, isWinner: false, eliminatedInRound: 2 });
  });

  it('refuses to rank an unfinished bracket or an unsupported format', () => {
    const unfinished: readonly StandingMatch[] = [
      ...resolvedBracket.slice(0, 2),
      { matchId: 'match-3', roundNumber: 2, teamAId: 'team-a', teamBId: 'team-c', winnerTeamId: null, status: 'AWAITING_RESULT' },
    ];
    expect(isBracketResolved(unfinished)).toBe(false);
    expect(() => buildSingleEliminationStandings(unfinished)).toThrow(/not fully resolved/i);
    expect(() => buildSingleEliminationStandings(resolvedBracket, 'ROUND_ROBIN')).toThrow(/not supported/i);
  });

  it('treats a bye as resolved without inventing a loser', () => {
    const withBye: readonly StandingMatch[] = [
      { matchId: 'match-1', roundNumber: 1, teamAId: 'team-a', teamBId: null, winnerTeamId: 'team-a', status: 'RESOLVED' },
      { matchId: 'match-2', roundNumber: 1, teamAId: 'team-b', teamBId: 'team-c', winnerTeamId: 'team-b', status: 'RESOLVED' },
      { matchId: 'match-3', roundNumber: 2, teamAId: 'team-a', teamBId: 'team-b', winnerTeamId: 'team-a', status: 'RESOLVED' },
    ];

    expect(losingTeamId(withBye[0]!)).toBeNull();
    expect(isBracketResolved(withBye)).toBe(true);
    expect(buildSingleEliminationStandings(withBye).entries).toEqual([
      { teamId: 'team-a', position: 1, isWinner: true },
      { teamId: 'team-b', position: 2, isWinner: false, eliminatedInRound: 2 },
      { teamId: 'team-c', position: 3, isWinner: false, eliminatedInRound: 1 },
    ]);
  });

  it('groups round results in ascending order and flags resolved statuses', () => {
    const rounds = summarizeRounds(resolvedBracket);

    expect(rounds.map((round) => round.number)).toEqual([1, 2]);
    expect(rounds[0]?.matches.map((match) => match.matchId)).toEqual(['match-1', 'match-2']);
    expect(rounds[1]?.matches[0]?.winnerTeamId).toBe('team-a');
    expect(isMatchResolved('RESOLVED')).toBe(true);
    expect(isMatchResolved('STAFF_DECIDED')).toBe(true);
    expect(isMatchResolved('CONTESTED')).toBe(false);
  });

  it('accepts a staff winner override only for a team of the final match', () => {
    const overridden = applyFinalWinner(resolvedBracket, 'team-c');

    expect(buildSingleEliminationStandings(overridden).winnerTeamId).toBe('team-c');
    expect(() => applyFinalWinner(resolvedBracket, 'team-b')).toThrow(/does not belong/i);
  });
});
