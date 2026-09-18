import { compareSubmissions, type ResultStatistics, validateSubmission } from './tiebreaker.js';

export class ResultSubmission {
  readonly statistics: ResultStatistics;
  status: 'SUBMITTED' | 'VALIDATED' | 'REJECTED' = 'SUBMITTED';

  readonly teamId?: string;
  readonly submittedBy?: string;

  constructor(statistics: ResultStatistics, playersPerTeam: number, teamId?: string, submittedBy?: string) {
    validateSubmission({ ...statistics, playersPerTeam });
    this.statistics = statistics;
    if (teamId !== undefined) this.teamId = teamId;
    if (submittedBy !== undefined) this.submittedBy = submittedBy;
  }

  compareTo(other: ResultSubmission): -1 | 0 | 1 {
    return compareSubmissions(this.statistics, other.statistics);
  }
}