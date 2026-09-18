import type { Tournament } from '../../../domain/tournament/tournament.js';

export type TournamentRulesPresentation = {
  readonly title: string;
  readonly description: string;
  readonly registrationAction: string;
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