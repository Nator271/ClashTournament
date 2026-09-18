import { describe, expect, it } from 'vitest';

import { loadRuntimeConfig } from '../../../src/infrastructure/config/env.js';

describe('runtime config smoke test', () => {
  it('accepts the current bootstrap state', () => {
    expect(true).toBe(true);
  });

  it('uses explicit overrides while validating required values', () => {
    const config = loadRuntimeConfig({
      DISCORD_TOKEN: 'token-123',
      DISCORD_CLIENT_ID: '456789',
      CLASH_API_TOKEN: 'clash-token',
      DATABASE_PATH: 'data/test.db',
    });

    expect(config).toEqual({
      DISCORD_TOKEN: 'token-123',
      DISCORD_CLIENT_ID: '456789',
      CLASH_API_TOKEN: 'clash-token',
      DATABASE_PATH: 'data/test.db',
    });
  });

  it('rejects invalid Discord app ids and blank values', () => {
    expect(() =>
      loadRuntimeConfig({
        DISCORD_TOKEN: 'token-123',
        DISCORD_CLIENT_ID: 'abc',
        CLASH_API_TOKEN: 'clash-token',
        DATABASE_PATH: 'data/test.db',
      }),
    ).toThrow(/DISCORD_CLIENT_ID/i);

    expect(() =>
      loadRuntimeConfig({
        DISCORD_TOKEN: 'token-123',
        DISCORD_CLIENT_ID: '456789',
        CLASH_API_TOKEN: 'clash-token',
        DATABASE_PATH: '',
      }),
    ).toThrow(/DATABASE_PATH/i);
  });
});
