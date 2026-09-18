export type BrandedId<T> = string & {
  readonly __brand: T;
};

export function createBrandedId<T>(value: string): BrandedId<T> {
  if (value.trim().length === 0) {
    throw new Error('Branded identifier must not be empty.');
  }

  return value as BrandedId<T>;
}

export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}
