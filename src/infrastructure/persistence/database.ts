import Database from 'better-sqlite3';

export type SqliteDatabase = Database.Database;

export function openDatabase(databasePath: string): SqliteDatabase {
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  database.pragma('synchronous = NORMAL');
  return database;
}

export function withTransaction<T>(database: SqliteDatabase, operation: () => T): T {
  return database.transaction(operation)();
}