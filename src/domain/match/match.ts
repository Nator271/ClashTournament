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
  readonly teamBId?: string;
  readonly deadline: Date;
  readonly status: MatchStatus;
};