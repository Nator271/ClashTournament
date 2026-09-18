import { randomUUID } from 'node:crypto';

import type { AuthorizationPort, PermissionContext } from '../../ports/authorization.js';
import type { AuditPort } from '../../ports/audit.js';
import type { ClashOfClansGateway } from '../../ports/clash-of-clans-gateway.js';
import { TeamApplication, type TeamApplicationInput } from '../../../domain/team/team-application.js';

export type TeamRegistrationTournament = {
  readonly id: string;
  readonly guildId: string;
  readonly status: 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  readonly playersPerTeam: number;
  readonly registrationEndsAt?: Date;
};

export type TeamApplicationStore = {
  save(application: TeamApplication): Promise<TeamApplication>;
  findById(id: string): Promise<TeamApplication | null>;
};

export type TeamApplicationUseCaseDependencies = {
  readonly applications: TeamApplicationStore;
  readonly tournaments: { findById(id: string): Promise<TeamRegistrationTournament | null> };
  readonly authorization: AuthorizationPort;
  readonly gateway: ClashOfClansGateway;
  readonly audit: AuditPort;
};

export type CreateTeamApplicationInput = {
  readonly context: PermissionContext;
  readonly tournamentId: string;
  readonly name: string;
  readonly managerIds: readonly string[];
  readonly managerGuildIds?: readonly string[];
};

export class CreateTeamApplication {
  constructor(private readonly dependencies: TeamApplicationUseCaseDependencies) {}

  async execute(input: CreateTeamApplicationInput): Promise<TeamApplication> {
    this.assertGuildViewer(input.context);
    const tournament = await this.requireTournament(input.tournamentId, input.context.guildId);
    if (tournament.status !== 'REGISTRATION_OPEN') throw new Error('Team registration is not open.');
    const applicationInput: TeamApplicationInput = {
      id: randomUUID(),
      tournamentId: tournament.id,
      guildId: tournament.guildId,
      name: input.name,
      managerIds: input.managerIds,
      playersPerTeam: tournament.playersPerTeam,
      ...(input.managerGuildIds === undefined ? {} : { managerGuildIds: input.managerGuildIds }),
      ...(tournament.registrationEndsAt === undefined ? {} : { editableUntil: tournament.registrationEndsAt }),
    };
    const application = TeamApplication.create(applicationInput);
    const saved = await this.dependencies.applications.save(application);
    await this.dependencies.audit.append({ guildId: tournament.guildId, tournamentId: tournament.id, actorUserId: input.context.userId, action: 'team.application.created', payload: { applicationId: saved.id } });
    return saved;
  }

  private assertGuildViewer(context: PermissionContext): void {
    const decision = this.dependencies.authorization.canViewGuildData(context);
    if (!decision.allowed) throw new Error(decision.reason ?? 'The user cannot view this guild.');
  }

  private async requireTournament(id: string, guildId: string): Promise<TeamRegistrationTournament> {
    const tournament = await this.dependencies.tournaments.findById(id);
    if (tournament === null || tournament.guildId !== guildId) throw new Error('Tournament not found in this guild.');
    return tournament;
  }
}

export class AddTeamPlayer {
  constructor(private readonly dependencies: TeamApplicationUseCaseDependencies) {}

  async execute(input: { readonly context: PermissionContext; readonly applicationId: string; readonly tag: string }): Promise<TeamApplication> {
    const application = await this.requireApplication(input.applicationId, input.context);
    if (!application.managerIds.includes(input.context.userId)) throw new Error('Only a team manager can edit this application.');
    const result = await this.dependencies.gateway.verifyPlayer(input.tag);
    if (result.kind !== 'verified') {
      throw new Error(result.kind === 'rate-limited' ? 'The Clash verification service is busy. Please try again.' : result.reason);
    }
    application.addVerifiedPlayer({ tag: result.player.normalizedTag ?? result.player.tag, displayName: result.player.displayName, townHallLevel: result.player.townHallLevel, ...(result.player.verifiedAt === undefined ? {} : { verifiedAt: result.player.verifiedAt }), ...(result.player.source === undefined ? {} : { source: result.player.source }) });
    const saved = await this.dependencies.applications.save(application);
    await this.dependencies.audit.append({ guildId: application.guildId, tournamentId: application.tournamentId, actorUserId: input.context.userId, action: 'team.application.player.verified', payload: { applicationId: application.id, tag: result.player.normalizedTag ?? result.player.tag } });
    return saved;
  }

  private async requireApplication(id: string, context: PermissionContext): Promise<TeamApplication> {
    const application = await this.dependencies.applications.findById(id);
    if (application === null || application.guildId !== context.guildId) throw new Error('Team application not found in this guild.');
    return application;
  }
}

export class SubmitTeamApplication {
  constructor(private readonly dependencies: TeamApplicationUseCaseDependencies) {}

  async execute(input: { readonly context: PermissionContext; readonly applicationId: string }): Promise<TeamApplication> {
    const application = await this.dependencies.applications.findById(input.applicationId);
    if (application === null || application.guildId !== input.context.guildId) throw new Error('Team application not found in this guild.');
    if (!application.managerIds.includes(input.context.userId)) throw new Error('Only a team manager can submit this application.');
    const tournament = await this.dependencies.tournaments.findById(application.tournamentId);
    if (tournament === null || tournament.status !== 'REGISTRATION_OPEN') throw new Error('Team registration is closed.');
    application.submit();
    const saved = await this.dependencies.applications.save(application);
    await this.dependencies.audit.append({ guildId: application.guildId, tournamentId: application.tournamentId, actorUserId: input.context.userId, action: 'team.application.submitted', payload: { applicationId: application.id } });
    return saved;
  }
}

export class EditTeamApplication {
  constructor(private readonly dependencies: TeamApplicationUseCaseDependencies) {}

  async execute(input: { readonly context: PermissionContext; readonly applicationId: string; readonly name?: string }): Promise<TeamApplication> {
    const application = await this.dependencies.applications.findById(input.applicationId);
    if (application === null || application.guildId !== input.context.guildId) throw new Error('Team application not found in this guild.');
    if (!application.managerIds.includes(input.context.userId) || !application.canEdit(new Date())) throw new Error('This application can no longer be edited.');
    if (input.name !== undefined) application.rename(input.name);
    const saved = await this.dependencies.applications.save(application);
    await this.dependencies.audit.append({ guildId: application.guildId, tournamentId: application.tournamentId, actorUserId: input.context.userId, action: 'team.application.edited', payload: { applicationId: application.id, nameChanged: input.name !== undefined } });
    return saved;
  }
}
