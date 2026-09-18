import type { SqliteDatabase } from '../database.js';
import type {
  TournamentBracketSource,
  TournamentCompletionRecord,
  TournamentCompletionStore,
} from '../../../application/ports/tournament-standings.js';
import type { StandingMatch } from '../../../domain/tournament/standings.js';

type TournamentRow = {
  readonly id: string;
  readonly guildId: string;
  readonly title: string;
  readonly status: string;
  readonly format: string;
};

type MatchRow = {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly teamAId: string | null;
  readonly teamBId: string | null;
  readonly winnerTeamId: string | null;
  readonly status: string;
};

/**
 * SQLite read/write model backing tournament completion and the consultable recap. It exposes the
 * persisted bracket as domain standings matches and lets the completion use case flip the
 * tournament status to `COMPLETED` (FR-023, FR-027).
 */
export class SqliteTournamentStandingsRepository implements TournamentCompletionStore, TournamentBracketSource {
  constructor(private readonly database: SqliteDatabase) {}

  async findById(id: string): Promise<TournamentCompletionRecord | null> {
    const row = this.database
      .prepare('SELECT id, guildId, title, status, format FROM Tournament WHERE id = ?')
      .get(id) as TournamentRow | undefined;
    if (row === undefined) return null;
    return {
      id: row.id,
      guildId: row.guildId,
      name: row.title,
      status: row.status,
      format: row.format,
    };
  }

  async save(tournament: TournamentCompletionRecord): Promise<TournamentCompletionRecord> {
    this.database
      .prepare('UPDATE Tournament SET status = ?, updatedAt = ? WHERE id = ?')
      .run(tournament.status, new Date().toISOString(), tournament.id);
    return tournament;
  }

  async listMatches(tournamentId: string): Promise<readonly StandingMatch[]> {
    const rows = this.database
      .prepare(`
        SELECT
          MatchRecord.id AS matchId,
          Round.indexNumber AS roundNumber,
          MatchRecord.homeTeamApplicationId AS teamAId,
          MatchRecord.awayTeamApplicationId AS teamBId,
          MatchRecord.winnerTeamApplicationId AS winnerTeamId,
          MatchRecord.status AS status
        FROM MatchRecord
        JOIN Round ON Round.id = MatchRecord.roundId
        WHERE MatchRecord.tournamentId = ?
        ORDER BY Round.indexNumber ASC, MatchRecord.createdAt ASC, MatchRecord.id ASC
      `)
      .all(tournamentId) as MatchRow[];

    const matches: StandingMatch[] = [];
    for (const row of rows) {
      if (row.teamAId === null) continue;
      matches.push({
        matchId: row.matchId,
        roundNumber: row.roundNumber,
        teamAId: row.teamAId,
        teamBId: row.teamBId,
        winnerTeamId: row.winnerTeamId,
        status: row.status,
      });
    }
    return matches;
  }

  async listTeamNames(tournamentId: string): Promise<readonly { readonly id: string; readonly name: string }[]> {
    return this.database
      .prepare('SELECT id, name FROM TeamApplication WHERE tournamentId = ? ORDER BY id ASC')
      .all(tournamentId) as Array<{ id: string; name: string }>;
  }
}