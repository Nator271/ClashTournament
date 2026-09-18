export type RuntimeConfig = {
  readonly DISCORD_TOKEN: string;
  readonly DISCORD_CLIENT_ID: string;
  readonly CLASH_API_TOKEN: string;
  readonly DATABASE_PATH: string;
};

function normalizeValue(name: string, value: string | undefined): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const normalized = value.trim();
  if (normalized.includes('\n') || normalized.includes('\r')) {
    throw new Error(`Environment variable ${name} contains unexpected line breaks.`);
  }

  return normalized;
}

function getRequiredValue(name: string, overrides: Partial<Record<string, string>>): string {
  const overrideValue = overrides[name];
  if (overrideValue !== undefined) {
    return normalizeValue(name, overrideValue);
  }

  return normalizeValue(name, process.env[name]);
}

function requireEnv(name: string, overrides: Partial<Record<string, string>>): string {
  const value = getRequiredValue(name, overrides);

  if (name === 'DISCORD_CLIENT_ID' && !/^\d+$/.test(value)) {
    throw new Error(`Environment variable DISCORD_CLIENT_ID must be a numeric application ID.`);
  }

  if (name === 'DATABASE_PATH' && value.trim() === '') {
    throw new Error('Environment variable DATABASE_PATH must not be blank.');
  }

  return value;
}

export function loadRuntimeConfig(overrides: Partial<Record<string, string>> = {}): RuntimeConfig {
  return {
    DISCORD_TOKEN: requireEnv('DISCORD_TOKEN', overrides),
    DISCORD_CLIENT_ID: requireEnv('DISCORD_CLIENT_ID', overrides),
    CLASH_API_TOKEN: requireEnv('CLASH_API_TOKEN', overrides),
    DATABASE_PATH: requireEnv('DATABASE_PATH', overrides),
  };
}
