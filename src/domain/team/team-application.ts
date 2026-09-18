export type ApplicationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CHANGES_REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DISQUALIFIED';

export type VerifiedPlayer = {
  readonly tag: string;
  readonly displayName: string;
  readonly townHallLevel: number;
  readonly verifiedAt?: Date;
  readonly source?: string;
};

export type TeamManager = {
  readonly discordUserId: string;
  readonly guildId: string;
};

export type TeamApplicationInput = {
  readonly id: string;
  readonly tournamentId: string;
  readonly guildId: string;
  readonly name: string;
  readonly managerIds: readonly string[];
  readonly playersPerTeam: number;
  readonly editableUntil?: Date;
  readonly managerGuildIds?: readonly string[];
};

export class TeamApplication {
  readonly id: string;
  readonly tournamentId: string;
  readonly guildId: string;
  readonly name: string;
  readonly managerIds: readonly string[];
  readonly playersPerTeam: number;
  readonly editableUntil?: Date;
  readonly players: VerifiedPlayer[] = [];
  status: ApplicationStatus = 'DRAFT';

  private constructor(input: TeamApplicationInput) {
    this.id = input.id;
    this.tournamentId = input.tournamentId;
    this.guildId = input.guildId;
    this.name = input.name.trim();
    this.managerIds = [...input.managerIds];
    this.playersPerTeam = input.playersPerTeam;
    if (input.editableUntil !== undefined) this.editableUntil = input.editableUntil;
  }

  static create(input: TeamApplicationInput): TeamApplication {
    if (input.name.trim().length === 0) {
      throw new Error('Team name must not be empty.');
    }
    if (input.managerIds.length === 0) {
      throw new Error('At least one team manager is required.');
    }
    if (!Number.isInteger(input.playersPerTeam) || input.playersPerTeam < 1 || input.playersPerTeam > 10) {
      throw new Error('Players per team must be an integer between 1 and 10.');
    }
    if (input.managerGuildIds !== undefined && input.managerGuildIds.some((guildId) => guildId !== input.guildId)) {
      throw new Error('All team managers must belong to the tournament guild.');
    }
    return new TeamApplication(input);
  }

  addVerifiedPlayer(player: VerifiedPlayer): void {
    if (!this.canEdit(new Date())) {
      throw new Error('Players cannot be changed after submission.');
    }
    if (!/^#[A-Z0-9]{3,15}$/i.test(player.tag.trim())) throw new Error('The player tag is invalid.');
    if (!Number.isInteger(player.townHallLevel) || player.townHallLevel < 1 || player.townHallLevel > 18) {
      throw new Error('The player town hall level is invalid.');
    }
    const normalizedTag = player.tag.trim().toUpperCase();
    if (this.players.some((current) => current.tag.trim().toUpperCase() === normalizedTag)) {
      throw new Error('This player is already in the team.');
    }
    this.players.push({ ...player, tag: normalizedTag });
  }

  submit(): TeamApplication {
    if (this.players.length !== this.playersPerTeam) {
      throw new Error(`Exactly ${this.playersPerTeam} verified players are required.`);
    }
    this.status = 'PENDING';
    return this;
  }

  canEdit(referenceDate: Date): boolean {
    return (
      (this.status === 'DRAFT' || this.status === 'CHANGES_REQUESTED') &&
      (this.editableUntil === undefined || referenceDate <= this.editableUntil)
    );
  }

  rename(name: string): void {
    if (!this.canEdit(new Date())) throw new Error('This application can no longer be edited.');
    if (name.trim().length === 0) throw new Error('Team name must not be empty.');
    (this as { name: string }).name = name.trim();
  }

  requestChanges(): void {
    if (this.status !== 'PENDING') throw new Error('Only pending applications can request changes.');
    this.status = 'CHANGES_REQUESTED';
  }

  accept(): void {
    if (this.status !== 'PENDING' && this.status !== 'CHANGES_REQUESTED') {
      throw new Error('Only pending applications can be accepted.');
    }
    if (this.players.length !== this.playersPerTeam) throw new Error('An incomplete application cannot be accepted.');
    this.status = 'ACCEPTED';
  }

  reject(reason: string): void {
    if (reason.trim().length === 0) throw new Error('A rejection reason is required.');
    if (this.status !== 'PENDING' && this.status !== 'CHANGES_REQUESTED') throw new Error('This application cannot be rejected.');
    this.status = 'REJECTED';
  }

  disqualify(reason: string): void {
    if (reason.trim().length === 0) throw new Error('A disqualification reason is required.');
    if (this.status === 'DRAFT') throw new Error('A draft application cannot be disqualified.');
    this.status = 'DISQUALIFIED';
  }
}