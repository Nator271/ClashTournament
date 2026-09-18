export type RuntimeConfig = {
  readonly DISCORD_TOKEN: string;
  readonly DISCORD_CLIENT_ID: string;
  readonly CLASH_API_TOKEN: string;
  readonly DATABASE_PATH: string;
};

function normalizeEnvValue(name: string): string {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const normalized = value.trim();
  if (normalized.includes('\n') || normalized.includes('\r')) {
    throw new Error(`Environment variable ${name} contains unexpected line breaks.`);
  }

  return normalized;
}

function requireEnv(name: string): string {
  const value = normalizeEnvValue(name);

  if (name === 'DISCORD_CLIENT_ID' && !/^\d+$/.test(value)) {
    throw new Error(`Environment variable DISCORD_CLIENT_ID must be a numeric application ID.`);
  }

  if (name === 'DATABASE_PATH' && value.trim() === '') {
    throw new Error('Environment variable DATABASE_PATH must not be blank.');
  }

  return value;
}

export function loadRuntimeConfig(_overrides: Partial<Record<string, string>> = {}): RuntimeConfig {
  return {
    DISCORD_TOKEN: requireEnv('DISCORD_TOKEN'),
    DISCORD_CLIENT_ID: requireEnv('DISCORD_CLIENT_ID'),
    CLASH_API_TOKEN: requireEnv('CLASH_API_TOKEN'),
    DATABASE_PATH: requireEnv('DATABASE_PATH'),
  };
}
