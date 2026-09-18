export type BrandedId<T> = string & {
  readonly __brand: T;
};

export type Clock = {
  now(): Date;
};

export type DomainErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'TIMEOUT';

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function createBrandedId<T>(value: string): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new DomainError('INVALID_INPUT', 'Branded identifier must not be empty.');
  }

  return value as BrandedId<T>;
}

export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

export function requireNonEmptyString(value: string, fieldName: string): string {
  const trimmed = value.trim();

  if (!isNonEmptyString(trimmed)) {
    throw new DomainError('INVALID_INPUT', `${fieldName} must not be empty.`);
  }

  return trimmed;
}
