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
};

export type TeamApplicationInput = {
  readonly id: string;
  readonly tournamentId: string;
  readonly guildId: string;
  readonly name: string;
  readonly managerIds: readonly string[];
  readonly playersPerTeam: number;
};

export class TeamApplication {
  readonly id: string;
  readonly tournamentId: string;
  readonly guildId: string;
  readonly name: string;
  readonly managerIds: readonly string[];
  readonly playersPerTeam: number;
  readonly players: VerifiedPlayer[] = [];
  status: ApplicationStatus = 'DRAFT';

  private constructor(input: TeamApplicationInput) {
    this.id = input.id;
    this.tournamentId = input.tournamentId;
    this.guildId = input.guildId;
    this.name = input.name.trim();
    this.managerIds = [...input.managerIds];
    this.playersPerTeam = input.playersPerTeam;
  }

  static create(input: TeamApplicationInput): TeamApplication {
    if (input.name.trim().length === 0) {
      throw new Error('Team name must not be empty.');
    }
    if (input.managerIds.length === 0) {
      throw new Error('At least one team manager is required.');
    }
    if (!Number.isInteger(input.playersPerTeam) || input.playersPerTeam < 1) {
      throw new Error('Players per team must be a positive integer.');
    }
    return new TeamApplication(input);
  }

  addVerifiedPlayer(player: VerifiedPlayer): void {
    if (this.status !== 'DRAFT' && this.status !== 'CHANGES_REQUESTED') {
      throw new Error('Players cannot be changed after submission.');
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
}