import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { InteractionRouter } from '../adapters/discord/interaction-router.js';
import { loadRuntimeConfig, type RuntimeConfig } from '../infrastructure/config/env.js';
import { openDatabase } from '../infrastructure/persistence/database.js';
import { runMigrations } from '../infrastructure/persistence/migrator.js';
import { SqliteOutboxRepository } from '../infrastructure/persistence/repositories/index.js';
import { DeadlineScheduler } from '../infrastructure/scheduling/deadline-scheduler.js';
import { OutboxService } from '../application/services/outbox-service.js';
import { createDiscordClient } from './discord.js';

export type ApplicationRuntime = {
  readonly config: RuntimeConfig;
  readonly database: ReturnType<typeof openDatabase>;
  readonly scheduler: DeadlineScheduler;
  readonly outbox: OutboxService;
  readonly router: InteractionRouter;
  readonly client: ReturnType<typeof createDiscordClient>;
};

export async function initializeApplication(
  overrides: Partial<Record<string, string>> = {},
): Promise<ApplicationRuntime> {
  const config = loadRuntimeConfig(overrides);
  const database = openDatabase(config.DATABASE_PATH);
  runMigrations(database, join(process.cwd(), 'migrations'));

  const scheduler = new DeadlineScheduler();
  const outboxRepository = new SqliteOutboxRepository(database);
  const outbox = new OutboxService(outboxRepository);
  const router = new InteractionRouter();
  const client = createDiscordClient(router);

  await scheduler.recoverPendingDeadlines();
  await outbox.drain();

  return { config, database, scheduler, outbox, router, client };
}

export async function main(): Promise<void> {
  const runtime = await initializeApplication();
  await runtime.client.login(runtime.config.DISCORD_TOKEN);
}

const isDirectEntryPoint =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectEntryPoint) {
  void main();
}
