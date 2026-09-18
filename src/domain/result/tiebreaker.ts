export type ResultStatistics = {
  readonly stars: number;
  readonly destructionPercent?: number;
  readonly attackMinutes?: number;
};

export function requiredStatisticsForTie(first: ResultStatistics, second: ResultStatistics): Array<'destructionPercent' | 'attackMinutes'> {
  if (first.stars !== second.stars) return [];
  if (first.destructionPercent === undefined || second.destructionPercent === undefined) return ['destructionPercent'];
  if (first.destructionPercent !== second.destructionPercent) return [];
  if (first.attackMinutes === undefined || second.attackMinutes === undefined) return ['attackMinutes'];
  return [];
}

export function validateSubmission(
  statistics: ResultStatistics & { readonly playersPerTeam: number },
): void {
  if (!Number.isInteger(statistics.stars) || statistics.stars < 0 || statistics.stars > 3 * statistics.playersPerTeam) {
    throw new Error('Stars must be an integer between 0 and three times the team size.');
  }
  if (statistics.destructionPercent !== undefined && (statistics.destructionPercent < 0 || statistics.destructionPercent > 100)) {
    throw new Error('Destruction percentage must be between 0 and 100.');
  }
  if (statistics.attackMinutes !== undefined && (statistics.attackMinutes < 0 || statistics.attackMinutes > 3)) {
    throw new Error('Average attack time must be between 0 and 3 minutes.');
  }
}

export function compareSubmissions(first: ResultStatistics, second: ResultStatistics): -1 | 0 | 1 {
  if (first.stars !== second.stars) return first.stars > second.stars ? 1 : -1;
  if (first.destructionPercent !== second.destructionPercent) {
    if (first.destructionPercent === undefined || second.destructionPercent === undefined) return 0;
    return first.destructionPercent > second.destructionPercent ? 1 : -1;
  }
  if (first.attackMinutes !== second.attackMinutes) {
    if (first.attackMinutes === undefined || second.attackMinutes === undefined) return 0;
    return first.attackMinutes < second.attackMinutes ? 1 : -1;
  }
  return 0;
}