import { loadRuntimeConfig } from '../infrastructure/config/env.js';
import { createDiscordClient } from './discord.js';
import { InteractionRouter } from '../adapters/discord/interaction-router.js';

const config = loadRuntimeConfig();
const client = createDiscordClient(new InteractionRouter());

void client.login(config.DISCORD_TOKEN);
