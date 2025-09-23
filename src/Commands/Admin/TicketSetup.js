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
const { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const config = require("../../Structure/Configs/config");

// This command sets up a ticket system in a specified channel with buttons for different ticket types.
// It sends an initial message with instructions and buttons to create tickets.
// Please edit the message content and button labels as per your requirements. (e.g., changing "Apatite" to your server name.)

class Ticket extends Command {
  constructor(client) {
    super(client, {
      data: new SlashCommandBuilder()
        .setName("ticket-setup")
        .setDescription("Set up the ticket system for the server.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
      options: {
        devOnly: true,
      },
    });
  }
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle("Ticket Setup")
      .setDescription("Setting up the ticket system...");
    
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });


    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket-create-claim')
            .setEmoji('🎉')
            .setLabel('Claim Prize')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ticket-create-production')
            .setEmoji('🎬')
            .setLabel('Production Inquiry')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('ticket-create-general')
            .setEmoji('ℹ️')
            .setLabel('General Inquiry')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('ticket-create-appeal')
            .setEmoji('⚖️')
            .setLabel('Appeal')
            .setStyle(ButtonStyle.Danger)
    );

    const TEmbed = new EmbedBuilder()
        .setTitle("Welcome to Apatite's Ticket System 🎟️")
        .setDescription("Please select a button below to create a ticket. Our support team will assist you as soon as possible.")
        .addFields(
          { name: "<:RedDot:1404776517136814110> Claim Prize", value: "Use this button if you have won a prize and need to claim it." },
          { name: "<:RedDot:1404776517136814110> Production Inquiry", value: "Use this button for any production-related questions or requests." },
          { name: "<:RedDot:1404776517136814110> General Inquiry", value: "Use this button for any general questions or concerns." },
          { name: "<:RedDot:1404776517136814110> Appeal", value: "Use this button if you wish to appeal a decision made by the team." }
        )        .setFooter({ text: "Apatite Ticket System", iconURL: client.user.displayAvatarURL() })
    
    const ticketChannel = config.ticketDashChannelId;
    const img = new AttachmentBuilder("https://cdn.discordapp.com/attachments/1350827709571534871/1406943660440027216/APATIE_DISCORD_INFO.png?ex=68a44de4&is=68a2fc64&hm=a1bd9cfb5f609e72514d67d4a82c883bcc0b4c80149b6da7aac2e956b5e1849e&");

    const channel = await client.channels.fetch(ticketChannel).catch(() => null);
    if (!channel) {
        return interaction.editReply({
            content: "Ticket dashboard channel not found. Please check the configuration.",
            flags: MessageFlags.Ephemeral,
        });
        }
    await channel.send({
        files: [img],
    });
    await channel.send({
        embeds: [TEmbed],
        components: [row],
        });
    embed.setDescription("Ticket system setup complete! A ticket dashboard has been created in the designated channel.");
    embed.setColor(Colors.Green);
    await interaction.editReply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = Ticket;