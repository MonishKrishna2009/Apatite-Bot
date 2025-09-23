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

const Command = require("../../Structure/Handlers/BaseCommand");
const { CommandHandler } = require("../../Structure/Handlers/CommandHandler");
const {ComponentHandler,} = require("../../Structure/Handlers/ComponentHandler");
const { EventHandler } = require("../../Structure/Handlers/EventHandler");
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

class Reload extends Command {
  constructor(client) {
    super(client, {
      data: new SlashCommandBuilder()
        .setName("reload")
        .setDescription("Reload commands/events!")
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subCommand) =>
          subCommand.setName("events").setDescription("Reload all events.")
        )
        .addSubcommand((subCommand) =>
          subCommand
            .setName("component")
            .setDescription("Reload all components.")
        )
        .addSubcommand((subCommand) =>
          subCommand
            .setName("commands")
            .setDescription("Reload/register all slash commands.")
            .addStringOption((option) =>
              option
                .setName("deploy-slash")
                .setDescription("By default it's (false)")
                .setRequired(false)
                .addChoices(
                  { name: "true", value: "true" },
                  { name: "false", value: "false" }
                )
            )
        ),
      options: {
        devOnly: true,
      },
    });
  }
  async execute(interaction, client) {
    const subCmd = interaction.options.getSubcommand();
    switch (subCmd) {
      case "commands":
        try {
          const isDeploySlash =
            interaction.options.getString("deploy-slash") || false;
          const { loadCommands } = new CommandHandler();
          await loadCommands(client, isDeploySlash);
          interaction.reply({
            content: `All commands has been reloaded. \nAnd deploy slash was \`${isDeploySlash}\``,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          logger.error(error);
        }
        break;
      case "component":
        try {
          const { loadComponents } = new ComponentHandler();
          await loadComponents(client);
          interaction.reply({
            content: `All components has been reloaded.`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          logger.error(error);
        }
        break;
      case "events":
        try {
          for (const [key, value] of client.events)
            client.removeListener(value.name, value.execute);
          const { loadEvents } = new EventHandler();
          await loadEvents(client);
          interaction.reply({
            content: `All events has been reloaded.`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          logger.error(error);
        }
        break;
      default:
        break;
    }  }
}

module.exports = Reload;