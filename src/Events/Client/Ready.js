const Event = require("../../Structure/Handlers/BaseEvent");
const { CommandHandler } = require("../../Structure/Handlers/CommandHandler");
const {ComponentHandler,} = require("../../Structure/Handlers/ComponentHandler");
const { ConnectMongo } = require("../../Structure/Schemas/index");
const { Events, ActivityType, PresenceUpdateStatus } = require("discord.js");
const { Logger, LogManager } = require("../../Structure/Functions/index");
const logger = new Logger();

class Ready extends Event {
  constructor(client) {
    super(client, {
      name: Events.ClientReady,
    });
  }

  async execute(client) {
    setInterval(() => {
      const activitys = [
        {
          name: `Apatite Discord Server`,
          type: ActivityType.Watching,
        }
      ];
      const activity = activitys[Math.floor(Math.random() * activitys.length)];
      client.user.setActivity(activity);
      client.user.setStatus(PresenceUpdateStatus.dnd);
    }, 5000);

    const { loadCommands } = new CommandHandler();
    const { loadComponents } = new ComponentHandler();

    try {
      await loadCommands(client, client.config.deploySlashOnReady); 
      await loadComponents(client);
    } catch (error) {
      logger.error(error);
    }

    logger.success(`${client.user.username}(#${client.cluster.id}) is ready!`);

    try {
      await ConnectMongo(client);
    } catch (error) {
      logger.error(error);
    }

    try {
      client.logManager = new LogManager(client);
      logger.info("LogManager initialized.");
    } catch (error) {
      logger.error("Failed to initialize LogManager:", error);
    }
  }
}

module.exports = Ready;