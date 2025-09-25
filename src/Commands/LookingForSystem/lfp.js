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

const Command = require("../../Structure/Handlers/BaseCommand");
const { 
    SlashCommandBuilder, 
    MessageFlags
} = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const { 
  STATUS, 
  isValidRequestId, 
  canUserPerformAction, 
  createErrorEmbed, 
  createSuccessEmbed,
  cleanupRequests
} = require("../../Structure/Functions/LFSystem/lfHelpers");
const { getGameChannels } = require("../../Structure/Functions/LFSystem/lfActionLogger");
const { checkActiveRequests } = require("../../Structure/Functions/LFSystem/activeRequest");
const modalHandler = require("../../Structure/Functions/LFSystem/modalHandler");
const config = require("../../Structure/Configs/config");
const { Logger } = require("../../Structure/Functions/Logger");
const logger = new Logger();

class LFPSys extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("lfp")
                .setDescription("Looking For Players - Create and manage LFP requests")
                .addSubcommand(sub =>
                    sub.setName("create")
                        .setDescription("Create a new LFP request")
                        .addStringOption(option => {
                            const gameChoices = modalHandler.getGameChoices("lfp");
                            const gameOption = option
                                .setName("game")
                                .setDescription("Select the game")
                                .setRequired(true);
                            
                            // Add choices dynamically from config
                            gameChoices.forEach(choice => {
                                gameOption.addChoices(choice);
                            });
                            
                            return gameOption;
                        })
                )
                .addSubcommand(sub =>
                    sub.setName("edit")
                        .setDescription("Edit an existing LFP request")
                        .addStringOption(option =>
                            option.setName("request_id")
                                .setDescription("The ID of the request to edit")
                                .setRequired(true)
                        )
                )
                .setDMPermission(false),
            options: { devOnly: false },
        });
    }

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        // Check if LFP/LFT system is enabled
        if (!this.client.config.lfpLftSystem) {
            return interaction.reply({
                embeds: [createErrorEmbed("System Disabled", "The LFP/LFT system is currently disabled.")],
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            switch (sub) {
                case "create":
                    await this.handleCreate(interaction);
                    break;
                case "edit":
                    await this.handleEdit(interaction);
                    break;
            }
        } catch (error) {
            logger.error(`LFP command error: ${error.stack}`);
            return interaction.reply({
                embeds: [createErrorEmbed("Error", "An error occurred while processing your request.")],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleCreate(interaction) {
        const game = interaction.options.getString("game");
        
        // Get game-specific channels
        const channels = getGameChannels(config, game);
    

        // Create modal based on game using modal handler
        const modal = modalHandler.createCreateModal("lfp", game);
        if (!modal) {
            return interaction.reply({
                embeds: [createErrorEmbed("Configuration Error", `Game configuration not found for ${game}.`)],
                flags: MessageFlags.Ephemeral
            });
        }
        return interaction.showModal(modal);
    }

    async handleEdit(interaction) {
        const requestId = interaction.options.getString("request_id");
        
        // Validate request ID
        if (!isValidRequestId(requestId)) {
            return interaction.reply({
                embeds: [createErrorEmbed("Invalid Request ID", "That doesn't look like a valid request ID.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Find request
        const request = await LFRequest.findById(requestId);
        if (!request) {
            return interaction.reply({
                embeds: [createErrorEmbed("Request Not Found", "No request found with that ID.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Check permissions
        const permissionCheck = canUserPerformAction(request, interaction.user.id, "edit");
        if (!permissionCheck.allowed) {
            return interaction.reply({
                embeds: [createErrorEmbed("Cannot Edit", permissionCheck.reason, request.status)],
                flags: MessageFlags.Ephemeral
            });
        }

        // Create edit modal using modal handler
        const modal = modalHandler.createEditModal("lfp", request);
        if (!modal) {
            return interaction.reply({
                embeds: [createErrorEmbed("Configuration Error", `Game configuration not found for ${request.game}.`)],
                flags: MessageFlags.Ephemeral
            });
        }
        return interaction.showModal(modal);
    }


}

module.exports = LFPSys;