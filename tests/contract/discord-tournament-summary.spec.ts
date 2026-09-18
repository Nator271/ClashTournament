import { describe, expect, it } from 'vitest';

import { presentFinalTournament } from '../../src/adapters/discord/presenters/final-tournament-presenter.js';

describe('US5 Discord tournament summary contract', () => {
  it('renders winner, ranking, rounds and read-only public status', () => {
    const presentation = presentFinalTournament({ name: 'Winter Clash', status: 'COMPLETED', winnerTeamId: 'team-a', ranking: [{ teamId: 'team-a', position: 1 }, { teamId: 'team-b', position: 2 }], rounds: [{ number: 1, summary: 'Final resolved' }] });
    expect(presentation.title).toBe('Winter Clash');
    expect(presentation.description).toMatch(/team-a/);
    expect(presentation.description).toMatch(/read-only/i);
  });
});
