import { Client, GatewayIntentBits } from 'discord.js';

import { InteractionRouter } from '../adapters/discord/interaction-router.js';

export function createDiscordClient(router: InteractionRouter): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });
  client.on('interactionCreate', (interaction) => {
    void router.route(interaction).catch(() => {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        void interaction.reply({ content: 'The action could not be completed.', ephemeral: true });
      }
    });
  });
  return client;
}