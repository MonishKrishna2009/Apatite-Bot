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