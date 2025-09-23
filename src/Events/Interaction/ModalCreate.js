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
const { Events, MessageFlags } = require("discord.js");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

class ModalCreate extends Event {
  constructor(client) {
    super(client, {
      name: Events.InteractionCreate,
    });
  }

  async execute(interaction) {
    const { client } = this;
    if (!interaction.isModalSubmit()) return;

    let modal = client.modals.get(interaction.customId);

    // 🔎 If no exact match, try regex match
    if (!modal) {
      modal = [...client.modals.values()].find((m) => {
        if (m.id instanceof RegExp) return m.id.test(interaction.customId);
        return false;
      });
    }

    if (!modal) return;

    try {
      await modal.execute(interaction, client);
    } catch (error) {
      logger.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "⚠️ An error occurred while processing this modal.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "⚠️ An error occurred while processing this modal.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

}

module.exports = ModalCreate;