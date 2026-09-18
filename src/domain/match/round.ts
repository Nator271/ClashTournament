export type RoundStatus = 'PENDING' | 'ACTIVE' | 'RESOLVED';

export type Round = {
  readonly id: string;
  readonly number: number;
  readonly status: RoundStatus;
  readonly deadline: Date;
};

export function canAdvanceRound(statuses: readonly string[]): boolean {
  return statuses.length > 0 && statuses.every((status) => status === 'RESOLVED');
}