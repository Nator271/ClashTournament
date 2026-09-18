import type {
  AuthorizationDecision,
  AuthorizationPort,
  PermissionContext,
} from '../ports/authorization.js';

export type AuthorizationConfig = {
  readonly organizerRoleId?: string;
  readonly staffRoleId?: string;
};

export class AuthorizationService implements AuthorizationPort {
  constructor(private readonly config: AuthorizationConfig) {}

  canManageTournament(context: PermissionContext): AuthorizationDecision {
    return this.decide(context, this.config.organizerRoleId);
  }

  canModerateApplications(context: PermissionContext): AuthorizationDecision {
    return this.decide(context, this.config.staffRoleId ?? this.config.organizerRoleId);
  }

  canViewGuildData(context: PermissionContext): AuthorizationDecision {
    return context.guildId.trim().length > 0 && context.userId.trim().length > 0
      ? { allowed: true }
      : { allowed: false, reason: 'A guild and user are required.' };
  }

  private decide(context: PermissionContext, roleId: string | undefined): AuthorizationDecision {
    if (!context.guildId || !context.userId) {
      return { allowed: false, reason: 'A guild and user are required.' };
    }

    if (context.isAdmin || (roleId !== undefined && context.roleIds.includes(roleId))) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'The user does not have the required role.' };
  }
}