const Component = require("../../Structure/Handlers/BaseComponent");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const config = require("../../Structure/Configs/config");

const { Logger } = require("../../Structure/Functions/Logger");
const logger = new Logger();

class ValoLFPModal extends Component {
    constructor(client) {
        super(client, { id: "valolfpModal" });
    }

    async execute(interaction) {
        const { guild, user } = interaction;

        const teamName = interaction.fields.getTextInputValue("teamName");
        const rolesNeeded = interaction.fields.getTextInputValue("rolesNeeded");
        const peekRank = interaction.fields.getTextInputValue("peekRank");
        const currentRank = interaction.fields.getTextInputValue("currentRank");
        const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

        // Save to DB
        const req = await LFRequest.create({
            userId: user.id,
            guildId: guild.id,
            type: "LFP",
            game: "Valorant",
            content: { teamName, rolesNeeded, peekRank, currentRank, additionalInfo }
        });

        // Review Embed
        const embed = new EmbedBuilder()
            .setTitle("👥 LFP Request (Pending Review)")
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setColor(Colors.Grey)
            .setDescription(
                `>>> **User:** <@${user.id}>\n` +
                `**Team Name:** ${teamName}\n` +
                `**Roles Needed:** ${rolesNeeded}\n` +
                `**Peak Rank:** ${peekRank}\n` +
                `**Current Rank:** ${currentRank}\n` +
                `**Additional Info:** ${additionalInfo}`
            )
            .setFooter({ text: `Request ID: ${req._id}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`lfreview_${req._id}_approve`).setLabel("✅ Approve").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`lfreview_${req._id}_decline`).setLabel("❌ Decline").setStyle(ButtonStyle.Danger)
        );

        const reviewChannel = guild.channels.cache.get(config.valoReviewChannelId);
        const msg = await reviewChannel.send({ embeds: [embed], components: [row] });

        req.messageId = msg.id;
        await req.save();

        const replyEmbed = new EmbedBuilder()
            .setTitle("✅ Request Submitted")
            .setColor(Colors.Green)
            .setDescription("Your request has been submitted and is pending review by our staff team. You will be notified once it has been reviewed.")
            .setFooter({ text: `Request ID: ${req._id}` })
            .setTimestamp();
        await interaction.reply({embeds: [replyEmbed], flags: MessageFlags.Ephemeral });

        // DM requested details to the user as confirmation
        const dmEmbed = new EmbedBuilder()
            .setTitle("👥 LFP Request Submitted")
            .setColor(Colors.Blue)
            .setDescription(
                `You have submitted a Looking For Players (LFP) request. Here are the details:\n\n` +
                `> **Team Name:** ${teamName}\n` +
                `> **Roles Needed:** ${rolesNeeded}\n` +
                `> **Peak Rank:** ${peekRank}\n` +
                `> **Current Rank:** ${currentRank}\n` +
                `> **Additional Info:** ${additionalInfo}\n\n` +
                `You will be notified once your request has been reviewed by our staff team.`
            )
            .setFooter({ text: `Request ID: ${req._id}` })
            .setTimestamp();
        try {
            await user.send({ embeds: [dmEmbed] });
        } catch (err) {
            logger.warn(`Could not DM user ${user.tag} (${user.id}) their LFP request confirmation.`);
        }
    }
}

module.exports = ValoLFPModal;
