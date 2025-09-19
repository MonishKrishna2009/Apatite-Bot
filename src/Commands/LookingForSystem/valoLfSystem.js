const Command = require("../../Structure/Handlers/BaseCommand");
const { SlashCommandBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require("discord.js");

class LFSys extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("valo-looking-for")
                .setDescription("Send a request to find a team or players.")
                .addSubcommand(sub =>
                    sub.setName("players").setDescription("Looking for players (LFP)")
                )
                .addSubcommand(sub =>
                    sub.setName("team").setDescription("Looking for a team (LFT)")
                )
                .setDMPermission(false),
            options: { devOnly: false },
        });
    }

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        if (this.client.config.lfpLftSystem !== true) {
            return interaction.reply({
                content: " ❌ LFP/LFT system is disabled",
                flags: MessageFlags.Ephemeral
            });
        }

        if (sub === "players") {
            const modal = new ModalBuilder()
                .setCustomId("valo-lf-p")
                .setTitle("Looking For Players");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("teamName").setLabel("Team Name").setPlaceholder("eg. Apatite").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("rolesNeeded").setLabel("Roles Needed").setPlaceholder("eg: sentinel, duelist etc...").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("peekRank").setLabel("Peak Rank").setPlaceholder("eg: Immortal 3").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("currentRank").setLabel("Current Rank").setPlaceholder("eg: Diamond 1").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("additionalInfo").setLabel("Additional Info").setPlaceholder("Availability, languages, flexibility etc... (optional)").setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(3000)
                )
            );

            return interaction.showModal(modal);
        }

        if (sub === "team") {
            const modal = new ModalBuilder()
                .setCustomId("valo-lf-t")
                .setTitle("Looking For Team");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("riotID").setLabel("Riot ID").setPlaceholder("eg. Apatite#SA1").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("rolesPlayed").setLabel("Roles Played").setPlaceholder("eg: sentinel, duelist etc...").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("peekRank").setLabel("Peak/Current Rank").setPlaceholder("eg: Immortal 3").setStyle(TextInputStyle.Short).setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("recentTeams").setLabel("Recent Teams").setPlaceholder("eg: Apatite Weekly scrims (optional)").setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(300)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("additionalInfo").setLabel("Details").setPlaceholder("Availability, languages, scrim times etc... (optional)").setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(3000)
                )
            );

            return interaction.showModal(modal);
        }
    }
}

module.exports = LFSys;
