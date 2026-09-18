import { describe, expect, it } from 'vitest';

import {
  DISCORD_EMBED_DESCRIPTION_LIMIT,
  DISCORD_MESSAGE_CONTENT_LIMIT,
  presentFinalTournament,
  presentTournamentStatus,
} from '../../src/adapters/discord/presenters/final-tournament-presenter.js';
import { parseFinalTournamentAnnouncement } from '../../src/adapters/discord/outbox-payload.js';
import { TournamentStatusService } from '../../src/adapters/discord/tournament-status-adapter.js';
import { GetTournamentSummary } from '../../src/application/use-cases/get-tournament-summary.js';
import { TournamentStatus } from '../../src/domain/tournament/tournament.js';

const completedRecap = {
  name: 'Winter Clash',
  status: TournamentStatus.COMPLETED,
  format: 'SINGLE_ELIMINATION',
  winnerTeamId: 'team-a',
  ranking: [
    { position: 1, teamId: 'team-a', isWinner: true },
    { position: 2, teamId: 'team-c' },
    { position: 3, teamId: 'team-b' },
  ],
  isRankingAvailable: true,
  rounds: [
    {
      number: 1,
      matches: [
        { matchId: 'match-1', teamAId: 'team-a', teamBId: 'team-b', winnerTeamId: 'team-a', status: 'RESOLVED' },
        { matchId: 'match-2', teamAId: 'team-c', teamBId: 'team-d', winnerTeamId: 'team-c', status: 'RESOLVED' },
      ],
    },
    {
      number: 2,
      matches: [{ matchId: 'match-3', teamAId: 'team-a', teamBId: 'team-c', winnerTeamId: 'team-a', status: 'RESOLVED' }],
    },
  ],
  teamNames: { 'team-a': 'Alpha', 'team-b': 'Bravo', 'team-c': 'Charlie', 'team-d': 'Delta' },
} as const;

describe('US5 Discord tournament summary contract', () => {
  it('renders the winner, the available ranking, round results and the public status', () => {
    const presentation = presentFinalTournament(completedRecap);

    expect(presentation.title).toBe('Winter Clash — final results');
    expect(presentation.readOnly).toBe(true);
    expect(presentation.color).toBe(0x27ae60);
    expect(presentation.description).toContain('Winner: Alpha');
    expect(presentation.description).toContain('1. Alpha');
    expect(presentation.description).toContain('2. Charlie');
    expect(presentation.description).toContain('3. Bravo');
    expect(presentation.description).toContain('Round 1: Alpha beat Bravo | Charlie beat Delta');
    expect(presentation.description).toContain('Round 2: Alpha beat Charlie');
    expect(presentation.description).toContain(`status: ${TournamentStatus.COMPLETED}`);
    expect(presentation.description).toMatch(/read-only/i);
  });

  it('announces an undetermined winner and no ranking while the bracket is unfinished', () => {
    const presentation = presentFinalTournament({
      name: 'Winter Clash',
      status: TournamentStatus.IN_PROGRESS,
      ranking: [],
      isRankingAvailable: false,
      rounds: [],
    });

    expect(presentation.description).toContain('Winner: undetermined');
    expect(presentation.description).toContain('Final ranking: not available yet.');
    expect(presentation.description).toContain('Round results: no match has been played yet.');
    expect(presentation.readOnly).toBe(false);
  });

  it('renders an ephemeral status recap without requiring a new registration', () => {
    const status = presentTournamentStatus(completedRecap);

    expect(status.ephemeral).toBe(true);
    expect(status.content).toContain('Winter Clash — status: COMPLETED');
    expect(status.content).toContain('Registrations are closed');
    expect(status.content.length).toBeLessThanOrEqual(DISCORD_MESSAGE_CONTENT_LIMIT);
  });

  it('keeps the embed within the Discord description limit and drops unknown payload fields', () => {
    const largeRecap = {
      ...completedRecap,
      rounds: Array.from({ length: 200 }, (_, index) => ({
        number: index + 1,
        matches: [
          { matchId: `match-${index}`, teamAId: 'team-a', teamBId: 'team-b', winnerTeamId: 'team-a', status: 'RESOLVED' },
        ],
      })),
    };

    const presentation = presentFinalTournament(largeRecap);
    expect(presentation.description.length).toBeLessThanOrEqual(DISCORD_EMBED_DESCRIPTION_LIMIT);

    const parsed = parseFinalTournamentAnnouncement({
      name: 'Winter Clash',
      winnerTeamId: 'team-a',
      ranking: [{ position: 1, teamId: 'team-a', isWinner: true }],
      unknownSecret: 'should-be-dropped',
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe(TournamentStatus.COMPLETED);
    expect(JSON.stringify(parsed)).not.toContain('should-be-dropped');
  });

  it('rejects a malformed final announcement payload', () => {
    expect(parseFinalTournamentAnnouncement({ winnerTeamId: 'team-a' })).toBeNull();
  });

  it('serves the ephemeral recap from the summary use case without a new registration', async () => {
    const service = new TournamentStatusService(
      new GetTournamentSummary({
        tournaments: {
          findById: async (id) =>
            id === 'tournament-1'
              ? {
                  id: 'tournament-1',
                  guildId: 'guild-1',
                  name: 'Winter Clash',
                  status: TournamentStatus.COMPLETED,
                  format: 'SINGLE_ELIMINATION',
                }
              : null,
          save: async (tournament) => tournament,
        },
        bracket: {
          listMatches: async () => [
            { matchId: 'match-1', roundNumber: 1, teamAId: 'team-a', teamBId: 'team-b', winnerTeamId: 'team-a', status: 'RESOLVED' },
          ],
          listTeamNames: async () => [
            { id: 'team-a', name: 'Alpha' },
            { id: 'team-b', name: 'Bravo' },
          ],
        },
      }),
    );

    const recap = await service.describe({ tournamentId: 'tournament-1', guildId: 'guild-1' });
    expect(recap.ephemeral).toBe(true);
    expect(recap.content).toContain('Winner: Alpha');
    expect(recap.content).toContain('1. Alpha');
    expect(recap.content).toContain('Round 1: Alpha beat Bravo');
    expect(recap.content).toMatch(/read-only/i);

    expect((await service.describe({})).content).toMatch(/tournament id is required/i);
    expect((await service.describe({ tournamentId: 'unknown' })).content).toMatch(/not found/i);
  });
});

