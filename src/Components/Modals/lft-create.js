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
const { cleanupRequests } = require("../../Structure/Functions/LFSystem/lfHelpers");
const { checkActiveRequests } = require("../../Structure/Functions/LFSystem/activeRequest");
const { STATUS, createSuccessEmbed, createErrorEmbed } = require("../../Structure/Functions/LFSystem/lfHelpers");
const { logLFAction, getGameChannels } = require("../../Structure/Functions/LFSystem/lfActionLogger");
const modalHandler = require("../../Structure/Functions/LFSystem/modalHandler");
const { validateGameConfig, validateAndSanitizeContent, validateChannelAccess } = require("../../Structure/Functions/LFSystem/lfValidation");
const { rateLimiter } = require("../../Structure/Functions/LFSystem/rateLimiter");
const { timeoutHandler } = require("../../Structure/Functions/LFSystem/timeoutHandler");

class LFTCreateModal extends Component {
  constructor(client) {
    super(client, { id: /^lft_create_(.+)$/ }); // Regex match: lft_create_valorant, lft_create_cs2, etc.
  }

  async execute(interaction) {
    const { guild, user, customId } = interaction;

    try {
      // Extract game from customId
      const game = customId.replace("lft_create_", "");

      // Validate game configuration
      const gameValidation = validateGameConfig("lft", game);
      if (!gameValidation.isValid) {
        return await interaction.reply({
          embeds: [createErrorEmbed("Configuration Error", gameValidation.errors.join("\n"))],
          flags: MessageFlags.Ephemeral
        });
      }

      // Get game-specific channels
      const channels = getGameChannels(config, game);
      
      // Validate channel access
      const reviewChannelValidation = await validateChannelAccess(guild, channels.reviewChannelId);
      if (!reviewChannelValidation.isValid) {
        return await interaction.reply({
          embeds: [createErrorEmbed("Channel Error", `Cannot access review channel: ${reviewChannelValidation.errors.join("\n")}`)],
          flags: MessageFlags.Ephemeral
        });
      }

      const publicChannelValidation = await validateChannelAccess(guild, channels.publicChannelId);
      if (!publicChannelValidation.isValid) {
        return await interaction.reply({
          embeds: [createErrorEmbed("Channel Error", `Cannot access public channel: ${publicChannelValidation.errors.join("\n")}`)],
          flags: MessageFlags.Ephemeral
        });
      }
      
      // 🧹 Cleanup old requests
      await cleanupRequests(guild, user.id, "LFT", channels.publicChannelId, config);

      // 🚦 Check rate limit
      rateLimiter.setConfig(config);
      const rateLimitResult = rateLimiter.checkOperationRateLimit(user.id, 'create');
      if (rateLimitResult.isLimited) {
        const resetTime = Math.floor(rateLimitResult.resetTime / 1000);
        return await interaction.reply({
          embeds: [createErrorEmbed("Rate Limited", `You are creating requests too quickly. Please wait <t:${resetTime}:R> before creating another request.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      // ✅ Check active request limit
      if (await checkActiveRequests(interaction, "LFT", config)) return;

      // Extract and validate content using modal handler
      const rawContent = modalHandler.extractContent(interaction, "lft", game);
      const { content, validationResult } = validateAndSanitizeContent(rawContent, "lft", game);
      
      if (!validationResult.isValid) {
        return await interaction.reply({
          embeds: [createErrorEmbed("Validation Error", validationResult.errors.join("\n"))],
          flags: MessageFlags.Ephemeral
        });
      }

      if (validationResult.hasWarnings()) {
        logger.warn(`Content validation warnings for user ${user.id}: ${validationResult.warnings.join(", ")}`);
      }

    // 💾 Save request
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.RequestExpiryDays);
    
    let req;
    try {
      req = await LFRequest.create({
        userId: user.id,
        guildId: guild.id,
        type: "LFT",
        game: game, // Store canonical key (e.g., "valorant")
        status: STATUS.PENDING,
        createdAt: now,
        expiresAt: expiresAt,
        content,
      });
    } catch (error) {
      // Handle duplicate key error (E11000) - database constraint prevents duplicate pending requests
      if (error.code === 11000) {
        // Check if it's the unique constraint error for pending requests
        if (error.keyPattern && error.keyPattern.status === 1) {
          const gameDisplayName = game.charAt(0).toUpperCase() + game.slice(1);
          return await interaction.reply({
            embeds: [createErrorEmbed("Pending Request Exists", `You already have a pending **LFT** request for **${gameDisplayName}**.\n\n**What this means:**\n• You cannot create multiple pending requests for the same game\n• Your previous request is still waiting for staff review\n\n**To create a new request:**\n• Cancel your existing request first using \`/requests cancel\`\n• Or wait for your current request to be reviewed by staff\n\n**Check your requests:** Use \`/requests list\` to see all your active requests and their status.`)],
            flags: MessageFlags.Ephemeral
          });
        }
      }
      
      // Handle other database errors
      let errorMessage = "Failed to create request. Please try again later.";
      
      if (error.name === 'ValidationError') {
        errorMessage = "Invalid request data. Please check your input and try again.";
      } else if (error.name === 'CastError') {
        errorMessage = "Invalid data format. Please try again.";
      } else if (error.code === 11000) {
        // Other duplicate key errors (not the constraint we handled above)
        errorMessage = "A request with similar data already exists. Please modify your request and try again.";
      } else if (error.code === 11001) {
        errorMessage = "Request data conflict. Please modify your request and try again.";
      } else if (error.code === 121) {
        errorMessage = "Request data validation failed. Please check your input and try again.";
      } else if (error.code === 16755) {
        errorMessage = "Invalid request format. Please check your data and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes('permission')) {
        errorMessage = "Permission denied. Please contact an administrator.";
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = "Request limit exceeded. Please try again later.";
      }
      
      return await interaction.reply({
        embeds: [createErrorEmbed("Request Creation Failed", errorMessage)],
        flags: MessageFlags.Ephemeral
      });
    }

