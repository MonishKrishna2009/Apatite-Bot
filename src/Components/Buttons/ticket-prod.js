const { Logger } = require("../../Structure/Functions/Logger.js");
const logger = new Logger();
const Component = require("../../Structure/Handlers/BaseComponent.js");
const ticketSchema = require("../../Structure/Schemas/Ticket/ticketSchema.js");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, Colors } = require("discord.js");

const config = require("../../Structure/Configs/config.js");

class TickProdButton extends Component {
    constructor(client) {
        super(client, {
            id: "ticket-create-production",
            type: "BUTTON"
        });
    }
    /**
     * @param {import("discord.js").ButtonInteraction} interaction
     */
    async execute(interaction) {
        const { guild, channel, message, user, member } = interaction;

        const dataTicket = await ticketSchema.find({ guildId: guild.id, userId: user.id, isClose: false });

        if (config.ticketSystem === false) {
            return interaction.reply({
                content: "❌ Ticket system is disabled.",
                flags: MessageFlags.Ephemeral
            });
        }

        for (const ticket of dataTicket) {
            if (guild.channels.cache.get(ticket.channelId)) {
                const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`**❌ You already have an open ticket in <#${ticket.channelId}>.**`)
                    .setTimestamp()
                    .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() });
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }

        
        await interaction.reply({
            content: '⌛ Creating your ticket... **Please wait**.',
            flags: MessageFlags.Ephemeral
        });

        const rowConfig = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket-close-button')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket-delete-button')
                .setEmoji('🗑')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket-transcript-button')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary)
        );
        
        const ch = await guild.channels.create({
            name: `ticket-prod-${member.user.username}`,
            type: 0,
            parent: config.ticketCategoryId ?? null,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel']
                },
                {
                    id: config.ticketSupportRoleId,
                    allow: ['ViewChannel']
                }
            ]
        });

        ch.send({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: `${member.user.tag}'s ticket`, iconURL: member.displayAvatarURL() })
                    .setDescription(`Thanks for creating a ticket!\nSupport will be with you shortly\n\n🔒 - Close ticket\n🗑 - Delete ticket\n📝 - Transcript ticket`)
                    .addFields(
                        { name: 'Ticket Type:', value: 'Production Inquiry' },
                        { name: 'Ticket Owner:', value: `<@${user.id}>` },
                        { name: 'Created at:', value: `<t:${parseInt(ch.createdTimestamp / 1000)}:R>` }
                    )
                    .setColor('Green')
            ],
            components: [rowConfig]
        })

        let dataUpdate = new ticketSchema({
            guildId: guild.id,
            userId: user.id,
            channelId: ch.id,
            isClose: false
        });

        await dataUpdate.save();
        const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("Ticket Created")
            .setDescription(`Ticket created by ${user.tag} (${user.id})`)
            .addFields(
                { name: "Ticket ID", value: dataUpdate.userId, inline: true },
                { name: "Channel", value: `<#${ch.id}>`, inline: true },
                { name: "Ticket Type", value: "Production Inquiry", inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Ticket System`, iconURL: guild.iconURL() })
            logChannel.send({embeds: [logEmbed]});
        }

        return await interaction.editReply({
            content: `✅ Ticket created on **${ch}**.`,
            flags: MessageFlags.Ephemeral
        });

    }

}

module.exports = TickProdButton;