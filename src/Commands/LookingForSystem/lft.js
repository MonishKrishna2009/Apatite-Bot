const Command = require("../../Structure/Handlers/BaseCommand");
const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    ActionRowBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    MessageFlags,
    EmbedBuilder,
    Colors
} = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const { 
  STATUS, 
  isValidRequestId, 
  canUserPerformAction, 
  createErrorEmbed, 
  createSuccessEmbed,
  createWarningEmbed,
  getRequestPreview,
  cleanupRequests
} = require("../../Structure/Functions/lfHelpers");
const { getGameChannels } = require("../../Structure/Functions/lfActionLogger");
const { checkActiveRequests } = require("../../Structure/Functions/activeRequest");
const config = require("../../Structure/Configs/config");

class LFTSys extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("lft")
                .setDescription("Looking For Team - Create and manage LFT requests")
                .addSubcommand(sub =>
                    sub.setName("create")
                        .setDescription("Create a new LFT request")
                        .addStringOption(option =>
                            option.setName("game")
                                .setDescription("Select the game")
                                .setRequired(true)
                                .addChoices(
                                    { name: "Valorant", value: "valorant" },
                                    { name: "Counter-Strike 2", value: "cs2" },
                                    { name: "League of Legends", value: "lol" }
                                )
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("edit")
                        .setDescription("Edit an existing LFT request")
                        .addStringOption(option =>
                            option.setName("request_id")
                                .setDescription("The ID of the request to edit")
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("delete")
                        .setDescription("Delete an LFT request (soft delete)")
                        .addStringOption(option =>
                            option.setName("request_id")
                                .setDescription("The ID of the request to delete")
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
                case "delete":
                    await this.handleDelete(interaction);
                    break;
            }
        } catch (error) {
            console.error(`LFT command error: ${error.stack}`);
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
        
        // Cleanup old requests
        await cleanupRequests(interaction.guild, interaction.user.id, "LFT", channels.publicChannelId, config);
        
        // Check active request limit
        if (await checkActiveRequests(interaction, "LFT", config)) return;

        // Create modal based on game
        const modal = this.createGameModal(game);
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

        // Create edit modal
        const modal = this.createEditModal(request);
        return interaction.showModal(modal);
    }

    async handleDelete(interaction) {
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
        const permissionCheck = canUserPerformAction(request, interaction.user.id, "delete");
        if (!permissionCheck.allowed) {
            return interaction.reply({
                embeds: [createErrorEmbed("Cannot Delete", permissionCheck.reason, request.status)],
                flags: MessageFlags.Ephemeral
            });
        }

        // Soft delete the request
        const { softDeleteRequest } = require("../../Structure/Functions/lfHelpers");
        const result = await softDeleteRequest(requestId, interaction.guild.id);
        
        if (!result.success) {
            return interaction.reply({
                embeds: [createErrorEmbed("Delete Failed", result.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.reply({
            embeds: [createSuccessEmbed("Request Deleted", `Your LFT request \`${requestId}\` has been deleted.`, STATUS.DELETED)],
            flags: MessageFlags.Ephemeral
        });
    }

    createGameModal(game) {
        const modal = new ModalBuilder()
            .setCustomId(`lft_create_${game}`)
            .setTitle(`Looking For Team - ${game.charAt(0).toUpperCase() + game.slice(1)}`);

        switch (game) {
            case "valorant":
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("riotID")
                            .setLabel("Riot ID")
                            .setPlaceholder("e.g., Apatite#SA1")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("rolesPlayed")
                            .setLabel("Roles Played")
                            .setPlaceholder("e.g., sentinel, duelist, etc...")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("peakRank")
                            .setLabel("Peak/Current Rank")
                            .setPlaceholder("e.g., Immortal 3")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recentTeams")
                            .setLabel("Recent Teams")
                            .setPlaceholder("e.g., Apatite Weekly scrims (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(300)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("additionalInfo")
                            .setLabel("Details")
                            .setPlaceholder("Availability, languages, scrim times, etc... (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(3000)
                    )
                );
                break;
            
            case "cs2":
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("steamID")
                            .setLabel("Steam ID")
                            .setPlaceholder("e.g., Apatite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("rolesPlayed")
                            .setLabel("Roles Played")
                            .setPlaceholder("e.g., AWPer, IGL, Entry, etc...")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("peakRank")
                            .setLabel("Peak/Current Rank")
                            .setPlaceholder("e.g., Global Elite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recentTeams")
                            .setLabel("Recent Teams")
                            .setPlaceholder("e.g., Apatite Weekly scrims (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(300)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("additionalInfo")
                            .setLabel("Details")
                            .setPlaceholder("Availability, languages, experience, etc... (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(3000)
                    )
                );
                break;
            
            case "lol":
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("summonerName")
                            .setLabel("Summoner Name")
                            .setPlaceholder("e.g., Apatite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("rolesPlayed")
                            .setLabel("Roles Played")
                            .setPlaceholder("e.g., Top, Jungle, Mid, ADC, Support")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("peakRank")
                            .setLabel("Peak/Current Rank")
                            .setPlaceholder("e.g., Challenger")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recentTeams")
                            .setLabel("Recent Teams")
                            .setPlaceholder("e.g., Apatite Weekly scrims (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(300)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("additionalInfo")
                            .setLabel("Details")
                            .setPlaceholder("Availability, languages, experience, etc... (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(3000)
                    )
                );
                break;
        }

        return modal;
    }

    createEditModal(request) {
        const modal = new ModalBuilder()
            .setCustomId(`lft_edit_${request._id}`)
            .setTitle(`Edit LFT Request - ${request.game}`);

        // Pre-fill existing values
        const content = request.content || {};
        
        switch (request.game.toLowerCase()) {
            case "valorant":
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("riotID")
                            .setLabel("Riot ID")
                            .setPlaceholder("e.g., Apatite#SA1")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.riotID || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("rolesPlayed")
                            .setLabel("Roles Played")
                            .setPlaceholder("e.g., sentinel, duelist, etc...")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.rolesPlayed || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("peakRank")
                            .setLabel("Peak/Current Rank")
                            .setPlaceholder("e.g., Immortal 3")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.peakRank || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recentTeams")
                            .setLabel("Recent Teams")
                            .setPlaceholder("e.g., Apatite Weekly scrims (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(300)
                            .setValue(content.recentTeams || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("additionalInfo")
                            .setLabel("Details")
                            .setPlaceholder("Availability, languages, scrim times, etc... (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(3000)
                            .setValue(content.additionalInfo || "")
                    )
                );
                break;
            
            case "cs2":
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("steamID")
                            .setLabel("Steam ID")
                            .setPlaceholder("e.g., Apatite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.steamID || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("rolesPlayed")
                            .setLabel("Roles Played")
                            .setPlaceholder("e.g., AWPer, IGL, Entry, etc...")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.rolesPlayed || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("peakRank")
                            .setLabel("Peak/Current Rank")
                            .setPlaceholder("e.g., Global Elite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.peakRank || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recentTeams")
                            .setLabel("Recent Teams")
                            .setPlaceholder("e.g., Apatite Weekly scrims (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(300)
                            .setValue(content.recentTeams || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("additionalInfo")
                            .setLabel("Details")
                            .setPlaceholder("Availability, languages, experience, etc... (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(3000)
                            .setValue(content.additionalInfo || "")
                    )
                );
                break;
            
            case "lol":
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("summonerName")
                            .setLabel("Summoner Name")
                            .setPlaceholder("e.g., Apatite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.summonerName || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("rolesPlayed")
                            .setLabel("Roles Played")
                            .setPlaceholder("e.g., Top, Jungle, Mid, ADC, Support")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.rolesPlayed || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("peakRank")
                            .setLabel("Peak/Current Rank")
                            .setPlaceholder("e.g., Challenger")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setValue(content.peakRank || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("recentTeams")
                            .setLabel("Recent Teams")
                            .setPlaceholder("e.g., Apatite Weekly scrims (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(300)
                            .setValue(content.recentTeams || "")
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("additionalInfo")
                            .setLabel("Details")
                            .setPlaceholder("Availability, languages, experience, etc... (optional)")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(false)
                            .setMaxLength(3000)
                            .setValue(content.additionalInfo || "")
                    )
                );
                break;
        }

        return modal;
    }
}

module.exports = LFTSys;
