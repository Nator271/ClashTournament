export type RepositoryError = {
  readonly code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID_INPUT';
  readonly message: string;
};

export type PersistedEntity = {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type TournamentRepository<T> = {
  save(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  listForGuild(guildId: string): Promise<T[]>;
};

export type ApplicationRepository<T> = {
  save(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  findByTournamentId(tournamentId: string): Promise<T[]>;
};
