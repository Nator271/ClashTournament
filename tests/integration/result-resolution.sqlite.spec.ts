import { describe, expect, it } from 'vitest';

import { ResultResolutionService } from '../../src/application/use-cases/match-results/index.js';
import { ResultSubmission } from '../../src/domain/result/result-submission.js';

describe('result resolution integration', () => {
  it('accepts one-sided results, flags contradictions and blocks progression until staff resolution', async () => {
    const results = new Map<string, ResultSubmission>();
    let matchStatus = 'AWAITING_RESULT';
    const service = new ResultResolutionService({
      results: { save: async (id, result) => { results.set(id, result); return result; }, listForMatch: async () => [...results.values()] },
      matches: { getStatus: async () => matchStatus, setStatus: async (_matchId, status) => { matchStatus = status; } },
      audit: { append: async (entry: Record<string, unknown>) => ({ ...entry, id: 'audit-1', createdAt: new Date(), guildId: 'guild-1', action: 'result', payload: {} }), listForTournament: async () => [] },
    });
    await service.submit({ matchId: 'match-1', teamId: 'team-a', playersPerTeam: 1, statistics: { stars: 3 }, submittedBy: 'manager-a' });
    await service.submit({ matchId: 'match-1', teamId: 'team-b', playersPerTeam: 1, statistics: { stars: 2 }, submittedBy: 'manager-b' });
    expect(matchStatus).toBe('RESOLVED');
    await service.submit({ matchId: 'match-1', teamId: 'team-a', playersPerTeam: 1, statistics: { stars: 3, destructionPercent: 90 }, submittedBy: 'manager-a' });
    expect(matchStatus).toBe('CONTESTED');
  });
});