const { Logger } = require("../../Structure/Functions/Logger.js");
const logger = new Logger();
const Component = require("../../Structure/Handlers/BaseComponent.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, Colors, TextInputStyle } = require("discord.js");

const config = require("../../Structure/Configs/config.js");

class ValoLFTModal extends Component {
    constructor(client) {
        super(client, {
            id: "valolftModal",
        });
    }
    /**
     * @param {import("discord.js").ModalSubmitInteraction} interaction
     */
    async execute(interaction) {
        const { guild, channel, message, user, member } = interaction;

        const riotID = interaction.fields.getTextInputValue("riotID");
        const rolesPlayed = interaction.fields.getTextInputValue("rolesPlayed");
        const peekRank = interaction.fields.getTextInputValue("peekRank");
        const recentTeams = interaction.fields.getTextInputValue("recentTeams") || "N/A";
        const additionalInfo = interaction.fields.getTextInputValue("additionalInfo") || "N/A";

        const embed = new EmbedBuilder()
            .setTitle("Looking For Team")
            .setColor(Colors.Blue)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`**<@${user.id}> is looking for a team!**\n` +
                `\n>>> **Riot ID:** ${riotID}` +
                `\n**Roles Played:** ${rolesPlayed}` +
                `\n**Peak/Current Rank:** ${peekRank}` +
                `\n**Recent Teams:** ${recentTeams}` +
                `\n**Additional Info:** ${additionalInfo}`
            )
            .setFooter({ text: `User ID: ${user.id}` })
            .setTimestamp();
        try {
            const ch = guild.channels.cache.get(config.valolfpLftChannelId);
            await ch.send({ embeds: [embed] });
        }
        catch (err) {
            logger.error(err);
            return interaction.reply({ content: "There was an error sending your looking for team message. Please try again later.", flags: MessageFlags.Ephemeral });
        }


        const replyEmbed = new EmbedBuilder()
            .setTitle("Request Sent")
            .setColor(Colors.Green)
            .setDescription("Your looking for team request has been sent!")
            .setTimestamp();
        await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });

    }
}

module.exports = ValoLFTModal;