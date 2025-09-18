const Component = require("../../Structure/Handlers/BaseComponent");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const config = require("../../Structure/Configs/config");

const { Logger } = require("../../Structure/Functions/Logger");
const logger = new Logger();

class ValoLFTModal extends Component {
    constructor(client) {
        super(client, { id: "valolftModal" });
    }

    async execute(interaction) {
        const { guild, user } = interaction;

        // 🧹 On-demand cleanup for expired and archived requests
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - config.RequestExpiryDays);

        await LFRequest.updateMany(
            {
                userId: user.id,
                guildId: guild.id,
                type: "LFT",
                status: { $in: ["pending"] },
                createdAt: { $lt: expiryDate }
            },
            { $set: { status: "expired" } }
        );

        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - config.RequstArchiveDays)

        await LFRequest.updateMany(
            {
                userId: user.id,
                guildId: guild.id,
                type: "LFT",
                status: { $in: ["approved"] },
                createdAt: { $lt: archiveDate }
            },
            { $set: { status: "archived" } }
        );


        // ✅ Count active requests after cleanup
        const activeRequest = await LFRequest.countDocuments({
            userId: user.id,
            guildId: guild.id,
            type: "LFT",
            status: { $in: ["pending", "approved"] }
        })

        if (activeRequest >= config.MaxActiveRequest) {
            const limitEmbed = new EmbedBuilder()
                .setTitle("⚠️ Request Limit Reached")
                .setColor(Colors.Red)
                .setDescription(
                    `You already have **${activeRequest} active LFP requests**. The maximum allowed is **${config.MaxActiveRequest}**.\n\n` +
                    `Please cancel or wait for existing requests to expire before creating new ones.`
                )
                .setTimestamp();

            return interaction.reply({ embeds: [limitEmbed], flags: MessageFlags.Ephemeral });
        }

        const riotID = interaction.fields.getTextInputValue("riotID");
        const rolesPlayed = interaction.fields.getTextInputValue("rolesPlayed");
        const peekRank = interaction.fields.getTextInputValue("peekRank");
        const recentTeams = interaction.fields.getTextInputValue("recentTeams") || "N/A";
        const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

        // Save to DB
        const req = await LFRequest.create({
            userId: user.id,
            guildId: guild.id,
            type: "LFT",
            game: "Valorant",
            content: { riotID, rolesPlayed, peekRank, recentTeams, additionalInfo }
        });

        // Review Embed
        const embed = new EmbedBuilder()
            .setTitle("🔎 LFT Request (Pending Review)")
            .setColor(Colors.Grey)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `>>> **User:** <@${user.id}>\n` +
                `**Riot ID:** ${riotID}\n` +
                `**Roles Played:** ${rolesPlayed}\n` +
                `**Peak/Current Rank:** ${peekRank}\n` +
                `**Recent Teams:** ${recentTeams}\n` +
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
            .setTitle("🔎 LFT Request Submitted")
            .setColor(Colors.Green)
            .setDescription(
                `Your LFT request has been submitted successfully and is pending review by our staff team. You will be notified once it has been reviewed.\n\n` +
                `**Riot ID:** ${riotID}\n` +
                `**Roles Played:** ${rolesPlayed}\n` +
                `**Peak/Current Rank:** ${peekRank}\n` +
                `**Recent Teams:** ${recentTeams}\n` +
                `**Additional Info:** ${additionalInfo}`
            )
            .setFooter({ text: `Request ID: ${req._id}` })
            .setTimestamp();
        try {
            await user.send({ embeds: [dmEmbed] });
        } catch (err) {
            logger.warn(`Failed to DM user ${user.id} about their LFT request.`);
        }
    }
}

module.exports = ValoLFTModal;
