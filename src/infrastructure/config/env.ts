export type RuntimeConfig = {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  CLASH_API_TOKEN: string;
  DATABASE_PATH: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    DISCORD_TOKEN: requireEnv('DISCORD_TOKEN'),
    DISCORD_CLIENT_ID: requireEnv('DISCORD_CLIENT_ID'),
    CLASH_API_TOKEN: requireEnv('CLASH_API_TOKEN'),
    DATABASE_PATH: requireEnv('DATABASE_PATH'),
  };
}
