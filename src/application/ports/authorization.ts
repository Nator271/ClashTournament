export type PermissionContext = {
  readonly guildId: string;
  readonly userId: string;
  readonly roleIds: readonly string[];
  readonly isAdmin: boolean;
};

export type AuthorizationDecision = {
  readonly allowed: boolean;
  readonly reason?: string;
};

export type AuthorizationPort = {
  canManageTournament(context: PermissionContext): AuthorizationDecision;
  canModerateApplications(context: PermissionContext): AuthorizationDecision;
  canViewGuildData(context: PermissionContext): AuthorizationDecision;
};
