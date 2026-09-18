import type { DomainError } from '../../domain/shared/index.js';

export type UserFacingError = {
  readonly message: string;
  readonly reference?: string;
};

export function mapError(error: unknown, reference?: string): UserFacingError {
  if (isDomainError(error)) {
    return { message: error.message, ...(reference === undefined ? {} : { reference }) };
  }

  return {
    message: 'The action could not be completed. Please try again or contact the staff.',
    ...(reference === undefined ? {} : { reference }),
  };
}

function isDomainError(error: unknown): error is DomainError {
  return error instanceof Error && error.name === 'DomainError';
}