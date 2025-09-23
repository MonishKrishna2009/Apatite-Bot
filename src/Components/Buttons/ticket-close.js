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

class CloseTicketButton extends Component {
    constructor(client) {
        super(client, {
            id: "ticket-close-button",
            type: "BUTTON"
        });
    }
    /**
     * @param {import("discord.js").ButtonInteraction} interaction
     */
    async execute(interaction) {

        const { guild, channel, user } = interaction;
        const dataTicket = await ticketSchema.findOne({ guildId: guild.id, channelId: channel.id });

        if (config.ticketSystem === false) {
            return interaction.reply({
                content: "❌ Ticket system is disabled.",
                flags: MessageFlags.Ephemeral
            });
        }

        if(dataTicket && dataTicket.isClose) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(`**❌ This ticket is already closed.**`)
                .setTimestamp()
                .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }


        // Send confirmation message and wait for user response if no user response in 30 seconds, disable the button
        const confirmEmbed = new EmbedBuilder()
            .setColor(Colors.Yellow)
            .setDescription(`**Are you sure you want to close this ticket?**`)
            .setTimestamp()
            .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
        
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("close-confirm-ticket")
                    .setEmoji("✔️")
                    .setLabel("Yes")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("close-cancel-ticket")
                    .setEmoji("❌")
                    .setLabel("No")
                    .setStyle(ButtonStyle.Secondary)
            );
        await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], flags: MessageFlags.Ephemeral });
        const filter = i => i.customId === "close-confirm-ticket" || i.customId === "close-cancel-ticket";
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
        collector.on('collect', async i => {
            if (i.customId === "close-confirm-ticket") {
                // Update ticket status to closed
                dataTicket.isClose = true;
                await dataTicket.save();

                channel.permissionOverwrites.edit(dataTicket.userId,
                    { SendMessages: false }
                );

                const closeEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setDescription(`**✅ The ticket has been successfully closed.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                
                await i.update({ embeds: [closeEmbed], components: [], flags: MessageFlags.Ephemeral });
                
                const reopenButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("ticket-reopen-button")
                            .setEmoji("🔄")
                            .setLabel("Reopen Ticket")
                            .setStyle(ButtonStyle.Primary)
                    );
                
                const reopenEmbed = new EmbedBuilder()
                    .setColor("Blue")
                    .setDescription(`**This ticket has been closed. If you need further assistance, you can reopen it using the button below.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                
                await channel.send({ embeds: [reopenEmbed], components: [reopenButton] });

                const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
                if (logChannel) {
                    const logEmbed = this.client.logManager.createLogEmbed(
                        "TICKET_CLOSE",
                        Colors.Orange,
                        "**Ticket Closed**",
                        `>>> **Closed By**: <@${user.id}>\n` +
                        `**Owner**: <@${dataTicket.userId}>\n` +
                        `**Channel**: <#${channel.id}>`
                    );

                    logEmbed.setFooter({
                        text: `Ticket System • ${new Date().toLocaleTimeString()}`,
                        iconURL: guild.iconURL()
                    });

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`**❌ Ticket closure has been cancelled.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                
                await i.update({ embeds: [cancelEmbed], components: [], flags: MessageFlags.Ephemeral });
            }
        });
        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`**❌ Ticket closure timed out. Please try again.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                
                interaction.editReply({ embeds: [timeoutEmbed], components: [], flags: MessageFlags.Ephemeral });
            }
        });

    }

}

module.exports = CloseTicketButton;