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
const { cleanupRequests } = require("../../Structure/Functions/LFSystem/requestCleanup");
const { checkActiveRequests } = require("../../Structure/Functions/LFSystem/activeRequest");
const { STATUS, createSuccessEmbed, createErrorEmbed } = require("../../Structure/Functions/LFSystem/lfHelpers");
const { logLFAction, getGameChannels } = require("../../Structure/Functions/LFSystem/lfActionLogger");
const modalHandler = require("../../Structure/Functions/LFSystem/modalHandler");

class LFPCreateModal extends Component {
  constructor(client) {
    super(client, { id: /^lfp_create_(.+)$/ }); // Regex match: lfp_create_valorant, lfp_create_cs2, etc.
  }

  async execute(interaction) {
    const { guild, user, customId } = interaction;

    // Extract game from customId
    const game = customId.replace("lfp_create_", "");

    // Get game-specific channels
    const channels = getGameChannels(config, game);
    
    // 🧹 Cleanup old requests
    await cleanupRequests(guild, user.id, "LFP", channels.publicChannelId, config);

    // ✅ Check active request limit
    if (await checkActiveRequests(interaction, "LFP", config)) return;

    // Extract content using modal handler
    const content = modalHandler.extractContent(interaction, "lfp", game);

    // 💾 Save request
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.RequestExpiryDays);
    
    const req = await LFRequest.create({
      userId: user.id,
      guildId: guild.id,
      type: "LFP",
      game: game.charAt(0).toUpperCase() + game.slice(1),
      status: STATUS.PENDING,
      createdAt: now,
      expiresAt: expiresAt,
      content,
    });

    // 📩 Review Embed
    const reviewEmbed = new EmbedBuilder()
      .setTitle("👥 LFP Request (Pending Review)")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(Colors.Grey)
      .setDescription(
        `>>> **User:** <@${user.id}>\n` +
        modalHandler.generateEmbedDescription(content, "lfp", game)
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
      return interaction.reply({
        embeds: [createErrorEmbed("Configuration Error", `Review channel not found for ${game}. Please contact an administrator.`)],
        flags: MessageFlags.Ephemeral
      });
    }
    const msg = await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });

    req.messageId = msg.id;
    await req.save();

    // Log the action
    await logLFAction(interaction.client, config, 'create', req, user);

    // ✅ Reply to user
    await interaction.reply({ 
      embeds: [createSuccessEmbed("Request Submitted", "Your LFP request has been submitted and is pending review by our staff team. You will be notified once it has been reviewed.", STATUS.PENDING)], 
      flags: MessageFlags.Ephemeral 
    });

    // 📩 DM Confirmation
    const dmEmbed = new EmbedBuilder()
      .setTitle("👥 LFP Request Submitted")
      .setColor(Colors.Blue)
      .setDescription(
        `>>> **Game:** ${req.game}\n` +
        `**User:** <@${user.id}>\n` +
        modalHandler.generateEmbedDescription(content, "lfp", game) + '\n\n' +
        `**Status:** Pending Review\n` +
        `**Expires:** <t:${Math.floor(req.expiresAt.getTime() / 1000)}:R>\n`
      )
      .setFooter({ text: `Request ID: ${req._id}` })
      .setTimestamp();

    try {
      await user.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Could not DM user ${user.tag} (${user.id}) their LFP request confirmation.`);
    }
  }
}

module.exports = LFPCreateModal;
