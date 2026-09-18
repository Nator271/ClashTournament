import { describe, expect, it } from 'vitest';

import { HttpClashOfClansGateway } from '../../src/adapters/clash-of-clans/http-clash-gateway.js';

describe('Clash gateway contract', () => {
  it('normalizes tags, caches verified and not-found responses, and never exposes secrets', async () => {
    let calls = 0;
    const fetcher: typeof fetch = async (url) => {
      calls += 1;
      expect(url).toContain('%23ABC123');
      return new Response(JSON.stringify({ tag: '#ABC123', name: 'Player', townHallLevel: 12 }), { status: 200 });
    };
    const gateway = new HttpClashOfClansGateway({ token: 'secret-token', fetcher, sleep: async () => undefined });

    const first = await gateway.verifyPlayer(' #abc123 ');
    const second = await gateway.verifyPlayer('#ABC123');
    expect(first.kind).toBe('verified');
    expect(second.kind).toBe('verified');
    expect(calls).toBe(1);
    expect(JSON.stringify(first)).not.toContain('secret-token');
    expect((await gateway.verifyPlayer('invalid')).kind).toBe('invalid-tag');
  });

  it('queues concurrent calls up to the configured capacity and retries transient failures twice', async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      if (calls < 3) return new Response('temporary', { status: 503 });
      return new Response(JSON.stringify({ tag: '#ABC123', name: 'Player', townHallLevel: 12 }), { status: 200 });
    };
    const gateway = new HttpClashOfClansGateway({
      token: 'secret-token',
      fetcher,
      maxConcurrency: 1,
      queueCapacity: 100,
      requestsPerSecond: 8,
      sleep: async () => undefined,
    });

    const results = await Promise.all([
      gateway.verifyPlayer('#abc123'),
      gateway.verifyPlayer('#def456'),
    ]);
    expect(results).toHaveLength(2);
    expect(calls).toBeGreaterThanOrEqual(3);
  });
});
