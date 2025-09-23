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
const {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const config = require("../../Structure/Configs/config");
const { Logger } = require("../../Structure/Functions/Logger");
const logger = new Logger();
const { STATUS, createSuccessEmbed, createErrorEmbed, canUserPerformAction } = require("../../Structure/Functions/LFSystem/lfHelpers");
const { logLFAction, getGameChannels } = require("../../Structure/Functions/LFSystem/lfActionLogger");
const modalHandler = require("../../Structure/Functions/LFSystem/modalHandler");

class LFPEditModal extends Component {
  constructor(client) {
    super(client, { id: /^lfp_edit_(.+)$/ }); // Regex match: lfp_edit_[requestId]
  }

  async execute(interaction) {
    const { guild, user, customId } = interaction;

    // Extract request ID from customId
    const requestId = customId.replace("lfp_edit_", "");

    // Find request
    const req = await LFRequest.findById(requestId);
    if (!req) {
      return interaction.reply({
        embeds: [createErrorEmbed("Request Not Found", "No request found with that ID.")],
        flags: MessageFlags.Ephemeral
      });
    }

    // Check permissions
    const permissionCheck = canUserPerformAction(req, user.id, "edit");
    if (!permissionCheck.allowed) {
      return interaction.reply({
        embeds: [createErrorEmbed("Cannot Edit", permissionCheck.reason, req.status)],
        flags: MessageFlags.Ephemeral
      });
    }

    // Extract content using modal handler
    const content = modalHandler.extractContent(interaction, "lfp", req.game.toLowerCase());

    // Get game-specific channels
    const channels = getGameChannels(config, req.game);

    // If request is approved, we need to delete public message and resend to review
    if (req.status === STATUS.APPROVED) {
      // Delete public message if it exists
      if (req.publicMessageId) {
        try {
          const publicChannel = guild.channels.cache.get(channels.publicChannelId);
          const publicMsg = await publicChannel.messages.fetch(req.publicMessageId).catch(() => null);
          if (publicMsg) await publicMsg.delete();
        } catch (error) {
          logger.warn(`Failed to delete public message for request ${req._id}: ${error.message}`);
        }
      }

      // Reset request to pending and extend expiry
      req.status = STATUS.PENDING;
      req.reviewedBy = null;
      req.publicMessageId = null;
      req.messageId = null;
      
      // Extend expiry date for edited requests
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + config.RequestExpiryDays);
      req.expiresAt = newExpiresAt;
    }

    // Update request content
    req.content = content;
    await req.save();

    // Create review embed
    const reviewEmbed = new EmbedBuilder()
      .setTitle("👥 LFP Request (Pending Review)")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(Colors.Grey)
      .setDescription(
        `>>> **User:** <@${user.id}>\n` +
        modalHandler.generateEmbedDescription(content, "lfp", req.game.toLowerCase())
      )
      .setFooter({ text: `Request ID: ${req._id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`lfreview_${req._id}_approve`)
        .setLabel("✅ Approve")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`lfreview_${req._id}_decline`)
        .setLabel("❌ Decline")
        .setStyle(ButtonStyle.Danger)
    );

    // Handle review message based on status
    const reviewChannel = guild.channels.cache.get(channels.reviewChannelId);
    
    if (req.status === STATUS.PENDING && req.messageId) {
      // Update existing review message if request is still pending
      try {
        const existingMsg = await reviewChannel.messages.fetch(req.messageId).catch(() => null);
        if (existingMsg) {
          await existingMsg.edit({ embeds: [reviewEmbed], components: [row] });
          logger.info(`Updated existing review message for LFP request ${req._id}`);
        } else {
          // If message doesn't exist, create a new one
          const reviewMsg = await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
          req.messageId = reviewMsg.id;
          await req.save();
        }
      } catch (error) {
        logger.warn(`Failed to update review message for request ${req._id}: ${error.message}`);
        // Fallback: create new message
        const reviewMsg = await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
        req.messageId = reviewMsg.id;
        await req.save();
      }
    } else {
      // Create new review message for approved requests or if no existing message
      const reviewMsg = await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
      req.messageId = reviewMsg.id;
      await req.save();
    }

    // Log the action
    await logLFAction(interaction.client, config, 'edit', req, user);

    // Reply to user
    await interaction.reply({
      embeds: [createSuccessEmbed("Request Updated", `Your LFP request \`${req._id}\` has been updated successfully.`, req.status)],
      flags: MessageFlags.Ephemeral
    });

    // 📩 DM Notification
    try {
      const editDmEmbed = new EmbedBuilder()
        .setTitle("✏️ LFP Request Updated")
        .setColor(Colors.Blue)
        .setDescription(
          `>>> **Game:** ${req.game}\n` +
          `**Request ID:** \`${req._id}\`\n` +
          `**Status:** ${req.status}\n` +
          `**Action:** Your request has been updated${req.status === STATUS.PENDING ? ' and the review message has been refreshed' : ' and sent for review'}\n` +
          `**Expires:** <t:${Math.floor(req.expiresAt.getTime() / 1000)}:R>\n`
        )
        .setFooter({ text: `Request ID: ${req._id}` })
        .setTimestamp();
      
      await user.send({ embeds: [editDmEmbed] });
    } catch (error) {
      logger.warn(`Could not DM user ${user.tag} (${user.id}) about their LFP request edit.`);
    }
  }
}

module.exports = LFPEditModal;
