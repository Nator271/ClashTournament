export type ClashPlayerVerification = {
  readonly tag: string;
  readonly displayName: string;
  readonly townHallLevel: number;
  readonly normalizedTag?: string;
  readonly verifiedAt?: Date;
  readonly source?: string;
};

export type ClashGatewayResult =
  | { readonly kind: 'verified'; readonly player: ClashPlayerVerification }
  | { readonly kind: 'invalid-tag'; readonly reason: string }
  | { readonly kind: 'not-found'; readonly reason: string }
  | { readonly kind: 'rate-limited'; readonly retryAfterMs: number }
  | { readonly kind: 'temporarily-unavailable'; readonly reason: string }
  | { readonly kind: 'configuration-error'; readonly reason: string };

export type ClashOfClansGateway = {
  verifyPlayer(tag: string): Promise<ClashGatewayResult>;
};
