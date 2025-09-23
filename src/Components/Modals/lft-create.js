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

class LFTCreateModal extends Component {
  constructor(client) {
    super(client, { id: /^lft_create_(.+)$/ }); // Regex match: lft_create_valorant, lft_create_cs2, etc.
  }

  async execute(interaction) {
    const { guild, user, customId } = interaction;

    // Extract game from customId
    const game = customId.replace("lft_create_", "");

    // Get game-specific channels
    const channels = getGameChannels(config, game);
    
    // 🧹 Cleanup old requests
    await cleanupRequests(guild, user.id, "LFT", channels.publicChannelId, config);

    // ✅ Check active request limit
    if (await checkActiveRequests(interaction, "LFT", config)) return;

    // Extract content using modal handler
    const content = modalHandler.extractContent(interaction, "lft", game);

    // 💾 Save request
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.RequestExpiryDays);
    
    const req = await LFRequest.create({
      userId: user.id,
      guildId: guild.id,
      type: "LFT",
      game: game.charAt(0).toUpperCase() + game.slice(1),
      status: STATUS.PENDING,
      createdAt: now,
      expiresAt: expiresAt,
      content,
    });

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
  }
}

module.exports = LFTCreateModal;
