const { Logger } = require("../../Structure/Functions/Logger.js");
const logger = new Logger();
const Component = require("../../Structure/Handlers/BaseComponent.js");
const ticketSchema = require("../../Structure/Schemas/Ticket/ticketSchema.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, Colors } = require("discord.js");

const config = require("../../Structure/Configs/config.js");

class TickReopenButton extends Component {
    constructor(client) {
        super(client, {
            id: "ticket-reopen",
            type: "BUTTON"
        });
    }
    /**
     * @param {import("discord.js").ButtonInteraction} interaction
     */
    async execute(interaction) {
    // Make sure user does not spam the button
        const { guild, channel, user } = interaction;
        const dataTicket = await ticketSchema.findOne({ guildId: guild.id, channelId: channel.id });

        if (config.ticketSystem === false) {
            return interaction.reply({
                content: "❌ Ticket system is disabled.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Send confirmation message and wait for user response if no user response in 30 seconds, disable the button
        const confirmEmbed = new EmbedBuilder()
            .setColor("Yellow")
            .setDescription(`**Are you sure you want to reopen this ticket?**`)
            .setTimestamp()
            .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("reopen-confirm-ticket")
                    .setEmoji("✔️")
                    .setLabel("Yes")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("reopen-cancel-ticket")
                    .setEmoji("❌")
                    .setLabel("No")
                    .setStyle(ButtonStyle.Secondary)
                );
        await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], flags: MessageFlags.Ephemeral });
        const filter = i => i.user.id === user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30_000});

        collector.on("collect", async i => {
            if (i.customId === "reopen-confirm-ticket") {
                // Logic to reopen the ticket
                dataTicket.isClose = false;
                await dataTicket.save();

                channel.permissionOverwrites.edit(dataTicket.userId,
                    { SendMessages: true }
                );

                const reopenEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setDescription(`**✅ Ticket has been reopened successfully!**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                await i.update({ embeds: [reopenEmbed], components: [], flags: MessageFlags.Ephemeral });

                channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setDescription(`**✅ Ticket has been reopened successfully!**\n <@&${config.ticketSupportRoleId}> will assist you shortly.`)
                            .setTimestamp()
                            .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() })
                    ]
                });

                // disable the reopen button
                const updatedRow = ActionRowBuilder.from(interaction.message.components[0]);
                updatedRow.components.forEach(c => {
                    if (c.data.custom_id === "ticket-reopen") {
                        c.setDisabled(true);
                    }
                });
                await interaction.message.edit({ components: [updatedRow] });

                const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
                if (logChannel) {
                    const logEmbed = this.client.logManager.createLogEmbed(
                        "TICKET_REOPEN",
                        Colors.Blue,
                        "**Ticket Reopened**",
                        `>>> **Reopened By**: ${user.tag} (\`${user.id}\`)\n` +
                        `**Owner**: <@${dataTicket.userId}> (\`${dataTicket.userId}\`)\n` +
                        `**Channel**: <#${channel.id}>`
                    );

                    logEmbed.setFooter({
                        text: `Ticket System • ${new Date().toLocaleTimeString()}`,
                        iconURL: guild.iconURL()
                    });

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } else if (i.customId === "reopen-cancel-ticket") {
                const cancelEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`**❌ Ticket reopening has been cancelled.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                await i.update({ embeds: [cancelEmbed], components: [] });
            }
        });

        collector.on("end", collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`**❌ Ticket reopening has timed out. Please try again.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        });
    }

}

module.exports = TickReopenButton;