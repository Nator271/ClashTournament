import type { AuthorizationPort, PermissionContext } from '../../ports/authorization.js';
import type { AuditPort } from '../../ports/audit.js';
import type { MatchResultStatusStore } from '../match-results/index.js';

export type ResultDecisionAction = 'VALIDATE' | 'CORRECT' | 'CANCEL' | 'ASSIGN_RESULT';

export class ResultDecision {
  constructor(private readonly matches: MatchResultStatusStore, private readonly authorization: AuthorizationPort, private readonly audit: AuditPort) {}

  async execute(input: { readonly context: PermissionContext; readonly matchId: string; readonly action: ResultDecisionAction; readonly reason: string }): Promise<void> {
    const permission = this.authorization.canModerateApplications(input.context);
    if (!permission.allowed) throw new Error(permission.reason ?? 'Staff permission required.');
    if (input.reason.trim().length === 0) throw new Error('A staff decision reason is required.');
    if (input.action === 'CANCEL') await this.matches.setStatus(input.matchId, 'CONTESTED');
    else await this.matches.setStatus(input.matchId, 'RESOLVED');
    await this.audit.append({ guildId: input.context.guildId, actorUserId: input.context.userId, action: `match.result.${input.action.toLowerCase()}`, payload: { matchId: input.matchId, reason: input.reason } });
  }
}