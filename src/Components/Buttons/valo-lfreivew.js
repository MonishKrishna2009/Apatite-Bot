const Component = require("../../Structure/Handlers/BaseComponent");
const { EmbedBuilder, Colors, MessageFlags, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const config = require("../../Structure/Configs/config");
const { Logger } = require("../../Structure/Functions/Logger");
const logger = new Logger();

class ValoReviewHandler extends Component {
    constructor(client) {
        super(client, { id: /^valoreview_.+/ }); // regex match
    }

    async execute(interaction) {
        const [ , requestId, action ] = interaction.customId.split("_");
        const req = await LFRequest.findById(requestId);
        if (!req) return interaction.reply({ content: "❌ Request not found.", flags: MessageFlags.Ephemeral });

        if (req.status !== "pending") {
            return interaction.reply({ content: "⚠️ This request has already been reviewed.", flags: MessageFlags.Ephemeral });
        }

        req.status = action === "approve" ? "approved" : "declined";
        req.reviewedBy = interaction.user.id;
        await req.save();

        // Update review embed
        const oldEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
            .setColor(action === "approve" ? Colors.Green : Colors.Red)
            .setFooter({ text: `Reviewed by ${interaction.user.tag} | Request ID: ${req._id}` });

        await interaction.update({ embeds: [newEmbed], components: [] });

        // DM User
        try {
            const target = await interaction.client.users.fetch(req.userId);
            const approveEmbed = new EmbedBuilder()
                .setTitle(action === "approve" ? "✅ Request Approved" : "❌ Request Declined")
                .setColor(action === "approve" ? Colors.Green : Colors.Red)
                .setDescription(
                    action === "approve"
                        ? `Your ${req.type} request has been approved and will be posted in <#${config.valolfpLftChannelId}>.`
                        : `Your ${req.type} request has been declined by the staff.`
                )
                .setFooter({ text: `Request ID: ${req._id}` })
                .setTimestamp();
            await target.send({ embeds: [approveEmbed] });
        } catch (err) {
            logger.warn(`Failed to DM user ${req.userId} about their ${req.type} request.`);
        }

        // If approved → post to public channel
        if (action === "approve") {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                .setLabel(req.type === "LFP" ? "DM Contract" : "DM Player")
                .setStyle("Link")
                .setURL(`https://discord.com/users/${req.userId}`)
            );
            const publicEmbed = EmbedBuilder.from(newEmbed)
                .setTitle(req.type === "LFP" ? "📢 Looking For Players" : "📢 Looking For Team")
                .setColor(req.type === "LFP" ? Colors.Blue : Colors.Purple);

            const publicChannel = interaction.guild.channels.cache.get(config.valolfpLftChannelId);
            await publicChannel.send({ embeds: [publicEmbed], components: [row]});
        }
    }
}

module.exports = ValoReviewHandler;
