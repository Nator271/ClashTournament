export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export type TournamentFormatStrategy = {
  readonly name: string;
  isSupported(format: TournamentFormat): boolean;
};

export class SingleEliminationFormatStrategy implements TournamentFormatStrategy {
  readonly name = 'single_elimination';

  isSupported(format: TournamentFormat): boolean {
    return format === TournamentFormat.SINGLE_ELIMINATION;
  }
}

export type TournamentCreateInput = {
  id: string;
  guildId: string;
  name: string;
  organizerUserId: string;
  playersPerTeam: number;
  registrationStartsAt: Date;
  registrationEndsAt: Date;
  roundDurationMinutes: number;
  format: TournamentFormat;
  createdAt: Date;
  strategy: TournamentFormatStrategy;
};

export class Tournament {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly organizerUserId: string;
  readonly playersPerTeam: number;
  readonly registrationStartsAt: Date;
  readonly registrationEndsAt: Date;
  readonly roundDurationMinutes: number;
  readonly format: TournamentFormat;
  readonly createdAt: Date;
  readonly strategy: TournamentFormatStrategy;
  readonly status: TournamentStatus;
  readonly formattedFormat: string;

  private constructor(input: TournamentCreateInput) {
    this.id = input.id;
    this.guildId = input.guildId;
    this.name = input.name;
    this.organizerUserId = input.organizerUserId;
    this.playersPerTeam = input.playersPerTeam;
    this.registrationStartsAt = input.registrationStartsAt;
    this.registrationEndsAt = input.registrationEndsAt;
    this.roundDurationMinutes = input.roundDurationMinutes;
    this.format = input.format;
    this.createdAt = input.createdAt;
    this.strategy = input.strategy;
    this.status = TournamentStatus.DRAFT;
    this.formattedFormat = input.strategy.name;
  }

  static create(input: TournamentCreateInput): Tournament {
    if (!Number.isInteger(input.playersPerTeam) || input.playersPerTeam < 1 || input.playersPerTeam > 10) {
      throw new Error('Tournament playersPerTeam must be an integer between 1 and 10.');
    }

    if (input.registrationStartsAt >= input.registrationEndsAt) {
      throw new Error('Tournament registration start must be before registration end.');
    }

    if (input.roundDurationMinutes <= 0) {
      throw new Error('Tournament round duration must be greater than zero minutes.');
    }

    if (!input.strategy.isSupported(input.format)) {
      throw new Error(`Tournament format ${input.format} is not supported by the configured strategy.`);
    }

    return new Tournament(input);
  }

  canAcceptApplications(referenceDate: Date): boolean {
    return (
      this.status === TournamentStatus.REGISTRATION_OPEN &&
      referenceDate >= this.registrationStartsAt &&
      referenceDate <= this.registrationEndsAt
    );
  }
}
