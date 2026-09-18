import { describe, expect, it } from 'vitest';

import { canAdvanceRound } from '../../../src/domain/match/round.js';
import { createMatch, confirmMatchSchedule, proposeMatchSchedule } from '../../../src/domain/match/match.js';

describe('round progression and match scheduling', () => {
  it('requires every match to be resolved or staff-decided', () => {
    expect(canAdvanceRound(['RESOLVED', 'STAFF_DECIDED'])).toBe(true);
    expect(canAdvanceRound(['RESOLVED', 'AWAITING_RESULT'])).toBe(false);
    expect(canAdvanceRound([])).toBe(false);
  });

  it('models byes and requires both managers to confirm a schedule', () => {
    const bye = createMatch({ id: 'bye-1', teamAId: 'team-a', teamBId: null, deadline: new Date('2026-10-01T00:00:00Z') });
    expect(bye.isBye).toBe(true);
    const match = createMatch({ id: 'match-1', teamAId: 'team-a', teamBId: 'team-b', deadline: new Date('2026-10-01T00:00:00Z') });
    const proposed = proposeMatchSchedule(match, new Date('2026-09-25T18:00:00Z'), 'manager-a');
    expect(proposed.scheduleProposedBy).toBe('manager-a');
    expect(() => confirmMatchSchedule(proposed, 'manager-a')).toThrow(/other manager/i);
    const confirmed = confirmMatchSchedule(proposed, 'manager-b');
    expect(confirmed.status).toBe('ACTIVE');
  });
});
