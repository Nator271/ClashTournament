import { ResultSubmission } from '../../../domain/result/result-submission.js';
import { compareSubmissions } from '../../../domain/result/tiebreaker.js';
import type { AuditPort } from '../../ports/audit.js';

export type ResultStore = {
  save(id: string, result: ResultSubmission): Promise<ResultSubmission>;
  listForMatch(matchId: string): Promise<readonly ResultSubmission[]>;
};

export type MatchResultStatusStore = {
  getStatus(matchId: string): Promise<string>;
  /**
   * Persists the match status together with the winning team, which is what the final standings and
   * the tournament completion rely on. `winnerTeamId` is optional: pass `null` to clear a previously
   * stored winner (contest or unresolved tie) and omit it to leave the stored winner untouched.
   */
  setStatus(
    matchId: string,
    status: 'AWAITING_RESULT' | 'RESOLVED' | 'CONTESTED',
    winnerTeamId?: string | null,
  ): Promise<void>;
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
      await this.dependencies.matches.setStatus(input.matchId, 'CONTESTED', null);
      contested = true;
    }
    await this.dependencies.results.save(`${input.matchId}:${input.teamId}`, result);
    const all = [...existing.filter((item) => item.teamId !== input.teamId), result];
    if (!contested && all.length >= 2) {
      const comparison = compareSubmissions(all[0]!.statistics, all[1]!.statistics);
      // A decisive comparison stores the winner so the bracket, the final ranking and the
      // completion can rely on it; a persistent tie keeps the match awaiting a staff decision.
      if (comparison === 0) await this.dependencies.matches.setStatus(input.matchId, 'AWAITING_RESULT', null);
      else await this.dependencies.matches.setStatus(input.matchId, 'RESOLVED', comparison > 0 ? all[0]!.teamId : all[1]!.teamId);
    }
    await this.dependencies.audit.append({ guildId: 'unknown', actorUserId: input.submittedBy, action: 'match.result.submitted', payload: { matchId: input.matchId, teamId: input.teamId } });
    return result;
  }
}