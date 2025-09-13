const Command = require("../../Structure/Handlers/BaseCommand");
const { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags, ActionRowBuilder, ActionRow, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const checkValoCooldown = require("../../Structure/Functions/valoLfCooldown");

class LFSys extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("valo-looking-for")
                .setDescription("Send a message to the LFP/LFT channel!")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("players")
                        .setDescription("Looking for players")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("team")
                        .setDescription("Looking for a team")
                )
                .setDMPermission(false),
            options: {
                devOnly: false,
            },
        });
    }
    async execute(interaction, client) {
        const { guild } = interaction;
        const subcommand = interaction.options.getSubcommand();

        // Check cooldown
        const cooldownMs = 1000 * 60 * 10; // 10 min cooldown
        const cd = await checkValoCooldown(interaction.user.id, interaction.guild.id, subcommand, cooldownMs);
        if (cd.onCooldown) {
            return interaction.reply({
                content: `⏳ You must wait **${cd.timeLeft} minute(s)** before using \`${subcommand.toUpperCase()}\` again.`,
                ephemeral: true
            });
        }

        if (subcommand === "players") {
            const modal = new ModalBuilder()
                .setCustomId('valolfpModal')
                .setTitle('Looking For Players');
            const row = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('teamName')
                        .setLabel("What is your team's name?")
                        .setPlaceholder("eg. Apatite")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('rolesNeeded')
                        .setLabel("What roles are you looking for?")
                        .setPlaceholder("eg: sentinel, duelist etc...")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            const row3 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('peekRank')
                        .setLabel("What is your peak rank?")
                        .setPlaceholder("eg: Immortal 3")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            const row4 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('currentRank')
                        .setLabel("What is your current rank?")
                        .setPlaceholder("eg: Diamond 1")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            const row5 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('additionalInfo')
                        .setLabel("Additional information")
                        .setPlaceholder("Availability, languages, flexibility etc... (optional)")
                        .setMaxLength(3000)
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                );
            modal.addComponents(row, row2, row3, row4, row5);
            await interaction.showModal(modal);
        }
        if (subcommand === "team") {
            const modal = new ModalBuilder()
                .setCustomId('valolftModal')
                .setTitle('Looking For Team');
            const row = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('riotID')
                        .setLabel("What is your Riot ID?")
                        .setPlaceholder("eg. Apatite#SA1")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('rolesPlayed')
                        .setLabel("What roles do you play?")
                        .setPlaceholder("eg: sentinel, duelist etc...")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            const row3 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('peekRank')
                        .setLabel("What is your peak rank/current rank")
                        .setPlaceholder("eg: Immortal 3")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                );
            const row4 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('recentTeams')
                        .setLabel("What teams have you played for recently?")
                        .setPlaceholder("eg: Apatite Weekly scrims (optional)")
                        .setMaxLength(300)
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                );
            const row5 = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('additionalInfo')
                        .setLabel("Details")
                        .setPlaceholder("Availability, languages, scrim times etc... (optional)")
                        .setMaxLength(3000)
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                );
            modal.addComponents(row, row2, row3, row4, row5);
            await interaction.showModal(modal);
        }

    }

}

module.exports = LFSys;