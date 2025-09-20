const { Logger } = require("../../Structure/Functions/Logger.js");
const logger = new Logger();
const Component = require("../../Structure/Handlers/BaseComponent.js");
const ticketSchema = require("../../Structure/Schemas/Ticket/ticketSchema.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, Colors } = require("discord.js");

const html = require('discord-html-transcripts')

const config = require("../../Structure/Configs/config.js");

class TickTransButton extends Component {
    constructor(client) {
        super(client, {
            id: "ticket-transcript-button",
            type: "BUTTON"
        });
    }
    /**
     * @param {import("discord.js").ButtonInteraction} interaction
     */
    async execute(interaction) {
        const { guild, channel, member } = interaction;

        const dataTicket = await ticketSchema.findOne({ guildId: guild.id, channelId: channel.id });

        if (config.ticketSystem === false) {
            return interaction.reply({
                content: "❌ Ticket system is disabled.",
                flags: MessageFlags.Ephemeral
            });
        }
        
        const supportRole = config.ticketSupportRoleId;

        // Combined permission check: block if member lacks both supportRole and Administrator
        if (!interaction.member.roles.cache.has(supportRole) && !interaction.member.permissions.has("Administrator")) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor(Colors.Red)
                .setDescription("You do not have permission to use this button.")
                .setFooter({ text: "You need the support role or Administrator permission to use this button." })
                .setTimestamp();
            return interaction.reply({
                embeds: [noPermsEmbed],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setDescription("Generating transcript... Please wait.")
            .setFooter({ text: "Ticket System", iconURL: guild.iconURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        const transcript = await html.createTranscript(channel, {
            limit: -1,
            returnBuffer: false,
            fileName: `${channel.name}-transcript.html`
        });
        
        const successEmbed = new EmbedBuilder()
            .setColor(Colors.Green)
            .setDescription("Transcript generated successfully!\nCheck the log channel for the transcript file.")
            .setFooter({ text: "Ticket System", iconURL: guild.iconURL() })
            .setTimestamp();
        await interaction.editReply({ embeds: [successEmbed] });

        const logChannel = guild.channels.cache.get(config.ticketTranscriptChannelId);
        if (logChannel) {
            const logEmbed = this.client.logManager.createLogEmbed(
                "TICKET_TRANSCRIPT",
                Colors.Blue,
                "**Ticket Transcript Generated**",
                `>>> **Channel**: ${channel.name} (\`${channel.id}\`)\n` +
                `**Transcript File**: Attached below`
            );

            logEmbed.setFooter({
                text: `Ticket System • ${new Date().toLocaleTimeString()}`,
                iconURL: guild.iconURL()
            });

            await logChannel.send({
                embeds: [logEmbed],
                files: [transcript] // transcript file attachment
            });
        }


    }

}

module.exports = TickTransButton;