    // 📩 Review Embed
    const reviewEmbed = new EmbedBuilder()
      .setTitle("🔎 LFT Request (Pending Review)")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(Colors.Grey)
      .setDescription(
        `>>> **User:** <@${user.id}>\n` +
        modalHandler.generateEmbedDescription(content, "lft", game)
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

    const reviewChannel = guild.channels.cache.get(channels.reviewChannelId);
    if (!reviewChannel) {
      logger.error(`Review channel not found: ${channels.reviewChannelId} for game ${game}`);
      const gameDisplayName = game.charAt(0).toUpperCase() + game.slice(1);
      return interaction.reply({
        embeds: [createErrorEmbed("Configuration Error", `Review channel not found for ${gameDisplayName}. Please contact an administrator.`)],
        flags: MessageFlags.Ephemeral
      });
    }
    
    let msg;
    try {
      msg = await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
    } catch (error) {
      logger.error(`Failed to send review message for request ${req._id}: ${error.message}`);
      
      // Rollback: Delete the created request since message sending failed
      try {
        await LFRequest.findByIdAndDelete(req._id);
        logger.info(`Successfully rolled back LFT request ${req._id} after message send failure`);
      } catch (rollbackError) {
        logger.error(`Failed to rollback LFT request ${req._id}: ${rollbackError.message}`);
        // Don't throw - we still want to inform the user of the error
      }
      
      return interaction.reply({
        embeds: [createErrorEmbed("Error", "Failed to send review message. Please try again.")],
        flags: MessageFlags.Ephemeral
      });
    }

    req.messageId = msg.id;
    await req.save();

    // Log the action
    await logLFAction(interaction.client, config, 'create', req, user);

    // ✅ Reply to user
    await interaction.reply({ 
      embeds: [createSuccessEmbed("Request Submitted", "Your LFT request has been submitted and is pending review by our staff team. You will be notified once it has been reviewed.", STATUS.PENDING)], 
      flags: MessageFlags.Ephemeral 
    });

    // 📩 DM Confirmation
    const dmEmbed = new EmbedBuilder()
      .setTitle("🔎 LFT Request Submitted")
      .setColor(Colors.Blue)
      .setDescription(
        `>>> **Game:** ${req.game}\n` +
        modalHandler.generateEmbedDescription(content, "lft", game) + '\n\n' +
        `**Status:** Pending Review\n` +
        `**Expires:** <t:${Math.floor(req.expiresAt.getTime() / 1000)}:R>\n`
      )
      .setFooter({ text: `Request ID: ${req._id}` })
      .setTimestamp();

    try {
      await user.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Could not DM user ${user.tag} (${user.id}) their LFT request confirmation.`);
    }

    } catch (error) {
      logger.error(`Error in LFT create modal for user ${user.id}: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      
      // Handle different types of errors
      let errorMessage = "An error occurred while creating your request. Please try again.";
      
      if (error.code === 11000) {
        errorMessage = "You already have a pending LFT request for this game. Please cancel it first using `/requests cancel`.";
        logger.info(`Duplicate key error for user ${user.id} in main catch block - user already has pending request`);
      } else if (error.name === 'ValidationError') {
        errorMessage = "Invalid request data. Please check your input and try again.";
      } else if (error.name === 'CastError') {
        errorMessage = "Invalid data format. Please try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      try {
        await interaction.reply({
          embeds: [createErrorEmbed("Request Creation Failed", errorMessage)],
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        logger.error(`Failed to send error reply to user ${user.id}: ${replyError.message}`);
      }
    }
  }
}

module.exports = LFTCreateModal;
