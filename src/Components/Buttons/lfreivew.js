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

const Component = require("../../Structure/Handlers/BaseComponent");
const { EmbedBuilder, Colors, MessageFlags, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const config = require("../../Structure/Configs/config");
const { Logger } = require("../../Structure/Functions/Logger");
const logger = new Logger();
const { logLFAction, getGameChannels } = require("../../Structure/Functions/LFSystem/lfActionLogger");

class LFReviewHandler extends Component {
    constructor(client) {
        super(client, { id: /^lfreview_.+/ }); // regex match
    }

    async execute(interaction) {
        //check if user has LFP mod role
        if (!interaction.member.roles.cache.has(config.lfplftModroleId)) {
            const noPermEmbed = new EmbedBuilder()
                .setTitle("❌ Insufficient Permissions")
                .setColor(Colors.Red)
                .setDescription("You do not have permission to review LFP/LFT requests. \n > Required Role: <@&" + config.lfplftModroleId + ">")
                .setTimestamp();
            return interaction.reply({ embeds: [noPermEmbed], flags: MessageFlags.Ephemeral });
        }

        const [, requestId, action] = interaction.customId.split("_");
        const req = await LFRequest.findById(requestId);
        if (!req) return interaction.reply({ content: "❌ Request not found.", flags: MessageFlags.Ephemeral });

        if (req.status !== "pending") {
            return interaction.reply({ content: "⚠️ This request has already been reviewed.", flags: MessageFlags.Ephemeral });
        }

        req.status = action === "approve" ? "approved" : "declined";
        req.reviewedBy = interaction.user.id;
        await req.save();

        // Get game-specific channels
        const channels = getGameChannels(config, req.game);

        // Update review embed
        const oldEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
            .setTitle(req.type === "LFP" ? "👥 LFP Request" : "🔎 LFT Request")
            .setColor(action === "approve" ? Colors.Green : Colors.Red)
            .setFooter({ text: `Reviewed by ${interaction.user.tag} | Request ID: ${req._id}` });

        await interaction.update({ embeds: [newEmbed], components: [] });

        // DM User
        try {
            const target = await interaction.client.users.fetch(req.userId);
            const approveEmbed = new EmbedBuilder()
                .setTitle(action === "approve" ? "✅ Request Approved" : "❌ Request Declined")
                .setColor(action === "approve" ? Colors.Green : Colors.Red)
                .setDescription(
                    `>>> **Game:** ${req.game}\n` +
                    `**Type:** ${req.type}\n` +
                    `**Request ID:** \`${req._id}\`\n` +
                    `**Reviewed by:** ${interaction.user.tag}\n\n` +
                    (action === "approve"
                        ? `**Status:** ✅ Approved\n` +
                          `**Action:** Your request has been approved and posted in <#${channels.publicChannelId}>\n` +
                          `**Next Steps:** Other players can now contact you directly!`
                        : `**Status:** ❌ Declined\n` +
                          `**Action:** Your request has been declined by the staff team\n` +
                          `**Next Steps:** You can create a new request or contact staff for more information`)
                )
                .setFooter({ text: `Request ID: ${req._id}` })
                .setTimestamp();
            await target.send({ embeds: [approveEmbed] });
        } catch (err) {
            logger.warn(`Failed to DM user ${req.userId} about their ${req.type} request.`);
        }

        // If approved → post to public channel and save messageId
        if (action === "approve") {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(req.type === "LFP" ? "DM Team" : "DM Player")
                    .setStyle("Link")
                    .setURL(`https://discord.com/users/${req.userId}`)
            );

            const publicEmbed = EmbedBuilder.from(newEmbed)
                .setTitle(req.type === "LFP" ? "📢 Looking For Players" : "📢 Looking For Team")
                .setColor(req.type === "LFP" ? Colors.Blue : Colors.Purple);

            const publicChannel = interaction.guild.channels.cache.get(channels.publicChannelId);

            // send and capture message
            const publicMessage = await publicChannel.send({ embeds: [publicEmbed], components: [row] });

            // save messageId for future edits/deletes
            req.publicMessageId = publicMessage.id;
            await req.save();
        }

        // Log the action
        try {
            const targetUser = await interaction.client.users.fetch(req.userId);
            await logLFAction(interaction.client, config, action, req, targetUser, interaction.user);
        } catch (error) {
            logger.warn(`Failed to fetch user ${req.userId} for logging: ${error.message}`);
            await logLFAction(interaction.client, config, action, req, { id: req.userId, tag: "Unknown" }, interaction.user);
        }
    }
}

module.exports = LFReviewHandler;
