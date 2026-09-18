import { ResultSubmission } from '../../../domain/result/result-submission.js';
import { compareSubmissions } from '../../../domain/result/tiebreaker.js';
import type { AuditPort } from '../../ports/audit.js';

export type ResultStore = {
  save(id: string, result: ResultSubmission): Promise<ResultSubmission>;
  listForMatch(matchId: string): Promise<readonly ResultSubmission[]>;
};

export type MatchResultStatusStore = {
  getStatus(matchId: string): Promise<string>;
  setStatus(matchId: string, status: 'AWAITING_RESULT' | 'RESOLVED' | 'CONTESTED'): Promise<void>;
};

export class ResultResolutionService {
  constructor(private readonly dependencies: { readonly results: ResultStore; readonly matches: MatchResultStatusStore; readonly audit: AuditPort }) {}

  async submit(input: { readonly matchId: string; readonly teamId: string; readonly playersPerTeam: number; readonly statistics: { readonly stars: number; readonly destructionPercent?: number; readonly attackMinutes?: number }; readonly submittedBy: string }): Promise<ResultSubmission> {
    const currentStatus = await this.dependencies.matches.getStatus(input.matchId);
    if (currentStatus === 'CONTESTED') throw new Error('This match is contested and requires staff resolution.');
    const result = new ResultSubmission(input.statistics, input.playersPerTeam, input.teamId, input.submittedBy);
    const existing = await this.dependencies.results.listForMatch(input.matchId);
    const previousFromTeam = existing.find((item) => item.teamId === input.teamId);
    let contested = false;
    if (currentStatus === 'RESOLVED' && previousFromTeam !== undefined && JSON.stringify(previousFromTeam.statistics) !== JSON.stringify(result.statistics)) {
      await this.dependencies.matches.setStatus(input.matchId, 'CONTESTED');
      contested = true;
    }
    await this.dependencies.results.save(`${input.matchId}:${input.teamId}`, result);
    const all = [...existing.filter((item) => item.teamId !== input.teamId), result];
    if (!contested && all.length >= 2 && compareSubmissions(all[0]!.statistics, all[1]!.statistics) !== 0) await this.dependencies.matches.setStatus(input.matchId, 'RESOLVED');
    else if (!contested && all.length >= 2) await this.dependencies.matches.setStatus(input.matchId, 'AWAITING_RESULT');
    await this.dependencies.audit.append({ guildId: 'unknown', actorUserId: input.submittedBy, action: 'match.result.submitted', payload: { matchId: input.matchId, teamId: input.teamId } });
    return result;
  }
}