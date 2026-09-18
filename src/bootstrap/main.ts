import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createTournamentCommandHandlers } from '../adapters/discord/commands/tournament-commands.js';
import { InteractionRouter, type InteractionHandler } from '../adapters/discord/interaction-router.js';
import { DiscordOutboxWorker } from '../adapters/discord/outbox-worker.js';
import { TournamentStatusService } from '../adapters/discord/tournament-status-adapter.js';
import type { DiscordEffectsPort } from '../application/ports/discord-effects.js';
import { OutboxService } from '../application/services/outbox-service.js';
import { TournamentLifecycle } from '../application/services/tournament-lifecycle.js';
import { CompleteTournament } from '../application/use-cases/complete-tournament.js';
import { GetTournamentSummary } from '../application/use-cases/get-tournament-summary.js';
import { loadRuntimeConfig, type RuntimeConfig } from '../infrastructure/config/env.js';
import { openDatabase } from '../infrastructure/persistence/database.js';
import { runMigrations } from '../infrastructure/persistence/migrator.js';
import { SqliteAuditRepository, SqliteOutboxRepository } from '../infrastructure/persistence/repositories/index.js';
import { SqliteMatchStatusStore } from '../infrastructure/persistence/repositories/match-status-repository.js';
import { SqliteTournamentStandingsRepository } from '../infrastructure/persistence/repositories/tournament-standings-repository.js';
import { DeadlineScheduler } from '../infrastructure/scheduling/deadline-scheduler.js';
import { createDiscordClient } from './discord.js';

export type ApplicationRuntime = {
  readonly config: RuntimeConfig;
  readonly database: ReturnType<typeof openDatabase>;
  readonly scheduler: DeadlineScheduler;
  readonly outbox: OutboxService;
  readonly router: InteractionRouter;
  readonly client: ReturnType<typeof createDiscordClient>;
  readonly standings: SqliteTournamentStandingsRepository;
  readonly matchStatus: SqliteMatchStatusStore;
  readonly completion: CompleteTournament;
  readonly lifecycle: TournamentLifecycle;
  readonly summary: GetTournamentSummary;
  readonly status: TournamentStatusService;
};

export type InitializeApplicationOptions = {
  /** Discord effects used to publish pending announcements recovered from the outbox. */
  readonly discordEffects?: DiscordEffectsPort;
};

export async function initializeApplication(
  overrides: Partial<Record<string, string>> = {},
  options: InitializeApplicationOptions = {},
): Promise<ApplicationRuntime> {
  const config = loadRuntimeConfig(overrides);
  const database = openDatabase(config.DATABASE_PATH);
  runMigrations(database, join(process.cwd(), 'migrations'));

  const scheduler = new DeadlineScheduler();
  const outboxRepository = new SqliteOutboxRepository(database);
  const outbox = new OutboxService(outboxRepository);
  const audit = new SqliteAuditRepository(database);
  const standings = new SqliteTournamentStandingsRepository(database);
  const matchStatus = new SqliteMatchStatusStore(database);
  const completion = new CompleteTournament({ tournaments: standings, bracket: standings, outbox, audit });
  const lifecycle = new TournamentLifecycle(completion, standings);
  const summary = new GetTournamentSummary({ tournaments: standings, bracket: standings });
  const status = new TournamentStatusService(summary);
  const router = new InteractionRouter();
  registerTournamentStatusCommand(router, status);
  const client = createDiscordClient(router);

  await scheduler.recoverPendingDeadlines();
  // Pending announcements are published, never dropped: an event is only marked as processed once
  // Discord acknowledged it, so a restart recovers the final message without duplicating it.
  if (options.discordEffects !== undefined) {
    await new DiscordOutboxWorker(outboxRepository, options.discordEffects).processPending();
  }

  return { config, database, scheduler, outbox, router, client, standings, matchStatus, completion, lifecycle, summary, status };
}

/** Registers the ephemeral `/tournament status` recap so it stays consultable without a new registration. */
function registerTournamentStatusCommand(router: InteractionRouter, status: TournamentStatusService): void {
  const handlers = createTournamentCommandHandlers({
    publish: async () => undefined,
    status: async (tournamentId, interaction) => {
      const recap = await status.describe({
        ...(tournamentId === undefined ? {} : { tournamentId }),
        ...(guildIdOf(interaction) === undefined ? {} : { guildId: guildIdOf(interaction) as string }),
      });
      await editReply(interaction, recap.content);
    },
  });
  router.register('tournament', 'status', handlers.status as InteractionHandler);
}

function guildIdOf(interaction: unknown): string | undefined {
  const candidate = interaction as { guildId?: string | null } | null;
  return typeof candidate?.guildId === 'string' && candidate.guildId.length > 0 ? candidate.guildId : undefined;
}

async function editReply(interaction: unknown, content: string): Promise<void> {
  const repliable = interaction as { editReply?: (options: { content: string }) => Promise<unknown> } | null;
  if (typeof repliable?.editReply === 'function') await repliable.editReply({ content });
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
