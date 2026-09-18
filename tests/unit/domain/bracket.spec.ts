import { describe, expect, it } from 'vitest';

import { generateFirstRound } from '../../../src/domain/match/bracket.js';

describe('single-elimination bracket', () => {
  it('pairs accepted teams and creates an explicit bye without a fake match', () => {
    const matches = generateFirstRound(['a', 'b', 'c'], () => 0.999);

    expect(matches).toEqual([
      { teamAId: 'a', teamBId: 'b' },
      { teamAId: 'c', teamBId: null },
    ]);
  });

  it('does not mutate the accepted team input', () => {
    const teams = ['a', 'b', 'c', 'd'];
    generateFirstRound(teams, () => 0.5);
    expect(teams).toEqual(['a', 'b', 'c', 'd']);
  });
});