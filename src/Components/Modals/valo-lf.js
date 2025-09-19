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

class ValoLFModal extends Component {
  constructor(client) {
    super(client, { id: /^valo-lf-(.+)$/ }); // Regex match: valo-lf-p OR valo-lf-t
  }

  async execute(interaction) {
    const { guild, user, customId } = interaction;

    // Extract type from customId
    const type = customId.includes("valo-lf-p") ? "LFP" : "LFT";

    // 🧹 Cleanup old requests
    cleanupRequests(guild, user.id, type, config.valoPublicChannelId, config);

    // ✅ Check active request limit
    if (await checkActiveRequests(interaction, type, config)) return;

    // Collect modal fields based on type
    let content, embedTitle, dmTitle, embedDesc;
    if (type === "LFP") {
      const teamName = interaction.fields.getTextInputValue("teamName");
      const rolesNeeded = interaction.fields.getTextInputValue("rolesNeeded");
      const peekRank = interaction.fields.getTextInputValue("peekRank");
      const currentRank = interaction.fields.getTextInputValue("currentRank");
      const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

      content = { teamName, rolesNeeded, peekRank, currentRank, additionalInfo };
      embedTitle = "👥 LFP Request (Pending Review)";
      dmTitle = "👥 LFP Request Submitted";
      embedDesc =
        `>>> **User:** <@${user.id}>\n` +
        `**Team Name:** ${teamName}\n` +
        `**Roles Needed:** ${rolesNeeded}\n` +
        `**Peak Rank:** ${peekRank}\n` +
        `**Current Rank:** ${currentRank}\n` +
        `**Additional Info:** ${additionalInfo}`;
    } else {
      const riotID = interaction.fields.getTextInputValue("riotID");
      const rolesPlayed = interaction.fields.getTextInputValue("rolesPlayed");
      const peekRank = interaction.fields.getTextInputValue("peekRank");
      const recentTeams = interaction.fields.getTextInputValue("recentTeams") || "N/A";
      const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

      content = { riotID, rolesPlayed, peekRank, recentTeams, additionalInfo };
      embedTitle = "🔎 LFT Request (Pending Review)";
      dmTitle = "🔎 LFT Request Submitted";
      embedDesc =
        `>>> **User:** <@${user.id}>\n` +
        `**Riot ID:** ${riotID}\n` +
        `**Roles Played:** ${rolesPlayed}\n` +
        `**Peak/Current Rank:** ${peekRank}\n` +
        `**Recent Teams:** ${recentTeams}\n` +
        `**Additional Info:** ${additionalInfo}`;
    }

    // 💾 Save request
    const req = await LFRequest.create({
      userId: user.id,
      guildId: guild.id,
      type,
      game: "Valorant",
      status: "pending",
      createdAt: new Date(),
      content,
    });

    // 📩 Review Embed
    const reviewEmbed = new EmbedBuilder()
      .setTitle(embedTitle)
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

    const reviewChannel = guild.channels.cache.get(config.valoReviewChannelId);
    const msg = await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });

    req.messageId = msg.id;
    await req.save();

    // ✅ Reply to user
    const replyEmbed = new EmbedBuilder()
      .setTitle("✅ Request Submitted")
      .setColor(Colors.Green)
      .setDescription(
        "Your request has been submitted and is pending review by our staff team. You will be notified once it has been reviewed."
      )
      .setFooter({ text: `Request ID: ${req._id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });

    // 📩 DM Confirmation
    const dmEmbed = new EmbedBuilder()
      .setTitle(dmTitle)
      .setColor(Colors.Blue)
      .setDescription(embedDesc)
      .setFooter({ text: `Request ID: ${req._id}` })
      .setTimestamp();

    try {
      await user.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Could not DM user ${user.tag} (${user.id}) their ${type} request confirmation.`);
    }
  }
}

module.exports = ValoLFModal;
