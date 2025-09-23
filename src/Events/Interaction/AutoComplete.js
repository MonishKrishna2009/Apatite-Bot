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
const { Events , MessageFlags} = require("discord.js");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

class AutoComplete extends Event {
  constructor(client) {
    super(client, {
      name: Events.InteractionCreate,
    });
  }

  async execute(interaction) {
    const { client } = this;
    if (!interaction.isAutocomplete()) return;
    const autoComplete = client.autoComplete.get(interaction.commandName);
    if (!autoComplete) return;

    try {
      await autoComplete.execute(interaction, client);
    } catch (error) {
      logger.error(error);
      if (interaction.replied) {
        await interaction.editReply({
          content: "Catch an error while running this command.",
          flags: MessageFlags.EPHEMERAL,
        });
      } else {
        await interaction.reply({
          content: "Catch an error while running this command.",
          flags: MessageFlags.EPHEMERAL,
        });
      }
    }
  }
}

module.exports = AutoComplete;