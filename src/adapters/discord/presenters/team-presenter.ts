import { mapError } from '../../../infrastructure/observability/errors.js';
import type { TeamApplication, VerifiedPlayer } from '../../../domain/team/team-application.js';

export type TeamApplicationPresentation = {
  readonly title: string;
  readonly description: string;
  readonly players: readonly { readonly tag: string; readonly name: string; readonly townHallLevel: number }[];
  readonly status: string;
};

export function presentTeamApplication(application: TeamApplication): TeamApplicationPresentation {
  return {
    title: application.name,
    description: `Application ${application.status.toLowerCase()} with ${application.players.length}/${application.playersPerTeam} verified players.`,
    players: application.players.map((player: VerifiedPlayer) => ({ tag: player.tag, name: player.displayName, townHallLevel: player.townHallLevel })),
    status: application.status,
  };
}

export function presentTeamError(error: unknown, reference?: string): { readonly content: string } {
  const mapped = mapError(error, reference);
  return { content: mapped.reference === undefined ? mapped.message : `${mapped.message} (ref: ${mapped.reference})` };
}

export function teamStatusNotification(application: TeamApplication): string {
  if (application.status === 'CHANGES_REQUESTED') return `Changes are required for ${application.name}.`;
  return `Team application ${application.name} is ${application.status.toLowerCase()}.`;
}
