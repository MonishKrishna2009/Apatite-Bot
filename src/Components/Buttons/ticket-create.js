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

// TicketButton.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, Colors } = require("discord.js");
const Component = require("../../Structure/Handlers/BaseComponent.js");
const ticketSchema = require("../../Structure/Schemas/Ticket/ticketSchema.js");
const config = require("../../Structure/Configs/config.js");

// Ticket types mapping
const TICKET_TYPES = {
    appeal: { prefix: "appeal", label: "⚖️ Appeal" },
    claim: { prefix: "claim", label: "🎉 Claim Prize" },
    general: { prefix: "gen", label: "ℹ️ General Inquiry" },
    production: { prefix: "prod", label: "🎬 Production Inquiry" }
};

class TicketButton extends Component {
    constructor(client) {
        super(client, {
            id: /^ticket-create-(.+)$/, // regex to capture type
            type: "BUTTON"
        });
    }

    /**
     * @param {import("discord.js").ButtonInteraction} interaction
     */
    async execute(interaction) {
        const { guild, user, member, customId } = interaction;

        // Extract type from customId (ticket-create-appeal → "appeal")
        const match = customId.match(/^ticket-create-(.+)$/);
        const typeKey = match ? match[1] : null;
        const typeConfig = TICKET_TYPES[typeKey];

        if (!typeConfig) {
            return interaction.reply({
                content: "❌ Unknown ticket type.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (!config.ticketSystem) {
            return interaction.reply({
                content: "❌ Ticket system is disabled.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Prevent multiple open tickets
        const dataTicket = await ticketSchema.find({ guildId: guild.id, userId: user.id, isClose: false });
        for (const ticket of dataTicket) {
            if (guild.channels.cache.get(ticket.channelId)) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`**❌ You already have an open ticket in <#${ticket.channelId}>.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }

        await interaction.reply({
            content: "⌛ Creating your ticket... **Please wait**.",
            flags: MessageFlags.Ephemeral
        });

        // Reusable action buttons
        const rowConfig = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ticket-close-button").setEmoji("🔒").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("ticket-delete-button").setEmoji("🗑").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("ticket-transcript-button").setEmoji("📝").setStyle(ButtonStyle.Primary)
        );

        // Create ticket channel
        const ch = await guild.channels.create({
            name: `ticket-${typeConfig.prefix}-${member.user.username}`,
            type: 0,
            parent: config.ticketCategoryId ?? null,
            permissionOverwrites: [
                { id: guild.id, deny: ["ViewChannel"] },
                { id: user.id, allow: ["ViewChannel"] },
                { id: config.ticketSupportRoleId, allow: ["ViewChannel"] }
            ]
        });

        // Send ticket embed
        ch.send({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: `${member.user.tag}'s Ticket`, iconURL: member.displayAvatarURL() })
                    .setTitle("🎟️ Support Ticket Opened")
                    .setDescription([
                        ">>> Thanks for creating a ticket! Our support team will be with you shortly.",
                        "",
                        "__**Available Actions**__",
                        "🔒 Close • 🗑 Delete • 📝 Transcript",
                        "",
                        "__**Ticket Information**__",
                        `📌 **Type:** ${typeConfig.label}\n👤 **Owner:** <@${user.id}>\n⏰ **Created:** <t:${parseInt(
                            ch.createdTimestamp / 1000
                        )}:R>`
                    ].join("\n"))
                    .setColor(0x2ECC71)
                    .setFooter({ text: "Ticket System", iconURL: guild.iconURL() })
                    .setTimestamp()
            ],
            components: [rowConfig]
        });

        // Save in DB
        await new ticketSchema({
            guildId: guild.id,
            userId: user.id,
            channelId: ch.id,
            isClose: false
        }).save();

        // Log
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
            const logEmbed = this.client.logManager.createLogEmbed(
                "TICKET_CREATE",
                Colors.Green,
                "**New Ticket Created**",
                `>>> **User**: ${user} (\`${user.id}\`)\n**Channel**: <#${ch.id}>\n**Type**: ${typeConfig.label}`
            ).setFooter({ text: `Ticket System • ${new Date().toLocaleTimeString()}`, iconURL: guild.iconURL() });

            await logChannel.send({ embeds: [logEmbed] });
        }

        return await interaction.editReply({
            content: `✅ Ticket created on **${ch}**.`,
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = TicketButton;
