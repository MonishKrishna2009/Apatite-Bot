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
const { cleanupRequests } = require("../../Structure/Functions/requestCleanup");
const { checkActiveRequests } = require("../../Structure/Functions/activeRequest");
const { STATUS, createSuccessEmbed, createErrorEmbed } = require("../../Structure/Functions/lfHelpers");
const { logLFAction, getGameChannels } = require("../../Structure/Functions/lfActionLogger");

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

    // Collect modal fields
    const teamName = interaction.fields.getTextInputValue("teamName");
    const rolesNeeded = interaction.fields.getTextInputValue("rolesNeeded");
    const peakRank = interaction.fields.getTextInputValue("peakRank");
    const currentRank = interaction.fields.getTextInputValue("currentRank");
    const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

    const content = { teamName, rolesNeeded, peakRank, currentRank, additionalInfo };

    // 💾 Save request
    const req = await LFRequest.create({
      userId: user.id,
      guildId: guild.id,
      type: "LFP",
      game: game.charAt(0).toUpperCase() + game.slice(1),
      status: STATUS.PENDING,
      createdAt: new Date(),
      content,
    });

    // 📩 Review Embed
    const reviewEmbed = new EmbedBuilder()
      .setTitle("👥 LFP Request (Pending Review)")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(Colors.Grey)
      .setDescription(
        `>>> **User:** <@${user.id}>\n` +
        `**Team Name:** ${teamName}\n` +
        `**Roles Needed:** ${rolesNeeded}\n` +
        `**Peak Rank:** ${peakRank}\n` +
        `**Current Rank:** ${currentRank}\n` +
        `**Additional Info:** ${additionalInfo}`
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
        `**Team Name:** ${teamName}\n` +
        `**Roles Needed:** ${rolesNeeded}\n` +
        `**Peak Rank:** ${peakRank}\n` +
        `**Current Rank:** ${currentRank}\n` +
        `**Additional Info:** ${additionalInfo}\n\n` +
        `**Status:** Pending Review\n`
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
