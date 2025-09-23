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

    // Collect modal fields based on game
    let content, embedDesc;
    
    switch (game) {
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

    // 💾 Save request
    const req = await LFRequest.create({
      userId: user.id,
      guildId: guild.id,
      type: "LFT",
      game: game.charAt(0).toUpperCase() + game.slice(1),
      status: STATUS.PENDING,
      createdAt: new Date(),
      content,
    });

    // 📩 Review Embed
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

    const reviewChannel = guild.channels.cache.get(channels.reviewChannelId);
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
        embedDesc.replace('>>> ', '') + '\n\n' +
        `**Status:** Pending Review\n`
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
