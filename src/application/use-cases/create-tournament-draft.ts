import { randomUUID } from 'node:crypto';

import type { AuthorizationPort, PermissionContext } from '../ports/authorization.js';
import type { AuditPort } from '../ports/audit.js';
import type { SchedulingPort } from '../ports/scheduling.js';
import { resolveTournamentFormatStrategy } from '../../domain/tournament/format-strategy.js';
import { Tournament, TournamentFormat } from '../../domain/tournament/tournament.js';

export type TournamentDraft = {
  readonly id: string;
  readonly guildId: string;
  readonly organizerUserId: string;
  readonly tournament: Tournament;
  readonly expiresAt: Date;
  readonly confirmed: boolean;
  readonly published?: boolean;
  readonly cancelled?: boolean;
  readonly version?: number;
};

export type DraftRepository = {
  save(draft: TournamentDraft): Promise<TournamentDraft>;
  findById(id: string): Promise<TournamentDraft | null>;
};

export type CreateTournamentDraftInput = {
  readonly context: PermissionContext;
  readonly name: string;
  readonly playersPerTeam: number;
  readonly registrationStartsAt: Date;
  readonly registrationEndsAt: Date;
  readonly roundDurationMinutes: number;
  readonly optionalMessage?: string;
};

export class CreateTournamentDraft {
  constructor(
    private readonly drafts: DraftRepository,
    private readonly authorization: AuthorizationPort,
    private readonly audit: AuditPort,
    private readonly scheduler?: SchedulingPort,
  ) {}

  async execute(input: CreateTournamentDraftInput): Promise<TournamentDraft> {
    const decision = this.authorization.canManageTournament(input.context);
    if (!decision.allowed) {
      throw new Error(decision.reason ?? 'The user is not authorized to create tournaments.');
    }

    const tournament = Tournament.create({
      id: randomUUID(),
      guildId: input.context.guildId,
      name: input.name,
      organizerUserId: input.context.userId,
      playersPerTeam: input.playersPerTeam,
      registrationStartsAt: input.registrationStartsAt,
      registrationEndsAt: input.registrationEndsAt,
      roundDurationMinutes: input.roundDurationMinutes,
      ...(input.optionalMessage === undefined ? {} : { optionalMessage: input.optionalMessage }),
      format: TournamentFormat.SINGLE_ELIMINATION,
      createdAt: new Date(),
      strategy: resolveTournamentFormatStrategy(TournamentFormat.SINGLE_ELIMINATION),
    });
    const draft: TournamentDraft = {
      id: randomUUID(),
      guildId: input.context.guildId,
      organizerUserId: input.context.userId,
      tournament,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      confirmed: false,
    };

    const saved = await this.drafts.save(draft);
    if (this.scheduler !== undefined) {
      await this.scheduler.registerDeadline({
        id: tournament.id,
        kind: 'registration',
        dueAt: tournament.registrationStartsAt,
        guildId: tournament.guildId,
      });
    }
    await this.audit.append({
      guildId: input.context.guildId,
      actorUserId: input.context.userId,
      action: 'tournament.draft.created',
      payload: { draftId: draft.id, tournamentId: tournament.id },
    });
    return saved;
  }

  isExpired(draft: TournamentDraft, referenceDate = new Date()): boolean {
    return draft.expiresAt.getTime() <= referenceDate.getTime();
  }
}