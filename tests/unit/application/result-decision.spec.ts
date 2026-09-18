import { describe, expect, it } from 'vitest';

import { AuthorizationService } from '../../../src/application/services/authorization-service.js';
import { ResultDecision } from '../../../src/application/use-cases/staff/result-decision.js';

describe('US4 staff result decisions', () => {
  it('requires staff permission and a reason, then records resolution', async () => {
    let status = 'CONTESTED';
    const auditActions: string[] = [];
    const decision = new ResultDecision(
      { getStatus: async () => status, setStatus: async (_matchId, next) => { status = next; } },
      new AuthorizationService({ staffRoleId: 'staff' }),
      { append: async (entry) => { auditActions.push(entry.action); return { ...entry, id: 'audit-1', createdAt: new Date() }; }, listForTournament: async () => [] },
    );
    await expect(decision.execute({ context: { guildId: 'guild-1', userId: 'user', roleIds: [], isAdmin: false }, matchId: 'match-1', action: 'VALIDATE', reason: 'ok' })).rejects.toThrow(/role|permission/i);
    await expect(decision.execute({ context: { guildId: 'guild-1', userId: 'staff', roleIds: ['staff'], isAdmin: false }, matchId: 'match-1', action: 'CORRECT', reason: '' })).rejects.toThrow(/reason/i);
    await decision.execute({ context: { guildId: 'guild-1', userId: 'staff', roleIds: ['staff'], isAdmin: false }, matchId: 'match-1', action: 'ASSIGN_RESULT', reason: 'Manual review' });
    expect(status).toBe('RESOLVED');
    expect(auditActions).toEqual(['match.result.assign_result']);
  });
});
