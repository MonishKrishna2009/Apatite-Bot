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
const { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } = require("discord.js");

class Ping extends Command {
  constructor(client) {
    super(client, {
      data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's ping!")
        .setDMPermission(false),
      options: {
        devOnly: false,
      },
    });
  }
  async execute(interaction, client) {
    await interaction.reply({content: `> 🏓 Pong! Calculating ping...`, flags: MessageFlags.Ephemeral});
    const msg = await interaction.fetchReply();
    const ping = Math.floor(
      msg.createdTimestamp - interaction.createdTimestamp
    );
    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle("📡 Bot Ping")
      .setDescription(
        `**${client.user.username}'s current ping:** \`${ping}ms\`\n\n` +
        `> **Discord Gateway Ping:** \`${client.ws.ping}ms\`\n` +
        `> **Bot Uptime:** <t:${Math.floor(client.readyTimestamp / 1000)}:R>`
      )
      .setFooter({ text: "Ping command executed", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    interaction.editReply({ embeds: [embed], content: "",});
  }
}

module.exports = Ping;