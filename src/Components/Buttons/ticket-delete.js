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

const { Logger } = require("../../Structure/Functions/Logger.js");
const logger = new Logger();
const Component = require("../../Structure/Handlers/BaseComponent.js");
const ticketSchema = require("../../Structure/Schemas/Ticket/ticketSchema.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, Colors } = require("discord.js");

const config = require("../../Structure/Configs/config.js");
const html = require('discord-html-transcripts')

class TickDelButton extends Component {
    constructor(client) {
        super(client, {
            id: "ticket-delete-button",
            type: "BUTTON"
        });
    }
    /**
     * @param {import("discord.js").ButtonInteraction} interaction
     */
    async execute(interaction) {
        const { guild, channel, message, user, member } = interaction;

        const dataTicket = await ticketSchema.find({ guildId: guild.id, userId: user.id, isClose: false });

        if (config.ticketSystem === false) {
            return interaction.reply({
                content: "❌ Ticket system is disabled.",
                flags: MessageFlags.Ephemeral
            });
        }

        const supportRole = config.ticketSupportRoleId;
        if (!member.roles.cache.has(supportRole) && !member.permissions.has("Administrator")) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("You do not have permission to use this button.")
                .setFooter({ text: "You need the support role or Administrator permission to use this button.", iconURL: guild.iconURL() })
                .setTimestamp();
            return interaction.reply({
                embeds: [noPermsEmbed],
                flags: MessageFlags.Ephemeral
            });
        }

        const confirmEmbed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setDescription(`**Are you sure you want to delete this ticket?**`)
        .setTimestamp()
        .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
    
    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("delete-confirm-ticket")
                .setEmoji("✔️")
                .setLabel("Yes")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("delete-cancel-ticket")
                .setEmoji("❌")
                .setLabel("No")
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], flags: MessageFlags.Ephemeral });
    const filter = i => i.customId === "delete-confirm-ticket" || i.customId === "delete-cancel-ticket";
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
    collector.on('collect', async i => {
        if (i.customId === "delete-confirm-ticket") {
            const deletingEmbed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("Deleting ticket... Please wait.")
                .setFooter({ text: "Ticket System", iconURL: guild.iconURL() })
                .setTimestamp();
            await i.update({ embeds: [deletingEmbed], components: [] });

            // Generate transcript before deleting
            const transcript = await html.createTranscript(channel, {
                limit: -1,
                returnBuffer: false,
                fileName: `${channel.name}-transcript.html`
            });

            const transLogChannel =  guild.channels.cache.get(config.ticketTranscriptChannelId);
            if (transLogChannel) {
                const TlogEmbed = new EmbedBuilder()
                .setColor(Colors.Blue)
                .setDescription(`Transcript for ticket: ${channel.name}`)
                .setFooter({ text: "Ticket System", iconURL: guild.iconURL() })
                .setTimestamp();
            await transLogChannel.send({
                embeds: [TlogEmbed],
                files: [transcript]
            });
            }
    
            // Log the ticket deletion

            const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
            if (logChannel) {
                const logEmbed = this.client.logManager.createLogEmbed(
                    "TICKET_DELETE",
                    Colors.Red,
                    "**Ticket Deleted**",
                    `>>> **Channel**: ${channel.name} (\`${channel.id}\`)\n` +
                    `**Deleted By**: ${user.tag} (\`${user.id}\`)\n` +
                    `**Owner**: <@${dataTicket[0]?.userId || 'Unknown'}> (\`${dataTicket[0]?.userId || 'Unknown'}\`)\n` +
                    `**Reason**: Ticket deleted via button`                );

                logEmbed.setFooter({
                    text: `Ticket System • ${new Date().toLocaleTimeString()}`,
                    iconURL: guild.iconURL()
                });

                await logChannel.send({ embeds: [logEmbed] });
            }

            await channel.delete();
            await ticketSchema.deleteOne({ guildId: guild.id, channelId: channel.id });        } else {
            const cancelEmbed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setDescription("Ticket deletion has been cancelled.")
                .setTimestamp()
                .setFooter({ text: "Ticket System", iconURL: guild.iconURL() });
            await i.update({ embeds: [cancelEmbed], components: [] , flags: MessageFlags.Ephemeral});
        }

    });
    collector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription(`**❌ Ticket deletion timed out. Please try again.**`)
                .setTimestamp()
                .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
            interaction.editReply({ embeds: [timeoutEmbed], components: [] , flags: MessageFlags.Ephemeral});
        }
    });

}}

module.exports = TickDelButton;