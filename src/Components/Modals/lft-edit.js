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

class LFTEditModal extends Component {
  constructor(client) {
    super(client, { id: /^lft_edit_(.+)$/ }); // Regex match: lft_edit_[requestId]
  }

  async execute(interaction) {
    const { guild, user, customId } = interaction;

    // Extract request ID from customId
    const requestId = customId.replace("lft_edit_", "");

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

    // Collect modal fields based on game
    let content, embedDesc;
    
    switch (req.game.toLowerCase()) {
      case "valorant":
        const riotID = interaction.fields.getTextInputValue("riotID");
        const rolesPlayed = interaction.fields.getTextInputValue("rolesPlayed");
        const peakRank = interaction.fields.getTextInputValue("peakRank");
        const recentTeams = interaction.fields.getTextInputValue("recentTeams") || "N/A";
        const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

        content = { riotID, rolesPlayed, peakRank, recentTeams, additionalInfo };
        embedDesc = 
          `>>> **User:** <@${user.id}>\n` +
          `**Riot ID:** ${riotID}\n` +
          `**Roles Played:** ${rolesPlayed}\n` +
          `**Peak/Current Rank:** ${peakRank}\n` +
          `**Recent Teams:** ${recentTeams}\n` +
          `**Additional Info:** ${additionalInfo}`;
        break;
      
      case "cs2":
        const steamID = interaction.fields.getTextInputValue("steamID");
        const cs2RolesPlayed = interaction.fields.getTextInputValue("rolesPlayed");
        const cs2PeakRank = interaction.fields.getTextInputValue("peakRank");
        const cs2RecentTeams = interaction.fields.getTextInputValue("recentTeams") || "N/A";
        const cs2AdditionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

        content = { steamID, rolesPlayed: cs2RolesPlayed, peakRank: cs2PeakRank, recentTeams: cs2RecentTeams, additionalInfo: cs2AdditionalInfo };
        embedDesc = 
          `>>> **User:** <@${user.id}>\n` +
          `**Steam ID:** ${steamID}\n` +
          `**Roles Played:** ${cs2RolesPlayed}\n` +
          `**Peak/Current Rank:** ${cs2PeakRank}\n` +
          `**Recent Teams:** ${cs2RecentTeams}\n` +
          `**Additional Info:** ${cs2AdditionalInfo}`;
        break;
      
      case "lol":
        const summonerName = interaction.fields.getTextInputValue("summonerName");
        const lolRolesPlayed = interaction.fields.getTextInputValue("rolesPlayed");
        const lolPeakRank = interaction.fields.getTextInputValue("peakRank");
        const lolRecentTeams = interaction.fields.getTextInputValue("recentTeams") || "N/A";
        const lolAdditionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

        content = { summonerName, rolesPlayed: lolRolesPlayed, peakRank: lolPeakRank, recentTeams: lolRecentTeams, additionalInfo: lolAdditionalInfo };
        embedDesc = 
          `>>> **User:** <@${user.id}>\n` +
          `**Summoner Name:** ${summonerName}\n` +
          `**Roles Played:** ${lolRolesPlayed}\n` +
          `**Peak/Current Rank:** ${lolPeakRank}\n` +
          `**Recent Teams:** ${lolRecentTeams}\n` +
          `**Additional Info:** ${lolAdditionalInfo}`;
        break;
    }

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
      .setTitle("🔎 LFT Request (Pending Review)")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(Colors.Grey)
      .setDescription(embedDesc)
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
      embeds: [createSuccessEmbed("Request Updated", `Your LFT request \`${req._id}\` has been updated successfully.`, req.status)],
      flags: MessageFlags.Ephemeral
    });

    // 📩 DM Notification
    try {
      const editDmEmbed = new EmbedBuilder()
        .setTitle("✏️ LFT Request Updated")
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
      logger.warn(`Could not DM user ${user.tag} (${user.id}) about their LFT request edit.`);
    }
  }
}

module.exports = LFTEditModal;
