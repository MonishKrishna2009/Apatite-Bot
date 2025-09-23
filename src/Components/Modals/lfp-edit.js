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
const { STATUS, createSuccessEmbed, createErrorEmbed, canUserPerformAction } = require("../../Structure/Functions/lfHelpers");
const { logLFAction, getGameChannels } = require("../../Structure/Functions/lfActionLogger");

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

    // Collect modal fields
    const teamName = interaction.fields.getTextInputValue("teamName");
    const rolesNeeded = interaction.fields.getTextInputValue("rolesNeeded");
    const peakRank = interaction.fields.getTextInputValue("peakRank");
    const currentRank = interaction.fields.getTextInputValue("currentRank");
    const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

    const content = { teamName, rolesNeeded, peakRank, currentRank, additionalInfo };

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

      // Reset request to pending
      req.status = STATUS.PENDING;
      req.reviewedBy = null;
      req.publicMessageId = null;
      req.messageId = null;
    }

    // Update request content
    req.content = content;
    await req.save();

    // Create new review message
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

    // Send to review channel
    const reviewChannel = guild.channels.cache.get(channels.reviewChannelId);
    const reviewMsg = await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
    
    req.messageId = reviewMsg.id;
    await req.save();

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
          `**Action:** Your request has been updated and ${req.status === STATUS.PENDING ? 'sent for review' : 'updated'}\n`
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
