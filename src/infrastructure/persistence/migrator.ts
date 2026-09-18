import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { SqliteDatabase } from './database.js';

export function runMigrations(database: SqliteDatabase, migrationsDirectory: string): void {
  database.exec(
    'CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)',
  );

  const applied = new Set(
    (database.prepare('SELECT name FROM _migrations').all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );
  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((fileName) => /^\d+_.*\.sql$/.test(fileName))
    .sort();

  for (const migrationFile of migrationFiles) {
    if (applied.has(migrationFile)) {
      continue;
    }

    const migrationSql = readFileSync(join(migrationsDirectory, migrationFile), 'utf8');
    database.exec(migrationSql);
    database
      .prepare('INSERT INTO _migrations (name, appliedAt) VALUES (?, ?)')
      .run(migrationFile, new Date().toISOString());
  }
}