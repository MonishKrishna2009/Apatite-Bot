const Event = require("../../Structure/Handlers/BaseEvent.js");
const { jsonFind, Logger } = require("../../Structure/Functions/index.js");
const { Events, InteractionType, MessageFlags } = require("discord.js");
const logger = new Logger();

class InteractionCreate extends Event {
    constructor(client) {
        super(client, {
            name: Events.InteractionCreate,
        });
    }

    async execute(interaction) {
        const { client } = this;
        if (interaction.type !== InteractionType.ApplicationCommand) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        if (
            command.options?.devOnly &&
            !jsonFind(interaction.user.id, client.config.developers)
        ) {
            return await interaction.reply({
                content: `> You can not use this command. Only ${client.user.username}\`s developer can use this command.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        if (
            client.config.underDevelopment &&
            !jsonFind(interaction.guild, client.config.devGuilds) &&
            !jsonFind(interaction.guild, client.config.betaTestGuilds)
        ) {
            return await interaction.reply({
                content: "> This bot is under development please try again later",
                flags: MessageFlags.Ephemeral,
            });
        }

        try {
            await command.execute(interaction, client);
        } catch (error) {
            logger.error(error);
            if (interaction.replied) {
                await interaction.editReply({
                    content: "Catch an error while running this command.",
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: "Catch an error while running this command.",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }
}

module.exports = InteractionCreate;
