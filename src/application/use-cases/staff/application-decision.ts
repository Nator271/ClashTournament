import { randomUUID } from 'node:crypto';

import type { AuthorizationPort, PermissionContext } from '../../ports/authorization.js';
import type { AuditPort } from '../../ports/audit.js';
import { TeamApplication } from '../../../domain/team/team-application.js';
import type { TeamApplicationStore } from '../team-application/index.js';

export type ApplicationDecisionAction = 'ACCEPT' | 'REJECT' | 'REQUEST_CORRECTION' | 'DISQUALIFY';

type DecisionStore = {
  save(decision: { readonly id: string; readonly tournamentId: string; readonly targetType: string; readonly targetId: string; readonly actorUserId: string; readonly decision: string; readonly reason: string; readonly createdAt: Date }): Promise<unknown>;
};

export class ApplicationDecision {
  constructor(
    private readonly applications: TeamApplicationStore,
    private readonly decisions: DecisionStore,
    private readonly authorization: AuthorizationPort,
    private readonly audit: AuditPort,
  ) {}

  async execute(input: { readonly context: PermissionContext; readonly applicationId: string; readonly action: ApplicationDecisionAction; readonly reason: string }): Promise<TeamApplication> {
    const permission = this.authorization.canModerateApplications(input.context);
    if (!permission.allowed) throw new Error(permission.reason ?? 'Staff permission required.');
    if (input.reason.trim().length === 0) throw new Error('A staff decision reason is required.');
    const application = await this.applications.findById(input.applicationId);
    if (application === null || application.guildId !== input.context.guildId) throw new Error('Team application not found in this guild.');
    this.applyAction(application, input.action, input.reason);
    const saved = await this.applications.save(application);
    await this.decisions.save({ id: randomUUID(), tournamentId: application.tournamentId, targetType: 'team-application', targetId: application.id, actorUserId: input.context.userId, decision: input.action, reason: input.reason, createdAt: new Date() });
    await this.audit.append({ guildId: application.guildId, tournamentId: application.tournamentId, actorUserId: input.context.userId, action: `team.application.${input.action.toLowerCase()}`, payload: { applicationId: application.id, reason: input.reason } });
    return saved;
  }

  private applyAction(application: TeamApplication, action: ApplicationDecisionAction, reason: string): void {
    if (action === 'ACCEPT') application.accept();
    else if (action === 'REJECT') application.reject(reason);
    else if (action === 'REQUEST_CORRECTION') application.requestChanges();
    else application.disqualify(reason);
  }
}
