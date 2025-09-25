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
    MessageFlags,
    EmbedBuilder,
    Colors,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ComponentType
} = require("discord.js");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const { 
  STATUS, 
  isValidRequestId, 
  canUserPerformAction, 
  createErrorEmbed, 
  createSuccessEmbed,
  createWarningEmbed,
  cleanupRequests,
  getStatusColor,
  getStatusEmoji,
  softDeleteRequest
} = require("../../Structure/Functions/LFSystem/lfHelpers");
const { getGameChannels, logLFAction } = require("../../Structure/Functions/LFSystem/lfActionLogger");
const { checkActiveRequests } = require("../../Structure/Functions/LFSystem/activeRequest");
const modalHandler = require("../../Structure/Functions/LFSystem/modalHandler");
const config = require("../../Structure/Configs/config");
const { renderRequestEmbed } = require("../../Structure/Functions/renderRequestEmbed");
const { validateEmbedLimits } = require("../../Structure/Functions/LFSystem/lfValidation");
const { Logger } = require("../../Structure/Functions/Logger");
const logger = new Logger();


class LFTStaff extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("lfstaff")
                .setDescription("Staff commands for the Looking For System")
                .addSubcommand(sub =>
                    sub.setName("list")
                        .setDescription("List all LF requests with filtering options")
                        .addStringOption(option =>
                            option.setName("status")
                                .setDescription("Filter by status")
                                .addChoices(
                                    { name: "Pending", value: "pending" },
                                    { name: "Approved", value: "approved" },
                                    { name: "Declined", value: "declined" },
                                    { name: "Archived", value: "archived" },
                                    { name: "Expired", value: "expired" },
                                    { name: "Cancelled", value: "cancelled" },
                                    { name: "Deleted", value: "deleted" }
                                )
                        )
                        .addStringOption(option =>
                            option.setName("type")
                                .setDescription("Filter by request type")
                                .addChoices(
                                    { name: "LFP (Looking For Players)", value: "LFP" },
                                    { name: "LFT (Looking For Team)", value: "LFT" }
                                )
                        )
                        .addStringOption(option => {
                            const gameOption = option.setName("game")
                                .setDescription("Filter by game");
                            
                            // Get all available games from both LFP and LFT configs
                            const allGames = modalHandler.getAllGames();
                            const uniqueGames = [...new Set([...allGames.lfp, ...allGames.lft])];
                            
                            // Add choices dynamically from config
                            uniqueGames.forEach(gameKey => {
                                // Try to get display name from LFP config first, then LFT
                                const lfpConfig = modalHandler.getGameConfig("lfp", gameKey);
                                const lftConfig = modalHandler.getGameConfig("lft", gameKey);
                                const displayName = lfpConfig?.displayName || lftConfig?.displayName || gameKey;
                                
                                gameOption.addChoices({
                                    name: displayName,
                                    value: gameKey
                                });
                            });
                            
                            return gameOption;
                        })
                        .addUserOption(option =>
                            option.setName("user")
                                .setDescription("Filter by specific user")
                        )
                        .addIntegerOption(option =>
                            option.setName("limit")
                                .setDescription("Number of requests to show (default: 10, max: 25)")
                                .setMinValue(1)
                                .setMaxValue(25)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("view")
                        .setDescription("View detailed information about a specific request")
                        .addStringOption(option =>
                            option.setName("request_id")
                                .setDescription("The ID of the request to view")
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("manage")
                        .setDescription("Manage LF requests (approve, decline, archive, delete)")
                        .addStringOption(option =>
                            option.setName("action")
                                .setDescription("Action to perform on the request")
                                .addChoices(
                                    { name: "Approve", value: "approve" },
                                    { name: "Decline", value: "decline" },
                                    { name: "Archive", value: "archive" },
                                    { name: "Delete", value: "delete" }
                                )
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName("request_id")
                                .setDescription("The ID of the request to manage")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName("reason")
                                .setDescription("Reason for the action (required for decline and delete)")
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("cleanup")
                        .setDescription("Clean up expired and archived requests")
                        .addStringOption(option =>
                            option.setName("type")
                                .setDescription("Type of cleanup to perform")
                                .addChoices(
                                    { name: "Expire Old Pending", value: "expire" },
                                    { name: "Archive Old Approved", value: "archive" },
                                    { name: "Both (Recommended)", value: "both" },
                                    { name: "Delete Old Soft Deleted", value: "delete" },
                                    { name: "Full Cleanup (All Types)", value: "full" },
                                    { name: "Dry Run (Preview Only)", value: "dryrun" }
                                )
                                .setRequired(true)
                        )
                        .addStringOption(option => {
                            const gameOption = option.setName("game")
                                .setDescription("Filter cleanup by specific game (optional)");
                            
                            // Get all available games from both LFP and LFT configs
                            const allGames = modalHandler.getAllGames();
                            const uniqueGames = [...new Set([...allGames.lfp, ...allGames.lft])];
                            
                            // Add choices dynamically from config
                            uniqueGames.forEach(gameKey => {
                                // Try to get display name from LFP config first, then LFT
                                const lfpConfig = modalHandler.getGameConfig("lfp", gameKey);
                                const lftConfig = modalHandler.getGameConfig("lft", gameKey);
                                const displayName = lfpConfig?.displayName || lftConfig?.displayName || gameKey;
                                
                                gameOption.addChoices({
                                    name: displayName,
                                    value: gameKey
                                });
                            });
                            
                            // Add "All Games" option
                            gameOption.addChoices({
                                name: "All Games",
                                value: "all"
                            });
                            
                            return gameOption;
                        })
                        .addStringOption(option =>
                            option.setName("scope")
                                .setDescription("Scope of cleanup operation")
                                .addChoices(
                                    { name: "All Requests", value: "all" },
                                    { name: "LFP Only", value: "lfp" },
                                    { name: "LFT Only", value: "lft" }
                                )
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("stats")
                        .setDescription("Show statistics about the LF system")
                        .addStringOption(option => {
                            const gameOption = option.setName("game")
                                .setDescription("Filter stats by game");
                            
                            // Get all available games from both LFP and LFT configs
                            const allGames = modalHandler.getAllGames();
                            const uniqueGames = [...new Set([...allGames.lfp, ...allGames.lft])];
                            
                            // Add choices dynamically from config
                            uniqueGames.forEach(gameKey => {
                                // Try to get display name from LFP config first, then LFT
                                const lfpConfig = modalHandler.getGameConfig("lfp", gameKey);
                                const lftConfig = modalHandler.getGameConfig("lft", gameKey);
                                const displayName = lfpConfig?.displayName || lftConfig?.displayName || gameKey;
                                
                                gameOption.addChoices({
                                    name: displayName,
                                    value: gameKey
                                });
                            });
                            
                            return gameOption;
                        })
                        .addStringOption(option =>
                            option.setName("type")
                                .setDescription("Filter stats by request type")
                                .addChoices(
                                    { name: "LFP (Looking For Players)", value: "LFP" },
                                    { name: "LFT (Looking For Team)", value: "LFT" }
                                )
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("user")
                        .setDescription("View all requests from a specific user")
                        .addUserOption(option =>
                            option.setName("target")
                                .setDescription("User to view requests for")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName("status")
                                .setDescription("Filter by status")
                                .addChoices(
                                    { name: "All", value: "all" },
                                    { name: "Pending", value: "pending" },
                                    { name: "Approved", value: "approved" },
                                    { name: "Declined", value: "declined" },
                                    { name: "Archived", value: "archived" },
                                    { name: "Expired", value: "expired" },
                                    { name: "Cancelled", value: "cancelled" },
                                    { name: "Deleted", value: "deleted" }
                                )
                        )
                )
                .addSubcommand(sub =>
                    sub.setName("legacy")
                        .setDescription("Manage legacy games (games removed from config but still in database)")
                        .addStringOption(option =>
                            option.setName("action")
                                .setDescription("Action to perform on legacy games")
                                .setRequired(true)
                                .addChoices(
                                    { name: "List Legacy Games", value: "list" },
                                    { name: "Show Legacy Requests", value: "requests" },
                                    { name: "Clean Legacy Requests", value: "clean" }
                                )
                        )
                        .addStringOption(option =>
                            option.setName("game")
                                .setDescription("Specific legacy game to target (optional)")
                        )
                )
                .setDMPermission(false),
            options: { devOnly: false },
        });
    }

    /**
     * Safely add fields to an embed with validation
     * @param {EmbedBuilder} embed - The embed to add fields to
     * @param {Array} fields - Array of field objects
     * @returns {EmbedBuilder} - The embed with fields added
     */
    safeAddFields(embed, fields) {
        if (!Array.isArray(fields)) return embed;

        // Check current field count - Discord has a limit of 25 fields per embed
        const currentFields = embed.data.fields || [];
        const remainingSlots = 25 - currentFields.length;
        
        if (remainingSlots <= 0) {
            return embed; // Can't add more fields, return as-is
        }

        // Limit fields to remaining slots to avoid exceeding Discord's limit
        const fieldsToAdd = fields.slice(0, remainingSlots);
        
        // Validate each field before adding to ensure Discord compatibility
        for (const field of fieldsToAdd) {
            // Discord field names have a 256 character limit
            if (field.name && field.name.length > 256) {
                field.name = field.name.substring(0, 253) + '...'; // Truncate with ellipsis
            }
            
            // Discord field values have a 1024 character limit
            if (field.value && field.value.length > 1024) {
                field.value = field.value.substring(0, 1021) + '...'; // Truncate with ellipsis
            }
        }

        embed.addFields(fieldsToAdd);
        return embed;
    }

    /**
     * Validate guild context and permissions for LF operations
     * @param {Object} interaction - Discord interaction
     * @param {string} operation - Operation being performed
     * @returns {Object|null} - Error response if validation fails, null if valid
     */
    validateGuildContext(interaction, operation = "operation") {
        // Check if we're in a guild
        if (!interaction.guild || !interaction.guild.id) {
            return {
                embeds: [createErrorEmbed("Error", "This command can only be used in a server.")],
                flags: MessageFlags.Ephemeral
            };
        }

        // Ensure guild ID is valid format
        if (!/^\d{17,19}$/.test(interaction.guild.id)) {
            return {
                embeds: [createErrorEmbed("Error", "Invalid guild context.")],
                flags: MessageFlags.Ephemeral
            };
        }

        return null; // Valid
    }

    async execute(interaction, client) {
        // Check if LFP/LFT system is enabled
        if (!this.client.config.lfpLftSystem) {
            return interaction.reply({
                embeds: [createErrorEmbed("System Disabled", "The LFP/LFT system is currently disabled.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Validate role configuration
        if (!this.client.config.lfplftModroleId) {
            return interaction.reply({
                embeds: [createErrorEmbed("Configuration Error", "LF mod role is not configured. Please contact an administrator.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Check if the configured role exists in the guild
        const modRole = interaction.guild.roles.cache.get(this.client.config.lfplftModroleId);
        if (!modRole) {
            return interaction.reply({
                embeds: [createErrorEmbed("Configuration Error", `The configured LF mod role (${this.client.config.lfplftModroleId}) does not exist in this guild. Please contact an administrator.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        // Check if user has LFP mod role
        if (!interaction.member.roles.cache.has(this.client.config.lfplftModroleId)) {
            return interaction.reply({
                embeds: [createErrorEmbed("Insufficient Permissions", `You do not have permission to use LF staff commands.\n> Required Role: ${modRole.name} (<@&${this.client.config.lfplftModroleId}>)`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const sub = interaction.options.getSubcommand();

        try {
            // Validate guild context for all operations
            const guildValidation = this.validateGuildContext(interaction, sub);
            if (guildValidation) {
                return interaction.reply(guildValidation);
            }

            switch (sub) {
                case "list":
                    await this.handleList(interaction);
                    break;
                case "view":
                    await this.handleView(interaction);
                    break;
                case "manage":
                    await this.handleManage(interaction);
                    break;
                case "cleanup":
                    await this.handleCleanup(interaction);
                    break;
                case "stats":
                    await this.handleStats(interaction);
                    break;
                case "user":
                    await this.handleUser(interaction);
                    break;
                case "legacy":
                    await this.handleLegacy(interaction);
                    break;
            }
        } catch (error) {
            logger.error(`LFStaff command error: ${error.stack}`);
            return interaction.reply({
                embeds: [createErrorEmbed("Error", "An error occurred while processing your request.")],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handleList(interaction) {
        const status = interaction.options.getString("status");
        const type = interaction.options.getString("type");
        const game = interaction.options.getString("game");
        const user = interaction.options.getUser("user");
        const limit = interaction.options.getInteger("limit") || 10;

        // Build query
        const query = { guildId: interaction.guild.id };
        if (status) query.status = status;
        if (type) query.type = type;
        if (game) query.game = game.toLowerCase();
        if (user) query.userId = user.id;

        const requests = await LFRequest.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);

        if (!requests.length) {
            return interaction.reply({
                embeds: [createWarningEmbed("No Requests Found", "No requests found matching your criteria.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Build filters for display
        const filters = [];
        if (status) filters.push(`Status: ${status}`);
        if (type) filters.push(`Type: ${type}`);
        if (game) {
            const lfpConfig = modalHandler.getGameConfig("lfp", game);
            const lftConfig = modalHandler.getGameConfig("lft", game);
            const gameDisplayName = lfpConfig?.displayName || lftConfig?.displayName || game;
            
            // Check if this is a legacy game (exists in DB but not in config)
            const isLegacyGame = !lfpConfig && !lftConfig;
            const gameLabel = isLegacyGame ? `${gameDisplayName} (Legacy)` : gameDisplayName;
            filters.push(`Game: ${gameLabel}`);
        }
        if (user) filters.push(`User: ${user.tag}`);

        // Implement pagination to handle large lists of requests
        const perPage = 8; // Show 8 requests per page for staff view (more than user view)
        let page = 0; // Start at page 0 (first page)
        const totalPages = Math.ceil(requests.length / perPage); // Calculate total pages needed

        const buildEmbed = (page) => {
            const slice = requests.slice(page * perPage, (page + 1) * perPage);
            const counts = requests.reduce((acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {});

            const requestList = slice.map(req => {
                const createdAt = Math.floor(new Date(req.createdAt).getTime() / 1000);
                const statusEmoji = getStatusEmoji(req.status);
                const primary = req.content?.teamName || 
                               req.content?.riotID || 
                               req.content?.steamID ||
                               req.content?.summonerName ||
                               Object.values(req.content || {})[0] || 
                               "No preview";

                // Get proper game display name
                const lfpConfig = modalHandler.getGameConfig("lfp", req.game);
                const lftConfig = modalHandler.getGameConfig("lft", req.game);
                const gameDisplayName = lfpConfig?.displayName || lftConfig?.displayName || req.game;

                return `• **${req.type}** | ${gameDisplayName} | ${statusEmoji} ${req.status.toUpperCase()} | <t:${createdAt}:R>\n  ↳ ${primary}\n  ID: \`${req._id}\``;
            }).join("\n\n");

            const embed = new EmbedBuilder()
                .setTitle("📋 LF Staff - Request List")
                .setColor(Colors.Blue)
                .setTimestamp();

            // Add filters description if any
            if (filters.length) {
                embed.setDescription(`**Filters:** ${filters.join(" • ")}\n\n${requestList}`);
            } else {
                embed.setDescription(requestList);
            }

            // Add footer with pagination and status counts
            embed.setFooter({
                text: `Page ${page + 1} of ${totalPages} | Total: ${requests.length} | Pending: ${counts.pending || 0} • Approved: ${counts.approved || 0} • Declined: ${counts.declined || 0} • Archived: ${counts.archived || 0} • Expired: ${counts.expired || 0} • Cancelled: ${counts.cancelled || 0} • Deleted: ${counts.deleted || 0}`,
            });

            return embed;
        };

        const buildMenu = (page) => {
            // Don't show pagination menu if there's only one page
            if (totalPages <= 1) return null;
            
            // Create a dropdown menu for page navigation
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("lfstaff_page_select")
                    .setPlaceholder("Jump to page...")
                    .addOptions(
                        // Generate options for each page
                        [...Array(totalPages)].map((_, i) => ({
                            label: `Page ${i + 1}`, // Display as "Page 1", "Page 2", etc.
                            value: i.toString(), // Store page index as string
                            default: i === page, // Highlight current page
                        }))
                    )
            );
        };

        const components = buildMenu(page);
        const replyOptions = {
            embeds: [buildEmbed(page)],
            flags: MessageFlags.Ephemeral
        };
        
        // Only add components if there are any
        if (components) {
            replyOptions.components = [components];
        }

        const msg = await interaction.reply(replyOptions);

        // Only add collector if there are multiple pages
        if (totalPages > 1) {
            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60_000,
            });

            collector.on("collect", async (int) => {
                if (int.user.id !== interaction.user.id) {
                    return int.reply({
                        content: "This is not your menu.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                page = parseInt(int.values[0]);
                const newComponents = buildMenu(page);

                const updateOptions = {
                    embeds: [buildEmbed(page)]
                };
                
                if (newComponents) {
                    updateOptions.components = [newComponents];
                }

                await int.update(updateOptions);
            });

            collector.on("end", async () => {
                await msg.edit({ components: [] }).catch(() => null);
            });
        }
    }

    async handleView(interaction) {
        const requestId = interaction.options.getString("request_id");

        if (!isValidRequestId(requestId)) {
            return interaction.reply({
                embeds: [createErrorEmbed("Invalid Request ID", "That doesn't look like a valid request ID.")],
                flags: MessageFlags.Ephemeral
            });
        }

        const request = await LFRequest.findById(requestId);

        // Validate request belongs to current guild
        if (!request || request.guildId !== interaction.guild.id) {
            return interaction.reply({
                embeds: [createErrorEmbed("Request Not Found", "No request found with that ID in this server.")],
                flags: MessageFlags.Ephemeral
            });
        }

        const user = await interaction.client.users.fetch(request.userId).catch(() => null);
        const reviewer = request.reviewedBy ? await interaction.client.users.fetch(request.reviewedBy).catch(() => null) : null;

        // Get proper game display name
        const lfpConfig = modalHandler.getGameConfig("lfp", request.game);
        const lftConfig = modalHandler.getGameConfig("lft", request.game);
        const gameDisplayName = lfpConfig?.displayName || lftConfig?.displayName || request.game;

        const embed = new EmbedBuilder()
            .setTitle(`📋 ${request.type} Request Details`)
            .setColor(getStatusColor(request.status))
            .setTimestamp()
            .addFields(
                { name: "Request ID", value: `\`${request._id}\``, inline: true },
                { name: "Status", value: `${getStatusEmoji(request.status)} ${request.status.toUpperCase()}`, inline: true },
                { name: "Type", value: request.type, inline: true },
                { name: "Game", value: gameDisplayName, inline: true },
                { name: "Created", value: `<t:${Math.floor(request.createdAt.getTime() / 1000)}:R>`, inline: true },
                { name: "Updated", value: `<t:${Math.floor(request.updatedAt.getTime() / 1000)}:R>`, inline: true }
            );

        if (user) {
            embed.addFields({ name: "User", value: `<@${request.userId}> (${user.tag})`, inline: true });
        } else {
            embed.addFields({ name: "User", value: `<@${request.userId}> (Unknown)`, inline: true });
        }

        if (reviewer) {
            embed.addFields({ name: "Reviewed By", value: `<@${request.reviewedBy}> (${reviewer.tag})`, inline: true });
        } else if (request.reviewedBy) {
            embed.addFields({ name: "Reviewed By", value: `<@${request.reviewedBy}> (Unknown)`, inline: true });
        }

        if (request.messageId) {
            embed.addFields({ name: "Review Message", value: `[Jump to Message](https://discord.com/channels/${request.guildId}/${getGameChannels(config, request.game).reviewChannelId}/${request.messageId})`, inline: true });
        }

        if (request.publicMessageId) {
            embed.addFields({ name: "Public Message", value: `[Jump to Message](https://discord.com/channels/${request.guildId}/${getGameChannels(config, request.game).publicChannelId}/${request.publicMessageId})`, inline: true });
        }

        // Add content details
        const contentFields = Object.entries(request.content || {});
        if (contentFields.length) {
            const contentText = contentFields.map(([key, value]) => `**${key}:** ${value || "N/A"}`).join("\n");
            embed.addFields({ name: "Request Content", value: contentText, inline: false });
        }

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleManage(interaction) {
        const action = interaction.options.getString("action");
        const requestId = interaction.options.getString("request_id");
        const reason = interaction.options.getString("reason");

        // Validate request ID
        if (!isValidRequestId(requestId)) {
            return interaction.reply({
                embeds: [createErrorEmbed("Invalid Request ID", "That doesn't look like a valid request ID.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Validate reason for actions that require it
        if ((action === "decline" || action === "delete") && !reason) {
            return interaction.reply({
                embeds: [createErrorEmbed("Missing Reason", `A reason is required for ${action} actions.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const request = await LFRequest.findById(requestId);
        if (!request || request.guildId !== interaction.guild.id) {
            return interaction.reply({
                embeds: [createErrorEmbed("Request Not Found", "No request found with that ID in this server.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Validate action based on current status
        switch (action) {
            case "approve":
                if (request.status !== STATUS.PENDING) {
                    return interaction.reply({
                        embeds: [createErrorEmbed("Invalid Status", `This request is ${request.status}, only pending requests can be approved.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }
                await this.handleApproveAction(interaction, request, reason);
                break;
            case "decline":
                if (request.status !== STATUS.PENDING) {
                    return interaction.reply({
                        embeds: [createErrorEmbed("Invalid Status", `This request is ${request.status}, only pending requests can be declined.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }
                await this.handleDeclineAction(interaction, request, reason);
                break;
            case "archive":
                if (request.status !== STATUS.APPROVED) {
                    return interaction.reply({
                        embeds: [createErrorEmbed("Invalid Status", `This request is ${request.status}, only approved requests can be archived.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }
                await this.handleArchiveAction(interaction, request, reason);
                break;
            case "delete":
                if (![STATUS.DECLINED, STATUS.ARCHIVED, STATUS.EXPIRED, STATUS.CANCELLED, STATUS.DELETED].includes(request.status)) {
                    return interaction.reply({
                        embeds: [createErrorEmbed("Invalid Status", `This request is ${request.status}, only declined, archived, expired, cancelled, or deleted requests can be permanently deleted.`)],
                        flags: MessageFlags.Ephemeral
                    });
                }
                await this.handleDeleteAction(interaction, request, reason);
                break;
        }
    }


    // Individual action handlers for the manage subcommand
    async handleApproveAction(interaction, request, reason) {
        // Update request
        request.status = STATUS.APPROVED;
        request.reviewedBy = interaction.user.id;
        await request.save();

        // Get game-specific channels
        const channels = getGameChannels(config, request.game);

        // Update review message
        try {
            if (request.messageId) {
                const reviewChannel = interaction.guild.channels.cache.get(channels.reviewChannelId);
                if (reviewChannel) {
                    const message = await reviewChannel.messages.fetch(request.messageId).catch(() => null);
                    if (message) {
                        const oldEmbed = message.embeds[0];
                        const newEmbed = EmbedBuilder.from(oldEmbed)
                            .setTitle(request.type === "LFP" ? "👥 LFP Request" : "🔎 LFT Request")
                            .setColor(Colors.Green)
                            .setFooter({ text: `Approved by ${interaction.user.tag} | Request ID: ${request._id}` });

                        await message.edit({ embeds: [newEmbed], components: [] });
                    }
                }
            }
        } catch (error) {
            logger.warn(`Failed to update review message for request ${request._id}: ${error.message}`);
        }

        // Post to public channel
        try {
            const publicChannel = interaction.guild.channels.cache.get(channels.publicChannelId);
            if (publicChannel) {
                const user = await interaction.client.users.fetch(request.userId);
                const publicEmbed = renderRequestEmbed(request, user);
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel(request.type === "LFP" ? "DM Team" : "DM Player")
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/users/${request.userId}`)
                );

                const publicMessage = await publicChannel.send({ embeds: [publicEmbed], components: [row] });
                request.publicMessageId = publicMessage.id;
                await request.save();
            }
        } catch (error) {
            logger.warn(`Failed to post to public channel for request ${request._id}: ${error.message}`);
        }

        // DM user
        try {
            const user = await interaction.client.users.fetch(request.userId);
            const approveEmbed = new EmbedBuilder()
                .setTitle("✅ Request Approved")
                .setColor(Colors.Green)
                .setDescription(
                    `>>> **Game:** ${request.game}\n` +
                    `**Type:** ${request.type}\n` +
                    `**Request ID:** \`${request._id}\`\n` +
                    `**Approved by:** ${interaction.user.tag}\n` +
                    (reason ? `**Reason:** ${reason}\n` : "") +
                    `**Status:** ✅ Approved\n` +
                    `**Action:** Your request has been approved and posted in <#${channels.publicChannelId}>\n` +
                    `**Next Steps:** Other players can now contact you directly!`
                )
                .setFooter({ text: `Request ID: ${request._id}` })
                .setTimestamp();

            await user.send({ embeds: [approveEmbed] });
        } catch (error) {
            logger.warn(`Failed to DM user ${request.userId} about approval: ${error.message}`);
        }

        // Log action
        try {
            const user = await interaction.client.users.fetch(request.userId);
            await logLFAction(interaction.client, config, 'approve', request, user, interaction.user, reason);
        } catch (error) {
            logger.warn(`Failed to log approval action: ${error.message}`);
        }

        await interaction.reply({
            embeds: [createSuccessEmbed("Request Approved", `Request \`${request._id}\` has been approved successfully.`, STATUS.APPROVED)],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleDeclineAction(interaction, request, reason) {
        // Get game-specific channels
        const channels = getGameChannels(config, request.game);

        // Store old message ID before clearing it
        const oldMessageId = request.messageId;

        // Update request
        request.status = STATUS.DECLINED;
        request.reviewedBy = interaction.user.id;
        request.messageId = null; // Clear message ID to prevent accidental recovery
        await request.save();

        // Update review message
        try {
            if (oldMessageId) {
                const reviewChannel = interaction.guild.channels.cache.get(channels.reviewChannelId);
                if (reviewChannel) {
                    const message = await reviewChannel.messages.fetch(oldMessageId).catch(() => null);
                    if (message) {
                        const oldEmbed = message.embeds[0];
                        const newEmbed = EmbedBuilder.from(oldEmbed)
                            .setTitle(request.type === "LFP" ? "👥 LFP Request" : "🔎 LFT Request")
                            .setColor(Colors.Red)
                            .setFooter({ text: `Declined by ${interaction.user.tag} | Request ID: ${request._id}` });

                        await message.edit({ embeds: [newEmbed], components: [] });
                    }
                }
            }
        } catch (error) {
            logger.warn(`Failed to update review message for request ${request._id}: ${error.message}`);
        }

        // DM user
        try {
            const user = await interaction.client.users.fetch(request.userId);
            const declineEmbed = new EmbedBuilder()
                .setTitle("❌ Request Declined")
                .setColor(Colors.Red)
                .setDescription(
                    `>>> **Game:** ${request.game}\n` +
                    `**Type:** ${request.type}\n` +
                    `**Request ID:** \`${request._id}\`\n` +
                    `**Declined by:** ${interaction.user.tag}\n` +
                    `**Reason:** ${reason}\n` +
                    `**Status:** ❌ Declined\n` +
                    `**Action:** Your request has been declined\n` +
                    `**Note:** You can create a new request if needed`
                )
                .setFooter({ text: `Request ID: ${request._id}` })
                .setTimestamp();

            await user.send({ embeds: [declineEmbed] });
        } catch (error) {
            logger.warn(`Failed to DM user ${request.userId} about decline: ${error.message}`);
        }

        // Log action
        try {
            const user = await interaction.client.users.fetch(request.userId);
            await logLFAction(interaction.client, config, 'decline', request, user, interaction.user, reason);
        } catch (error) {
            logger.warn(`Failed to log decline action: ${error.message}`);
        }

        await interaction.reply({
            embeds: [createSuccessEmbed("Request Declined", `Request \`${request._id}\` has been declined successfully.`, STATUS.DECLINED)],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleArchiveAction(interaction, request, reason) {
        // Delete public message
        try {
            if (request.publicMessageId) {
                const channels = getGameChannels(config, request.game);
                const publicChannel = interaction.guild.channels.cache.get(channels.publicChannelId);
                if (publicChannel) {
                    const message = await publicChannel.messages.fetch(request.publicMessageId).catch(() => null);
                    if (message) await message.delete();
                }
            }
        } catch (error) {
            logger.warn(`Failed to delete public message for request ${request._id}: ${error.message}`);
        }

        // Update request
        request.status = STATUS.ARCHIVED;
        request.archivedAt = new Date();
        request.publicMessageId = null;
        await request.save();

        // DM user
        try {
            const user = await interaction.client.users.fetch(request.userId);
            const archiveEmbed = new EmbedBuilder()
                .setTitle("📁 Request Archived")
                .setColor(Colors.Orange)
                .setDescription(
                    `>>> **Game:** ${request.game}\n` +
                    `**Type:** ${request.type}\n` +
                    `**Request ID:** \`${request._id}\`\n` +
                    `**Archived by:** ${interaction.user.tag}\n` +
                    (reason ? `**Reason:** ${reason}\n` : "") +
                    `**Status:** 📁 Archived\n` +
                    `**Action:** Your request has been archived\n` +
                    `**Note:** The request is no longer visible to other players`
                )
                .setFooter({ text: `Request ID: ${request._id}` })
                .setTimestamp();

            await user.send({ embeds: [archiveEmbed] });
        } catch (error) {
            logger.warn(`Failed to DM user ${request.userId} about archive: ${error.message}`);
        }

        // Log action
        try {
            const user = await interaction.client.users.fetch(request.userId);
            await logLFAction(interaction.client, config, 'archive', request, user, interaction.user, reason);
        } catch (error) {
            logger.warn(`Failed to log archive action: ${error.message}`);
        }

        await interaction.reply({
            embeds: [createSuccessEmbed("Request Archived", `Request \`${request._id}\` has been archived successfully.`, STATUS.ARCHIVED)],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleDeleteAction(interaction, request, reason) {
        // Soft delete the request
        const result = await softDeleteRequest(request._id, interaction.guild.id);
        if (!result.success) {
            return interaction.reply({
                embeds: [createErrorEmbed("Delete Failed", result.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        // DM user
        try {
            const user = await interaction.client.users.fetch(request.userId);
            const deleteEmbed = new EmbedBuilder()
                .setTitle("🗑️ Request Deleted")
                .setColor(Colors.DarkRed)
                .setDescription(
                    `>>> **Game:** ${request.game}\n` +
                    `**Type:** ${request.type}\n` +
                    `**Request ID:** \`${request._id}\`\n` +
                    `**Deleted by:** ${interaction.user.tag}\n` +
                    `**Reason:** ${reason}\n` +
                    `**Status:** 🗑️ Deleted\n` +
                    `**Action:** Your request has been permanently deleted\n` +
                    `**Note:** This action cannot be undone`
                )
                .setFooter({ text: `Request ID: ${request._id}` })
                .setTimestamp();

            await user.send({ embeds: [deleteEmbed] });
        } catch (error) {
            logger.warn(`Failed to DM user ${request.userId} about deletion: ${error.message}`);
        }

        // Log action
        try {
            const user = await interaction.client.users.fetch(request.userId);
            await logLFAction(interaction.client, config, 'delete', result.request, user, interaction.user, reason);
        } catch (error) {
            logger.warn(`Failed to log delete action: ${error.message}`);
        }

        await interaction.reply({
            embeds: [createSuccessEmbed("Request Deleted", `Request \`${request._id}\` has been deleted successfully.`, STATUS.DELETED)],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleCleanup(interaction) {
        const type = interaction.options.getString("type");
        const game = interaction.options.getString("game") || "all";
        const scope = interaction.options.getString("scope") || "all";

        // Build MongoDB query for filtering requests
        const query = { guildId: interaction.guild.id };
        if (game !== "all") query.game = game.toLowerCase(); // Convert to canonical key format
        if (scope !== "all") query.type = scope.toUpperCase(); // Convert "lfp"/"lft" to "LFP"/"LFT"

        // Determine which request types to process based on scope
        const gameTypes = scope === "all" ? ['LFP', 'LFT'] : [scope.toUpperCase()];

        const results = {
            expired: 0,
            archived: 0,
            deleted: 0,
            totalProcessed: 0,
            errors: [],
            details: []
        };

        // Handle dry run - just show what would be cleaned up without making changes
        if (type === "dryrun") {
            return await this.handleDryRun(interaction, query, gameTypes);
        }

        try {
            // Process each request type (LFP, LFT, or both)
            for (const gameType of gameTypes) {
                let gamesToProcess;
                
                if (game === "all") {
                    // Get all unique games that have requests for this guild and type
                    gamesToProcess = await LFRequest.distinct('game', {
                        guildId: interaction.guild.id,
                        type: gameType
                    });
                } else {
                    // Only process the specific game requested
                    gamesToProcess = [game.toLowerCase()];
                }
                
                for (const gameKey of gamesToProcess) {
                    try {
                        // Get game display name for reporting
                        const lfpConfig = modalHandler.getGameConfig("lfp", gameKey);
                        const lftConfig = modalHandler.getGameConfig("lft", gameKey);
                        const gameDisplayName = lfpConfig?.displayName || lftConfig?.displayName || gameKey;

                        const channels = getGameChannels(config, gameKey);
                        
                        // Perform cleanup based on type
                        if (type === "expire" || type === "both" || type === "full") {
                            const expireResults = await this.cleanupExpiredRequests(interaction.guild, gameType, gameKey, channels, config);
                            results.expired += expireResults.count;
                            results.totalProcessed += expireResults.count;
                            results.details.push(`${gameDisplayName} (${gameType}): ${expireResults.count} expired`);
                        }
                        
                        if (type === "archive" || type === "both" || type === "full") {
                            const archiveResults = await this.cleanupArchivedRequests(interaction.guild, gameType, gameKey, channels, config);
                            results.archived += archiveResults.count;
                            results.totalProcessed += archiveResults.count;
                            results.details.push(`${gameDisplayName} (${gameType}): ${archiveResults.count} archived`);
                        }
                        
                        if (type === "delete" || type === "full") {
                            const deleteResults = await this.cleanupDeletedRequests(interaction.guild, gameType, gameKey, config);
                            results.deleted = (results.deleted || 0) + deleteResults.count;
                            results.totalProcessed += deleteResults.count;
                            results.details.push(`${gameDisplayName} (${gameType}): ${deleteResults.count} permanently deleted`);
                        }
                        
                    } catch (error) {
                        logger.warn(`Failed to cleanup ${gameType} requests for game ${gameKey}: ${error.message}`);
                        results.errors.push(`Failed to cleanup ${gameType} requests for game ${gameKey}: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error during cleanup: ${error.message}`);
            results.errors.push(`Cleanup failed: ${error.message}`);
        }

        // Create detailed embed
        const embed = new EmbedBuilder()
            .setTitle("🧹 Cleanup Complete")
            .setColor(Colors.Green)
            .setTimestamp()
            .setFooter({ text: `Processed by ${interaction.user.tag}` });

        // Add summary fields
        const summaryText = `**Total Processed:** ${results.totalProcessed}\n**Expired:** ${results.expired}\n**Archived:** ${results.archived}${results.deleted > 0 ? `\n**Deleted:** ${results.deleted}` : ''}`;
        embed.addFields(
            { name: "📊 Summary", value: summaryText, inline: true },
            { name: "🎯 Scope", value: `**Type:** ${type}\n**Game:** ${game === "all" ? "All Games" : game}\n**Scope:** ${scope}`, inline: true }
        );

        // Add detailed breakdown if there are results
        if (results.details.length > 0) {
            embed.addFields({
                name: "📋 Detailed Breakdown",
                value: results.details.slice(0, 10).join("\n") + (results.details.length > 10 ? `\n... and ${results.details.length - 10} more` : ""),
                inline: false
            });
        }

        if (results.errors.length) {
            embed.addFields({ 
                name: "⚠️ Errors", 
                value: results.errors.slice(0, 5).join("\n") + (results.errors.length > 5 ? `\n... and ${results.errors.length - 5} more errors` : ""), 
                inline: false 
            });
        }

        // Add helpful information
        const helpText = type === "full"
            ? "✅ Complete cleanup performed - expired pending requests, archived old approved requests, and permanently deleted old soft-deleted requests"
            : type === "both" 
            ? "✅ Standard cleanup completed - expired pending requests and archived old approved requests"
            : type === "expire"
            ? "⏰ Expiry cleanup completed - old pending requests have been expired"
            : type === "delete"
            ? "🗑️ Deletion cleanup completed - old soft-deleted requests (archived, expired, cancelled) have been permanently deleted"
            : "📁 Archive cleanup completed - old approved requests have been archived";

        embed.addFields({
            name: "ℹ️ Information",
            value: helpText,
            inline: false
        });

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleDryRun(interaction, query, gameTypes) {
        const results = {
            wouldExpire: 0,
            wouldArchive: 0,
            wouldDelete: 0,
            details: []
        };

        try {
            // Count what would be expired
            const now = new Date();
            const expireQuery = {
                ...query,
                status: STATUS.PENDING,
                expiresAt: { $lt: now }
            };
            const wouldExpire = await LFRequest.countDocuments(expireQuery);
            results.wouldExpire = wouldExpire;

            // Count what would be archived
            const archiveDate = new Date();
            archiveDate.setDate(archiveDate.getDate() - config.RequestArchiveDays);
            const archiveQuery = {
                ...query,
                status: STATUS.APPROVED,
                createdAt: { $lt: archiveDate }
            };
            const wouldArchive = await LFRequest.countDocuments(archiveQuery);
            results.wouldArchive = wouldArchive;

            // Count what would be permanently deleted
            const deleteDate = new Date();
            deleteDate.setDate(deleteDate.getDate() - config.RequestDeleteDays);
            const deleteQuery = {
                ...query,
                status: { $in: [STATUS.ARCHIVED, STATUS.EXPIRED, STATUS.CANCELLED] },
                createdAt: { $lt: deleteDate }
            };
            const wouldDelete = await LFRequest.countDocuments(deleteQuery);
            results.wouldDelete = wouldDelete;

            // Get detailed breakdown
            for (const gameType of gameTypes) {
                const typeQuery = { ...query, type: gameType };
                
                const expireCount = await LFRequest.countDocuments({
                    ...typeQuery,
                    status: STATUS.PENDING,
                    expiresAt: { $lt: now }
                });
                
                const archiveCount = await LFRequest.countDocuments({
                    ...typeQuery,
                    status: STATUS.APPROVED,
                    createdAt: { $lt: archiveDate }
                });

                const deleteCount = await LFRequest.countDocuments({
                    ...typeQuery,
                    status: { $in: [STATUS.ARCHIVED, STATUS.EXPIRED, STATUS.CANCELLED] },
                    createdAt: { $lt: deleteDate }
                });

                if (expireCount > 0 || archiveCount > 0 || deleteCount > 0) {
                    const details = [];
                    if (expireCount > 0) details.push(`${expireCount} to expire`);
                    if (archiveCount > 0) details.push(`${archiveCount} to archive`);
                    if (deleteCount > 0) details.push(`${deleteCount} to delete`);
                    results.details.push(`${gameType}: ${details.join(', ')}`);
                }
            }

        } catch (error) {
            logger.error(`Error during dry run: ${error.message}`);
        }

        const embed = new EmbedBuilder()
            .setTitle("🔍 Dry Run Preview")
            .setColor(Colors.Blue)
            .setDescription("This is a preview of what would be cleaned up. No actual changes were made.")
            .setTimestamp()
            .setFooter({ text: `Preview by ${interaction.user.tag}` });

        const totalCount = results.wouldExpire + results.wouldArchive + results.wouldDelete;
        const processText = `**Expire:** ${results.wouldExpire}\n**Archive:** ${results.wouldArchive}${results.wouldDelete > 0 ? `\n**Delete:** ${results.wouldDelete}` : ''}\n**Total:** ${totalCount}`;
        embed.addFields(
            { name: "📊 Would Process", value: processText, inline: true },
            { name: "🎯 Scope", value: `**Game:** ${query.game || "All Games"}\n**Type:** ${query.type || "All Types"}`, inline: true }
        );

        if (results.details.length > 0) {
            embed.addFields({
                name: "📋 Breakdown",
                value: results.details.join("\n"),
                inline: false
            });
        }

        if (totalCount === 0) {
            embed.addFields({
                name: "✅ Status",
                value: "No requests need cleanup at this time.",
                inline: false
            });
        }

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    async cleanupExpiredRequests(guild, gameType, gameKey, channels, config) {
        const now = new Date();
        const expiredRequests = await LFRequest.find({
            guildId: guild.id,
            type: gameType,
            game: gameKey,
            status: STATUS.PENDING,
            expiresAt: { $lt: now }
        });

        let count = 0;
        for (const request of expiredRequests) {
            try {
                // Delete review message if it exists
                if (request.messageId) {
                    const reviewChannel = guild.channels.cache.get(channels.reviewChannelId);
                    if (reviewChannel) {
                        const message = await reviewChannel.messages.fetch(request.messageId).catch(() => null);
                        if (message) await message.delete();
                    }
                }

                // Update request status
                request.status = STATUS.EXPIRED;
                request.messageId = null;
                await request.save();
                count++;
            } catch (error) {
                logger.warn(`Failed to expire request ${request._id}: ${error.message}`);
            }
        }

        return { count };
    }

    async cleanupArchivedRequests(guild, gameType, gameKey, channels, config) {
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - config.RequestArchiveDays);
        
        const oldApproved = await LFRequest.find({
            guildId: guild.id,
            type: gameType,
            game: gameKey,
            status: STATUS.APPROVED,
            createdAt: { $lt: archiveDate }
        });

        let count = 0;
        for (const request of oldApproved) {
            try {
                // Delete public message if it exists
                if (request.publicMessageId) {
                    const publicChannel = guild.channels.cache.get(channels.publicChannelId);
                    if (publicChannel) {
                        const message = await publicChannel.messages.fetch(request.publicMessageId).catch(() => null);
                        if (message) await message.delete();
                    }
                }

                // Update request status
                request.status = STATUS.ARCHIVED;
                request.archivedAt = new Date();
                request.publicMessageId = null;
                await request.save();
                count++;
            } catch (error) {
                logger.warn(`Failed to archive request ${request._id}: ${error.message}`);
            }
        }

        return { count };
    }

    async cleanupDeletedRequests(guild, gameType, gameKey, config) {
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() - config.RequestDeleteDays);
        
        // Find old soft-deleted requests (archived, expired, cancelled) that are older than the delete threshold
        const oldSoftDeleted = await LFRequest.find({
            guildId: guild.id,
            type: gameType,
            game: gameKey,
            status: { $in: [STATUS.ARCHIVED, STATUS.EXPIRED, STATUS.CANCELLED] },
            createdAt: { $lt: deleteDate }
        });

        let count = 0;
        for (const request of oldSoftDeleted) {
            try {
                // Permanently delete the request from the database
                await LFRequest.findByIdAndDelete(request._id);
                count++;
            } catch (error) {
                logger.warn(`Failed to permanently delete request ${request._id}: ${error.message}`);
            }
        }

        return { count };
    }

    async handleStats(interaction) {
        const game = interaction.options.getString("game");
        const type = interaction.options.getString("type");

        // Build query
        const query = { guildId: interaction.guild.id };
        if (game) query.game = game.toLowerCase();
        if (type) query.type = type;

        const stats = await LFRequest.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalRequests = await LFRequest.countDocuments(query);
        const activeRequests = await LFRequest.countDocuments({ ...query, status: { $in: [STATUS.PENDING, STATUS.APPROVED] } });

        const embed = new EmbedBuilder()
            .setTitle("📊 LF System Statistics")
            .setColor(Colors.Blue)
            .setTimestamp();

        // Add filters to description
        const filters = [];
        if (game) {
            const lfpConfig = modalHandler.getGameConfig("lfp", game);
            const lftConfig = modalHandler.getGameConfig("lft", game);
            const gameDisplayName = lfpConfig?.displayName || lftConfig?.displayName || game;
            filters.push(`Game: ${gameDisplayName}`);
        }
        if (type) filters.push(`Type: ${type}`);

        if (filters.length) {
            embed.setDescription(`**Filters:** ${filters.join(" • ")}\n\n`);
        }

        embed.addFields(
            { name: "Total Requests", value: totalRequests.toString(), inline: true },
            { name: "Active Requests", value: activeRequests.toString(), inline: true }
        );

        // Add status breakdown
        const statusCounts = {};
        stats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
        });

        const statusText = Object.entries(STATUS)
            .map(([key, value]) => `${getStatusEmoji(value)} ${value}: ${statusCounts[value] || 0}`)
            .join("\n");

        embed.addFields({ name: "Status Breakdown", value: statusText, inline: false });

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleUser(interaction) {
        const target = interaction.options.getUser("target");
        const status = interaction.options.getString("status") || "all";

        // Build query
        const query = { 
            guildId: interaction.guild.id,
            userId: target.id 
        };
        if (status !== "all") query.status = status;

        const requests = await LFRequest.find(query)
            .sort({ createdAt: -1 })
            .limit(10);

        if (!requests.length) {
            return interaction.reply({
                embeds: [createWarningEmbed("No Requests Found", `${target.tag} has no requests matching your criteria.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Requests for ${target.tag}`)
            .setColor(Colors.Blue)
            .setTimestamp()
            .setThumbnail(target.displayAvatarURL({ dynamic: true }));

        if (status !== "all") {
            embed.setDescription(`**Status Filter:** ${status}\n\n`);
        }

        const requestList = requests.map(req => {
            const createdAt = Math.floor(new Date(req.createdAt).getTime() / 1000);
            const statusEmoji = getStatusEmoji(req.status);
            const primary = req.content?.teamName || 
                           req.content?.riotID || 
                           req.content?.steamID ||
                           req.content?.summonerName ||
                           Object.values(req.content || {})[0] || 
                           "No preview";

            // Get proper game display name
            const lfpConfig = modalHandler.getGameConfig("lfp", req.game);
            const lftConfig = modalHandler.getGameConfig("lft", req.game);
            const gameDisplayName = lfpConfig?.displayName || lftConfig?.displayName || req.game;

            return `• **${req.type}** | ${gameDisplayName} | ${statusEmoji} ${req.status.toUpperCase()} | <t:${createdAt}:R>\n  ↳ ${primary}\n  ID: \`${req._id}\``;
        }).join("\n\n");

        embed.addFields({ name: "Requests", value: requestList, inline: false });

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleLegacy(interaction) {
        const action = interaction.options.getString("action");
        const game = interaction.options.getString("game");

        switch (action) {
            case "list":
                await this.handleLegacyList(interaction);
                break;
            case "requests":
                await this.handleLegacyRequests(interaction, game);
                break;
            case "clean":
                await this.handleLegacyClean(interaction, game);
                break;
        }
    }

    async handleLegacyList(interaction) {
        // Get all games from database
        const allDbGames = await LFRequest.distinct("game", { guildId: interaction.guild.id });
        
        // Get active games from config
        const activeGames = new Set([
            ...Object.keys(modalHandler.lfpConfig),
            ...Object.keys(modalHandler.lftConfig)
        ]);

        // Find legacy games (in DB but not in config)
        const legacyGames = allDbGames.filter(gameKey => !activeGames.has(gameKey));

        if (legacyGames.length === 0) {
            return interaction.reply({
                embeds: [createSuccessEmbed("No Legacy Games", "No legacy games found. All games in the database have active configurations.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Get request counts for each legacy game
        const legacyGameData = await Promise.all(legacyGames.map(async gameKey => {
            const count = await LFRequest.countDocuments({ 
                guildId: interaction.guild.id, 
                game: gameKey 
            });
            return { game: gameKey, count };
        }));

        const embed = new EmbedBuilder()
            .setTitle("🎮 Legacy Games")
            .setDescription("Games that exist in the database but have been removed from configuration")
            .setColor(Colors.Orange)
            .setTimestamp();

        legacyGameData.forEach(({ game, count }) => {
            embed.addFields({
                name: `${game.charAt(0).toUpperCase() + game.slice(1)}`,
                value: `${count} request${count !== 1 ? 's' : ''}`,
                inline: true
            });
        });

        embed.setFooter({ 
            text: `Total: ${legacyGames.length} legacy game${legacyGames.length !== 1 ? 's' : ''} • Use /lfstaff legacy requests to view requests` 
        });

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    async handleLegacyRequests(interaction, game) {
        // Build query for legacy games
        const allDbGames = await LFRequest.distinct("game", { guildId: interaction.guild.id });
        const activeGames = new Set([
            ...Object.keys(modalHandler.lfpConfig),
            ...Object.keys(modalHandler.lftConfig)
        ]);
        const legacyGames = allDbGames.filter(gameKey => !activeGames.has(gameKey));

        if (legacyGames.length === 0) {
            return interaction.reply({
                embeds: [createSuccessEmbed("No Legacy Games", "No legacy games found.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Build query
        const query = { 
            guildId: interaction.guild.id,
            game: game ? game.toLowerCase() : { $in: legacyGames }
        };

        const requests = await LFRequest.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        if (!requests.length) {
            return interaction.reply({
                embeds: [createWarningEmbed("No Legacy Requests Found", game ? `No requests found for legacy game: ${game}` : "No legacy requests found.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Build embed with pagination
        const perPage = 8;
        let page = 0;
        const totalPages = Math.ceil(requests.length / perPage);

        const buildEmbed = (page) => {
            const slice = requests.slice(page * perPage, (page + 1) * perPage);
            
            const requestList = slice.map(req => {
                const createdAt = Math.floor(new Date(req.createdAt).getTime() / 1000);
                const statusEmoji = getStatusEmoji(req.status);
                const primary = req.content?.teamName || 
                               req.content?.riotID || 
                               req.content?.steamID ||
                               req.content?.summonerName ||
                               Object.values(req.content || {})[0] || 
                               "No preview";

                return `• **${req.type}** | ${req.game} | ${statusEmoji} ${req.status.toUpperCase()} | <t:${createdAt}:R>\n  ↳ ${primary}\n  ID: \`${req._id}\``;
            }).join("\n\n");

            return new EmbedBuilder()
                .setTitle(`🎮 Legacy Requests${game ? ` - ${game}` : ''}`)
                .setDescription(requestList)
                .setColor(Colors.Orange)
                .setTimestamp()
                .setFooter({
                    text: `Page ${page + 1} of ${totalPages} | Total: ${requests.length} legacy requests`
                });
        };

        const buildMenu = (page) => {
            if (totalPages <= 1) return null;
            
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("legacy_page_select")
                    .setPlaceholder("Jump to page...")
                    .addOptions(
                        [...Array(totalPages)].map((_, i) => ({
                            label: `Page ${i + 1}`,
                            value: i.toString(),
                            default: i === page,
                        }))
                    )
            );
        };

        const components = buildMenu(page);
        const replyOptions = {
            embeds: [buildEmbed(page)],
            flags: MessageFlags.Ephemeral
        };
        
        // Only add components if pagination menu exists (multiple pages)
        if (components) {
            replyOptions.components = [components];
        }

        const msg = await interaction.reply(replyOptions);

        if (totalPages > 1) {
            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60_000,
            });

            collector.on("collect", async (int) => {
                if (int.user.id !== interaction.user.id) {
                    return int.reply({
                        content: "This is not your menu.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                page = parseInt(int.values[0]);
                const newComponents = buildMenu(page);

                const updateOptions = {
                    embeds: [buildEmbed(page)]
                };
                
                if (newComponents) {
                    updateOptions.components = [newComponents];
                }

                await int.update(updateOptions);
            });

            collector.on("end", async () => {
                await msg.edit({ components: [] }).catch(() => null);
            });
        }
    }

    async handleLegacyClean(interaction, game) {
        // Build query for legacy games
        const allDbGames = await LFRequest.distinct("game", { guildId: interaction.guild.id });
        const activeGames = new Set([
            ...Object.keys(modalHandler.lfpConfig),
            ...Object.keys(modalHandler.lftConfig)
        ]);
        const legacyGames = allDbGames.filter(gameKey => !activeGames.has(gameKey));

        if (legacyGames.length === 0) {
            return interaction.reply({
                embeds: [createSuccessEmbed("No Legacy Games", "No legacy games found to clean.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Build query
        const query = { 
            guildId: interaction.guild.id,
            game: game ? game.toLowerCase() : { $in: legacyGames }
        };

        // Count requests that would be affected
        const count = await LFRequest.countDocuments(query);
        
        if (count === 0) {
            return interaction.reply({
                embeds: [createWarningEmbed("No Requests Found", game ? `No legacy requests found for game: ${game}` : "No legacy requests found.")],
                flags: MessageFlags.Ephemeral
            });
        }

        // Create confirmation embed
        const embed = new EmbedBuilder()
            .setTitle("🧹 Clean Legacy Requests")
            .setDescription(`This will **permanently delete** ${count} legacy request${count !== 1 ? 's' : ''}${game ? ` for game: **${game}**` : ''}.\n\n**This action cannot be undone!**`)
            .setColor(Colors.Red)
            .setTimestamp();

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("legacy_clean_confirm")
                .setLabel("Confirm Deletion")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("legacy_clean_cancel")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
        );

        const msg = await interaction.reply({
            embeds: [embed],
            components: [confirmRow],
            flags: MessageFlags.Ephemeral
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
        });

        collector.on("collect", async (int) => {
            if (int.user.id !== interaction.user.id) {
                return int.reply({
                    content: "This is not your confirmation.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (int.customId === "legacy_clean_confirm") {
                try {
                    const result = await LFRequest.deleteMany(query);
                    
                    await int.update({
                        embeds: [createSuccessEmbed("Legacy Requests Cleaned", `Successfully deleted ${result.deletedCount} legacy request${result.deletedCount !== 1 ? 's' : ''}${game ? ` for game: ${game}` : ''}.`)],
                        components: []
                    });

                    // Log the action
                    await logLFAction(this.client, config, "legacy_clean", null, interaction.user, null, `Cleaned ${result.deletedCount} legacy requests${game ? ` for game: ${game}` : ''}`);
                } catch (error) {
                    logger.error(`Error cleaning legacy requests: ${error.message}`);
                    await int.update({
                        embeds: [createErrorEmbed("Cleanup Failed", "An error occurred while cleaning legacy requests.")],
                        components: []
                    });
                }
            } else if (int.customId === "legacy_clean_cancel") {
                await int.update({
                    embeds: [createWarningEmbed("Cleanup Cancelled", "Legacy request cleanup was cancelled.")],
                    components: []
                });
            }
        });

        collector.on("end", async () => {
            await msg.edit({ components: [] }).catch(() => null);
        });
    }
}

module.exports = LFTStaff;
