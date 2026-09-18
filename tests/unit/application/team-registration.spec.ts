import { describe, expect, it } from 'vitest';

import { AuthorizationService } from '../../../src/application/services/authorization-service.js';
import { CreateTeamApplication, AddTeamPlayer, SubmitTeamApplication, type TeamApplicationStore, type TeamRegistrationTournament } from '../../../src/application/use-cases/team-application/index.js';
import { ApplicationDecision } from '../../../src/application/use-cases/staff/application-decision.js';
import { TeamApplication } from '../../../src/domain/team/team-application.js';

const tournament: TeamRegistrationTournament = { id: 'tournament-1', guildId: 'guild-1', status: 'REGISTRATION_OPEN', playersPerTeam: 1 };
const authorization = new AuthorizationService({ staffRoleId: 'staff' });
const audit = { append: async (entry: Record<string, unknown>) => ({ ...entry, id: 'audit-1', createdAt: new Date(), guildId: 'guild-1', action: 'test', payload: {} }), listForTournament: async () => [] };
const gateway = { verifyPlayer: async () => ({ kind: 'verified' as const, player: { tag: '#ABC123', normalizedTag: '#ABC123', displayName: 'Player', townHallLevel: 12, verifiedAt: new Date(), source: 'test' } }) };

function setup(): { applications: TeamApplicationStore; tournaments: { findById: (id: string) => Promise<TeamRegistrationTournament | null> }; saved: Map<string, TeamApplication> } {
  const saved = new Map<string, TeamApplication>();
  return {
    saved,
    applications: { save: async (application) => { saved.set(application.id, application); return application; }, findById: async (id) => saved.get(id) ?? null },
    tournaments: { findById: async (id) => id === tournament.id ? tournament : null },
  };
}

describe('US2 team application use cases', () => {
  it('creates, verifies and submits only a complete application', async () => {
    const dependencies = { ...setup(), authorization, gateway, audit };
    const context = { guildId: 'guild-1', userId: 'manager-1', roleIds: [], isAdmin: false };
    const application = await new CreateTeamApplication(dependencies).execute({ context, tournamentId: tournament.id, name: 'Team One', managerIds: ['manager-1'], managerGuildIds: ['guild-1'] });
    await new AddTeamPlayer(dependencies).execute({ context, applicationId: application.id, tag: '#abc123' });
    const submitted = await new SubmitTeamApplication(dependencies).execute({ context, applicationId: application.id });
    expect(submitted.status).toBe('PENDING');
  });

  it('blocks creation outside registration and staff decisions without permission/reason', async () => {
    const dependencies = { ...setup(), authorization, gateway, audit };
    await expect(new CreateTeamApplication(dependencies).execute({ context: { guildId: 'guild-1', userId: 'manager-1', roleIds: [], isAdmin: false }, tournamentId: 'missing', name: 'Team', managerIds: ['manager-1'] })).rejects.toThrow(/not found/i);
    const application = TeamApplication.create({ id: 'application-1', tournamentId: tournament.id, guildId: tournament.guildId, name: 'Team', managerIds: ['manager-1'], playersPerTeam: 1 });
    application.addVerifiedPlayer({ tag: '#ABC123', displayName: 'Player', townHallLevel: 12 });
    application.submit();
    await dependencies.applications.save(application);
    const decisions = { save: async (decision: unknown) => decision };
    const useCase = new ApplicationDecision(dependencies.applications, decisions, authorization, audit);
    await expect(useCase.execute({ context: { guildId: 'guild-1', userId: 'staff-1', roleIds: ['staff'], isAdmin: false }, applicationId: application.id, action: 'ACCEPT', reason: '' })).rejects.toThrow(/reason/i);
    const accepted = await useCase.execute({ context: { guildId: 'guild-1', userId: 'staff-1', roleIds: ['staff'], isAdmin: false }, applicationId: application.id, action: 'ACCEPT', reason: 'Verified roster' });
    expect(accepted.status).toBe('ACCEPTED');
  });
});
