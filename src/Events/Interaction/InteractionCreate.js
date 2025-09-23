/*
 * Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.
 *
 * Copyright (C) 2025 Monish Krishna
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
