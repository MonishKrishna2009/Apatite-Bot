const { SlashCommandBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Command = require("../../Structure/Handlers/BaseCommand");
const {Logger} = require("../../Structure/Functions/index");
const logger = new Logger();

module.exports = class PurgeCommand extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("purge")
                .setDescription("Purge messages from a channel.")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("all")
                        .setDescription("Remove all messages.")
                        .addIntegerOption(option =>
                            option
                                .setName("count")
                                .setDescription("Number of messages to delete (1-100)")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("user")
                        .setDescription("Remove all messages from a specific user.")
                        .addIntegerOption(option =>
                            option
                                .setName("count")
                                .setDescription("Number of messages to delete (1-100)")
                                .setRequired(true)
                        )
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("User whose messages to delete")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("bot")
                        .setDescription("Remove messages from bot users.")
                        .addIntegerOption(option =>
                            option
                                .setName("count")
                                .setDescription("Number of messages to delete (1-100)")
                                .setRequired(true)
                        )
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .setDMPermission(false),
            options: {
                devOnly: false,
            },
        });
    }

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const amount = interaction.options.getInteger("count");

        if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: "I don't have permission to manage messages in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: "You don't have permission to manage messages in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }

        if (amount < 1 || amount > 100) {
            return interaction.reply({
                content: "Please provide a number between 1 and 100.",
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            let deletedMessages;

            switch (subcommand) {
                case "all":
                    const fetchAll = await interaction.channel.messages.fetch({ limit: amount });
                    deletedMessages = await interaction.channel.bulkDelete(fetchAll, true);
                    const embed = new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`Successfully deleted ${deletedMessages.size} messages.`)
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;

                case "bot":
                    const fetchBot = await interaction.channel.messages.fetch({ limit: amount });
                    const filteredBot = fetchBot.filter(m => m.author.bot);
                    deletedMessages = await interaction.channel.bulkDelete(filteredBot, true);
                    const botEmbed = new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`Successfully deleted ${deletedMessages.size} bot messages.`)
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                    await interaction.reply({ embeds: [botEmbed], flags: MessageFlags.Ephemeral });
                    break;

                case "user":
                    const user = interaction.options.getUser("user");
                    if (!user) {
                        return interaction.reply({
                            content: "User not provided.",
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                    const fetchUser = await interaction.channel.messages.fetch({ limit: amount });
                    const filteredUser = fetchUser.filter(m => m.author.id === user.id);
                    deletedMessages = await interaction.channel.bulkDelete(filteredUser, true);
                    const userEmbed = new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`Successfully deleted ${deletedMessages.size} messages from ${user.tag}.`)
                        .setTimestamp()
                        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                    await interaction.reply({ embeds: [userEmbed], flags: MessageFlags.Ephemeral });
                    break;

                default:
                    return interaction.reply({
                        content: "Invalid subcommand.",
                        flags: MessageFlags.Ephemeral,
                    });
            }

        } catch (error) {
            logger.error(`Error deleting messages: ${error.message}`);
            return interaction.reply({
                content: "There was an error trying to delete messages in this channel.",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
};