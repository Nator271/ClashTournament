import type { SqliteDatabase } from '../database.js';
import { TeamApplication } from '../../../domain/team/team-application.js';
import type { TeamApplicationStore } from '../../../application/use-cases/team-application/index.js';

export class SqliteTeamApplicationRepository implements TeamApplicationStore {
  constructor(private readonly database: SqliteDatabase) {}

  async save(application: TeamApplication): Promise<TeamApplication> {
    const transaction = this.database.transaction(() => {
      const existing = this.database.prepare('SELECT status FROM TeamApplication WHERE id = ?').get(application.id) as { status: string } | undefined;
      if (existing?.status === 'ACCEPTED' && application.status !== 'ACCEPTED') throw new Error('Accepted applications are immutable.');
      if (existing?.status === 'ACCEPTED') {
        const previous = this.database.prepare('SELECT tag, displayName, townHallLevel FROM VerifiedPlayer WHERE teamApplicationId = ? ORDER BY tag').all(application.id) as Array<{ tag: string; displayName: string; townHallLevel: number }>;
        const next = application.players.map((player) => ({ tag: player.tag.toUpperCase(), displayName: player.displayName, townHallLevel: player.townHallLevel })).sort((left, right) => left.tag.localeCompare(right.tag));
        if (JSON.stringify(previous) !== JSON.stringify(next)) throw new Error('Accepted applications are immutable.');
      }
      const now = new Date().toISOString();
      this.database.prepare(`INSERT INTO TeamApplication (id, tournamentId, name, createdByUserId, status, createdAt, updatedAt, version) VALUES (?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET name = excluded.name, status = excluded.status, updatedAt = excluded.updatedAt, version = TeamApplication.version + 1`).run(application.id, application.tournamentId, application.name, application.managerIds[0] ?? '', application.status, now, now);
      this.database.prepare('DELETE FROM TeamManager WHERE teamApplicationId = ?').run(application.id);
      for (const managerId of application.managerIds) {
        this.database.prepare('INSERT INTO TeamManager (id, teamApplicationId, discordUserId, createdAt) VALUES (?, ?, ?, ?)').run(`${application.id}:${managerId}`, application.id, managerId, now);
      }
      this.database.prepare('DELETE FROM VerifiedPlayer WHERE teamApplicationId = ?').run(application.id);
      for (const player of application.players) {
        this.database.prepare('INSERT INTO VerifiedPlayer (id, teamApplicationId, tournamentId, tag, displayName, townHallLevel, verifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(`${application.id}:${player.tag}`, application.id, application.tournamentId, player.tag.toUpperCase(), player.displayName, player.townHallLevel, (player.verifiedAt ?? new Date()).toISOString());
      }
    });
    transaction();
    return application;
  }

  async findById(id: string): Promise<TeamApplication | null> {
    const row = this.database.prepare('SELECT * FROM TeamApplication WHERE id = ?').get(id) as { id: string; tournamentId: string; name: string; status: string; createdByUserId: string } | undefined;
    if (row === undefined) return null;
    const managers = this.database.prepare('SELECT discordUserId FROM TeamManager WHERE teamApplicationId = ?').all(id) as Array<{ discordUserId: string }>;
    const players = this.database.prepare('SELECT tag, displayName, townHallLevel, verifiedAt FROM VerifiedPlayer WHERE teamApplicationId = ?').all(id) as Array<{ tag: string; displayName: string; townHallLevel: number; verifiedAt: string }>;
    const tournament = this.database.prepare('SELECT guildId FROM Tournament WHERE id = ?').get(row.tournamentId) as { guildId: string } | undefined;
    const application = TeamApplication.create({ id: row.id, tournamentId: row.tournamentId, guildId: tournament?.guildId ?? '', name: row.name, managerIds: managers.map((manager) => manager.discordUserId), playersPerTeam: Math.max(players.length, 1) });
    for (const player of players) application.addVerifiedPlayer({ tag: player.tag, displayName: player.displayName, townHallLevel: player.townHallLevel, verifiedAt: new Date(player.verifiedAt), source: 'sqlite' });
    if (row.status !== 'DRAFT') application.submit();
    if (row.status === 'CHANGES_REQUESTED') application.requestChanges();
    if (row.status === 'ACCEPTED') application.accept();
    if (row.status === 'REJECTED') application.reject('Persisted decision');
    if (row.status === 'DISQUALIFIED') application.disqualify('Persisted decision');
    return application;
  }
}
