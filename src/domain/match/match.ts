export type MatchStatus =
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'AWAITING_RESULT'
  | 'CONTESTED'
  | 'RESOLVED'
  | 'CANCELLED';

export type Match = {
  readonly id: string;
  readonly teamAId: string;
  readonly teamBId: string | null;
  readonly deadline: Date;
  readonly status: MatchStatus;
  readonly isBye?: boolean;
  readonly scheduledAt?: Date;
  readonly scheduleProposedBy?: string;
};

export type MatchInput = {
  readonly id: string;
  readonly teamAId: string;
  readonly teamBId: string | null;
  readonly deadline: Date;
};

export function createMatch(input: MatchInput): Match {
  if (input.teamBId !== null && input.teamAId === input.teamBId) throw new Error('A match requires two distinct teams.');
  return { ...input, status: input.teamBId === null ? 'RESOLVED' : 'SCHEDULED', isBye: input.teamBId === null };
}

export function proposeMatchSchedule(match: Match, scheduledAt: Date, managerId: string): Match {
  if (match.isBye === true || match.teamBId === undefined) throw new Error('A bye does not need a schedule.');
  if (scheduledAt >= match.deadline) throw new Error('The proposed schedule must be before the deadline.');
  return { ...match, scheduledAt, scheduleProposedBy: managerId };
}

export function confirmMatchSchedule(match: Match, managerId: string): Match {
  if (match.scheduledAt === undefined || match.scheduleProposedBy === undefined) throw new Error('A schedule must be proposed first.');
  if (match.scheduleProposedBy === managerId) throw new Error('The other manager must confirm the schedule.');
  return { ...match, status: 'ACTIVE' };
}

export function resolveMatch(match: Match): Match {
  if (match.isBye === true) return match;
  if (match.status !== 'AWAITING_RESULT' && match.status !== 'ACTIVE') throw new Error('Only an active match can be resolved.');
  return { ...match, status: 'RESOLVED' };
}