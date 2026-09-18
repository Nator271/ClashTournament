import { randomUUID } from 'node:crypto';

import { BracketGenerator, type GeneratedMatch } from '../services/bracket-generator.js';
import type { AuthorizationPort, PermissionContext } from '../ports/authorization.js';
import type { AuditPort } from '../ports/audit.js';
import type { SchedulingPort } from '../ports/scheduling.js';

export type CloseRegistrationDependencies = {
  readonly authorization: AuthorizationPort;
  readonly tournament: { findById(id: string): Promise<{ id: string; guildId: string; status: string; roundDurationMinutes: number } | null>; save(tournament: { id: string; guildId: string; status: string; roundDurationMinutes: number }): Promise<unknown> };
  readonly acceptedTeamIds: (tournamentId: string) => Promise<readonly string[]>;
  readonly createRound: (round: { id: string; tournamentId: string; number: number; deadline: Date }) => Promise<void>;
  readonly createMatch: (match: GeneratedMatch & { readonly roundId: string }) => Promise<void>;
  readonly scheduler: SchedulingPort;
  readonly audit: AuditPort;
};

export class CloseRegistration {
  constructor(private readonly dependencies: CloseRegistrationDependencies, private readonly bracket = new BracketGenerator()) {}

  async execute(input: { readonly context: PermissionContext; readonly tournamentId: string }): Promise<readonly GeneratedMatch[]> {
    const permission = this.dependencies.authorization.canManageTournament(input.context);
    if (!permission.allowed) throw new Error(permission.reason ?? 'Organizer permission required.');
    const tournament = await this.dependencies.tournament.findById(input.tournamentId);
    if (tournament === null || tournament.guildId !== input.context.guildId) throw new Error('Tournament not found.');
    if (tournament.status !== 'REGISTRATION_OPEN') throw new Error('Registration is not open.');
    const teams = await this.dependencies.acceptedTeamIds(input.tournamentId);
    if (teams.length < 2) throw new Error('At least two accepted teams are required.');
    const matches = this.bracket.firstRound(teams);
    const roundId = randomUUID();
    const deadline = new Date(Date.now() + tournament.roundDurationMinutes * 60_000);
    await this.dependencies.createRound({ id: roundId, tournamentId: tournament.id, number: 1, deadline });
    for (const match of matches) await this.dependencies.createMatch({ ...match, roundId });
    await this.dependencies.tournament.save({ ...tournament, status: 'IN_PROGRESS' });
    await this.dependencies.scheduler.registerDeadline({ id: roundId, kind: 'round', dueAt: deadline, guildId: tournament.guildId });
    await this.dependencies.audit.append({ guildId: tournament.guildId, tournamentId: tournament.id, actorUserId: input.context.userId, action: 'tournament.registration.closed', payload: { roundId, matchCount: matches.length } });
    return matches;
  }
}
