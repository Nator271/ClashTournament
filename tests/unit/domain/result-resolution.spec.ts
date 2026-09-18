import { describe, expect, it } from 'vitest';

import { compareSubmissions, validateSubmission } from '../../../src/domain/result/tiebreaker.js';

describe('result resolution', () => {
  it('validates the player-count star bound and statistic bounds', () => {
    expect(() => validateSubmission({ stars: 7, playersPerTeam: 2 })).toThrow();
    expect(() => validateSubmission({ stars: 3, playersPerTeam: 2, destructionPercent: 101 })).toThrow();
    expect(() => validateSubmission({ stars: 3, playersPerTeam: 2, attackMinutes: 3.1 })).toThrow();
  });

  it('compares stars, then destruction, then lower attack time', () => {
    const first = { stars: 3, destructionPercent: 80, attackMinutes: 2.4 };
    const second = { stars: 3, destructionPercent: 80, attackMinutes: 2.5 };

    expect(compareSubmissions(first, second)).toBe(1);
    expect(compareSubmissions({ stars: 4 }, second)).toBe(1);
    expect(compareSubmissions({ stars: 3, destructionPercent: 81 }, second)).toBe(1);
    expect(compareSubmissions(first, second)).toBe(1);
    expect(compareSubmissions(first, { stars: 3, destructionPercent: 80, attackMinutes: 2.4 })).toBe(0);
  });
});