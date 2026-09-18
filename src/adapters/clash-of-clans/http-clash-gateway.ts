import type {
  ClashGatewayResult,
  ClashOfClansGateway,
  ClashPlayerVerification,
} from '../../application/ports/clash-of-clans-gateway.js';

type ClashApiPlayer = {
  readonly name?: unknown;
  readonly townHallLevel?: unknown;
  readonly tag?: unknown;
};

type CachedResult = {
  readonly expiresAt: number;
  readonly result: ClashGatewayResult;
};

export type ClashGatewayOptions = {
  readonly token: string;
  readonly baseUrl?: string;
  readonly fetcher?: typeof fetch;
  readonly now?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly requestsPerSecond?: number;
  readonly maxConcurrency?: number;
  readonly queueCapacity?: number;
  readonly timeoutMs?: number;
};

export class HttpClashOfClansGateway implements ClashOfClansGateway {
  private readonly cache = new Map<string, CachedResult>();
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private activeRequests = 0;
  private lastRequestAt = 0;
  private readonly queue: Array<{ tag: string; resolve: (result: ClashGatewayResult) => void; reject: (error: unknown) => void }> = [];

  constructor(private readonly options: ClashGatewayOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async verifyPlayer(tag: string): Promise<ClashGatewayResult> {
    const normalizedTag = normalizeTag(tag);
    if (normalizedTag === null) {
      return { kind: 'invalid-tag', reason: 'The Clash of Clans tag format is invalid.' };
    }
    if (this.options.token.trim().length === 0) {
      return { kind: 'configuration-error', reason: 'The Clash of Clans service is not configured.' };
    }

    const cached = this.cache.get(normalizedTag);
    if (cached !== undefined && cached.expiresAt > this.now()) return cached.result;
    if (this.queue.length >= (this.options.queueCapacity ?? 100)) return { kind: 'rate-limited', retryAfterMs: 1000 };
    return new Promise((resolve, reject) => {
      this.queue.push({ tag: normalizedTag, resolve, reject });
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    const maxConcurrency = this.options.maxConcurrency ?? 4;
    while (this.activeRequests < maxConcurrency && this.queue.length > 0) {
      const request = this.queue.shift();
      if (request === undefined) return;
      this.activeRequests += 1;
      void this.process(request).finally(() => {
        this.activeRequests -= 1;
        void this.pump();
      });
    }
  }

  private async process(request: { tag: string; resolve: (result: ClashGatewayResult) => void; reject: (error: unknown) => void }): Promise<void> {
    try {
      await this.waitForRateLimit();
      const result = await this.fetchPlayer(request.tag);
      if (result.kind === 'verified' || result.kind === 'not-found') {
        this.cache.set(request.tag, { result, expiresAt: this.now() + (result.kind === 'verified' ? 600_000 : 30_000) });
      }
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
  }

  private async fetchPlayer(tag: string): Promise<ClashGatewayResult> {
    const url = `${this.options.baseUrl ?? 'https://api.clashofclans.com'}/v1/players/${encodeURIComponent(tag)}`;
    let lastResult: ClashGatewayResult = {
      kind: 'temporarily-unavailable',
      reason: 'The Clash of Clans service is temporarily unavailable.',
    };

    for (let attempt = 0; attempt <= 2; attempt += 1) {
      try {
        const response = await this.fetcher(url, {
          headers: { Authorization: `Bearer ${this.options.token}` },
          signal: AbortSignal.timeout(this.options.timeoutMs ?? 8000),
        });
        if (response.status === 404) {
          return { kind: 'not-found', reason: 'The Clash of Clans player was not found.' };
        }
        if (response.status === 429) {
          lastResult = { kind: 'rate-limited', retryAfterMs: retryAfter(response) };
        } else if (response.status >= 500) {
          lastResult = { kind: 'temporarily-unavailable', reason: 'The Clash of Clans service returned an error.' };
        } else if (!response.ok) {
          return { kind: 'invalid-tag', reason: 'The Clash of Clans tag could not be verified.' };
        } else {
          const payload: unknown = await response.json();
          return parsePlayer(payload);
        }
      } catch {
        lastResult = {
          kind: 'temporarily-unavailable',
          reason: 'The Clash of Clans service did not respond in time.',
        };
      }
      if (attempt < 2) await this.sleep(100 * 2 ** attempt);
    }
    return lastResult;
  }

  private async waitForRateLimit(): Promise<void> {
    const elapsed = this.now() - this.lastRequestAt;
    const interval = 1000 / (this.options.requestsPerSecond ?? 8);
    if (elapsed < interval) await this.sleep(interval - elapsed);
    this.lastRequestAt = this.now();
  }

  private sleep(milliseconds: number): Promise<void> {
    return (this.options.sleep ?? delay)(milliseconds);
  }
}

function normalizeTag(tag: string): string | null {
  const normalized = tag.trim().toUpperCase();
  return /^#[A-Z0-9]{3,15}$/.test(normalized) ? normalized : null;
}

function parsePlayer(payload: unknown): ClashGatewayResult {
  if (!isPlayer(payload)) {
    return { kind: 'temporarily-unavailable', reason: 'The Clash response was not understood.' };
  }
  const player: ClashPlayerVerification = {
    tag: String(payload.tag),
    displayName: String(payload.name),
    townHallLevel: Number(payload.townHallLevel),
    normalizedTag: String(payload.tag).trim().toUpperCase(),
    verifiedAt: new Date(),
    source: 'clash-api',
  };
  return { kind: 'verified', player };
}

function retryAfter(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) ? Math.min(Math.max(seconds * 1000, 0), 8000) : 1000;
}

function isPlayer(payload: unknown): payload is Required<ClashApiPlayer> {
  if (typeof payload !== 'object' || payload === null) return false;
  const player = payload as ClashApiPlayer;
  return typeof player.tag === 'string' && typeof player.name === 'string' &&
    typeof player.townHallLevel === 'number' && Number.isInteger(player.townHallLevel);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}