import type { AuthorizationPort, PermissionContext } from '../ports/authorization.js';
import type { AuditPort, OutboxPort } from '../ports/audit.js';
import { TournamentStatus } from '../../domain/tournament/tournament.js';
import type { TournamentDraft } from './create-tournament-draft.js';

export type PublishTournamentInput = {
  readonly context: PermissionContext;
  readonly draft: TournamentDraft;
};

export class PublishTournament {
  private readonly publishedDrafts = new Set<string>();

  constructor(
    private readonly authorization: AuthorizationPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: PublishTournamentInput): Promise<TournamentDraft> {
    const decision = this.authorization.canManageTournament(input.context);
    if (!decision.allowed || input.draft.guildId !== input.context.guildId) {
      throw new Error(decision.reason ?? 'The user is not authorized to publish this tournament.');
    }
    if (input.draft.published || input.draft.cancelled || input.draft.expiresAt <= new Date()) {
      throw new Error('This tournament draft is expired or already published.');
    }

    const publicationDate = new Date();
    const tournament =
      input.draft.tournament.status === TournamentStatus.DRAFT &&
      publicationDate >= input.draft.tournament.registrationStartsAt
        ? input.draft.tournament.openRegistration(publicationDate)
        : input.draft.tournament;

    const published: TournamentDraft = { ...input.draft, tournament, confirmed: true };
    if (!this.publishedDrafts.has(input.draft.id)) {
      await this.outbox.enqueue(
        'tournament.registration.publish',
        {
          tournamentId: published.tournament.id,
          name: published.tournament.name,
          format: published.tournament.formattedFormat,
          playersPerTeam: published.tournament.playersPerTeam,
          registrationStartsAt: published.tournament.registrationStartsAt.toISOString(),
          registrationEndsAt: published.tournament.registrationEndsAt.toISOString(),
          optionalMessage: published.tournament.optionalMessage,
        },
        published.guildId,
        published.tournament.id,
      );
      this.publishedDrafts.add(input.draft.id);
    }
    await this.audit.append({
      guildId: published.guildId,
      tournamentId: published.tournament.id,
      actorUserId: input.context.userId,
      action: 'tournament.published',
      payload: { draftId: published.id },
    });
    return { ...published, published: true, version: (input.draft.version ?? 0) + 1 };
  }
}