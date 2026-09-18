import type { Tournament } from '../../../domain/tournament/tournament.js';
import type { DiscordEmbedPayload } from '../../../application/ports/discord-effects.js';
import { mapError } from '../../../infrastructure/observability/errors.js';

export type TournamentRulesPresentation = {
  readonly title: string;
  readonly description: string;
  readonly registrationAction: string;
};

export type TournamentRulesMessage = {
  readonly embed: DiscordEmbedPayload;
  readonly components: readonly [{ type: 'button'; customId: string; label: string }];
};

export function presentTournamentRules(tournament: Tournament): TournamentRulesPresentation {
  const optionalMessage = tournament.optionalMessage === undefined
    ? ''
    : `\n\n${tournament.optionalMessage}`;
  return {
    title: tournament.name,
    description:
      `Format: ${tournament.formattedFormat}\n` +
      `Players per team: ${tournament.playersPerTeam}\n` +
      `Registration: ${tournament.registrationStartsAt.toISOString()} to ` +
      `${tournament.registrationEndsAt.toISOString()}\n` +
      `Round duration: ${tournament.roundDurationMinutes} minutes${optionalMessage}`,
    registrationAction: 'Join tournament',
  };
}

export function presentTournamentRulesMessage(tournament: Tournament): TournamentRulesMessage {
  const rules = presentTournamentRules(tournament);
  return {
    embed: { title: rules.title, description: rules.description, color: 0x2f80ed },
    components: [{ type: 'button', customId: `v1:tournament:register:${tournament.id}`, label: rules.registrationAction }],
  };
}

export function presentTournamentError(error: unknown, reference?: string): { readonly content: string } {
  const mapped = mapError(error, reference);
  return { content: mapped.reference === undefined ? mapped.message : `${mapped.message} (ref: ${mapped.reference})` };
}