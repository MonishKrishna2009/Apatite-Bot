/*
 * Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.
 *
 * Copyright (C) 2025 Monish Krishna
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const { GatewayIntentBits, Partials } = require("discord.js");
const { BotClient } = require("../Client/Client");
const {
  ErrorHandler,
  ClientErrorHandler,
} = require("../Handlers/ErrorHandler");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");

const clientOptions = {
  allowedMentions: {
    parse: ["users", "roles", "everyone"],
    repliedUser: false,
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.User, Partials.GuildMember],
  shards: ClusterClient.getInfo().SHARD_LIST,
  shardCount: ClusterClient.getInfo().TOTAL_SHARDS,
};

const client = new BotClient(clientOptions);
client.cluster = new ClusterClient(client);

ErrorHandler();
ClientErrorHandler(client);

client.start();