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

const Event = require("../../Structure/Handlers/BaseEvent");
const { CommandHandler } = require("../../Structure/Handlers/CommandHandler");
const { ComponentHandler, } = require("../../Structure/Handlers/ComponentHandler");
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

    const statuses = [
      { name: "LFP / LFT requests", type: ActivityType.Watching },
      { name: "scrims being formed", type: ActivityType.Watching },
      { name: "teams looking for players", type: ActivityType.Listening },
      { name: "players building rosters", type: ActivityType.Listening },
      { name: "the esports grind 💪", type: ActivityType.Competing },
      { name: "Valorant rosters 🔫", type: ActivityType.Playing },
      //{ name: "CS2 tryouts 🎯", type: ActivityType.Playing },
      { name: "scrim requests ⚔️", type: ActivityType.Competing },
      { name: "new challengers appear 👀", type: ActivityType.Watching },
      { name: "team chemistry form 💡", type: ActivityType.Listening }
    ];

    //Set first status
    client.user.setPresence({
      activities: [{ name: statuses[0].name, type: statuses[0].type }]
    })

    // Rotate presence every 5 minutes
    let i = 0;
    setInterval(() => {
      const status = statuses[i];
      client.user.setPresence({
        activities: [{ name: status.name, type: status.type }],
        status: 'dnd' // options: 'online', 'idle', 'dnd', 'invisible'
      });
      i = (i + 1) % statuses.length;
    }, 300000); // 300,000 ms = 5 minutes

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

    // 🎉 Bot startup success message
    console.log(`🚀 APATITE BOT HAS STARTED SUCCESSFULLY!`);
  }
}

module.exports = Ready;