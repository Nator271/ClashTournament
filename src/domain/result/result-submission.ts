import { compareSubmissions, type ResultStatistics, validateSubmission } from './tiebreaker.js';

export class ResultSubmission {
  readonly statistics: ResultStatistics;
  status: 'SUBMITTED' | 'VALIDATED' | 'REJECTED' = 'SUBMITTED';

  constructor(statistics: ResultStatistics, playersPerTeam: number) {
    validateSubmission({ ...statistics, playersPerTeam });
    this.statistics = statistics;
  }

  compareTo(other: ResultSubmission): -1 | 0 | 1 {
    return compareSubmissions(this.statistics, other.statistics);
  }
}