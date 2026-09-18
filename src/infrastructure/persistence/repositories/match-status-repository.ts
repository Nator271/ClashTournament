import type { SqliteDatabase } from '../database.js';
import type { MatchResultStatusStore } from '../../../application/use-cases/match-results/index.js';

type MatchStatusRow = {
  readonly status: string;
  readonly winnerTeamApplicationId: string | null;
};

/**
 * SQLite adapter that lets result submission and staff decisions move a match status forward while
 * recording the winning team, which the final standings and the tournament completion depend on.
 */
export class SqliteMatchStatusStore implements MatchResultStatusStore {
  constructor(private readonly database: SqliteDatabase) {}

  async getStatus(matchId: string): Promise<string> {
    const row = this.database
      .prepare('SELECT status, winnerTeamApplicationId FROM MatchRecord WHERE id = ?')
      .get(matchId) as MatchStatusRow | undefined;
    if (row === undefined) throw new Error('Match not found.');
    return row.status;
  }

  async setStatus(
    matchId: string,
    status: 'AWAITING_RESULT' | 'RESOLVED' | 'CONTESTED',
    winnerTeamId?: string | null,
  ): Promise<void> {
    const existing = this.database
      .prepare('SELECT status, winnerTeamApplicationId FROM MatchRecord WHERE id = ?')
      .get(matchId) as MatchStatusRow | undefined;
    if (existing === undefined) throw new Error('Match not found.');

    const winner = winnerTeamId === undefined ? existing.winnerTeamApplicationId : winnerTeamId;
    this.database
      .prepare('UPDATE MatchRecord SET status = ?, winnerTeamApplicationId = ?, updatedAt = ? WHERE id = ?')
      .run(status, winner, new Date().toISOString(), matchId);
  }
}