import type { AuthorizationPort, PermissionContext } from '../ports/authorization.js';
import type { TournamentDraft, CreateTournamentDraft, CreateTournamentDraftInput } from './create-tournament-draft.js';
import { PublishTournament } from './publish-tournament.js';

export class CreateTournament {
  constructor(
    private readonly drafts: CreateTournamentDraft,
    private readonly publisher: PublishTournament,
    private readonly authorization: AuthorizationPort,
  ) {}

  create(input: CreateTournamentDraftInput): Promise<TournamentDraft> {
    return this.drafts.execute(input);
  }

  confirm(context: PermissionContext, draft: TournamentDraft): TournamentDraft {
    this.assertOwner(context, draft);
    if (this.drafts.isExpired(draft)) {
      throw new Error('This tournament draft has expired.');
    }
    if (draft.cancelled || draft.published) {
      throw new Error('This tournament draft is no longer editable.');
    }
    return { ...draft, confirmed: true, version: (draft.version ?? 0) + 1 };
  }

  publish(context: PermissionContext, draft: TournamentDraft): Promise<TournamentDraft> {
    this.assertOwner(context, draft);
    return this.publisher.execute({ context, draft });
  }

  cancel(context: PermissionContext, draft: TournamentDraft): TournamentDraft {
    this.assertOwner(context, draft);
    if (draft.published) {
      throw new Error('A published tournament cannot be cancelled as a draft.');
    }
    return { ...draft, cancelled: true, version: (draft.version ?? 0) + 1 };
  }

  private assertOwner(context: PermissionContext, draft: TournamentDraft): void {
    const decision = this.authorization.canManageTournament(context);
    if (!decision.allowed || context.guildId !== draft.guildId || context.userId !== draft.organizerUserId) {
      throw new Error(decision.reason ?? 'The user is not authorized to manage this tournament draft.');
    }
  }
}