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

const { EmbedBuilder, Colors, MessageFlags } = require("discord.js");
const LFRequest = require("../../Schemas/LookingFor/lfplft");
const { Logger } = require("../Logger");
const logger = new Logger();

/**
 * Standard status values for LF requests
 */
const STATUS = {
    PENDING: "pending",
    APPROVED: "approved", 
    DECLINED: "declined",
    ARCHIVED: "archived",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
    DELETED: "deleted"
};

/**
 * Status transitions that are allowed
 */
const ALLOWED_TRANSITIONS = {
    [STATUS.PENDING]: [STATUS.APPROVED, STATUS.DECLINED, STATUS.CANCELLED, STATUS.EXPIRED],
    [STATUS.APPROVED]: [STATUS.ARCHIVED, STATUS.CANCELLED, STATUS.DELETED],
    [STATUS.DECLINED]: [STATUS.DELETED],
    [STATUS.ARCHIVED]: [STATUS.DELETED],
    [STATUS.EXPIRED]: [STATUS.DELETED],
    [STATUS.CANCELLED]: [STATUS.DELETED]
};

/**
 * Determine whether a transition from one status to another is permitted.
 *
 * Checks the configured allowed transitions and returns `false` if either input is falsy.
 * @param {string} fromStatus - Current status (one of the defined STATUS values).
 * @param {string} toStatus - Desired target status (one of the defined STATUS values).
 * @returns {boolean} `true` if the transition from `fromStatus` to `toStatus` is allowed, `false` otherwise.
 */
function isStatusTransitionAllowed(fromStatus, toStatus) {
    if (!fromStatus || !toStatus) return false;
    return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
}

/**
 * Check whether a status string is one of the defined STATUS values.
 * @param {string} status - The status string to check (must match a value in `STATUS`).
 * @returns {boolean} `true` if `status` matches one of the defined `STATUS` values, `false` otherwise.
 */
function isValidStatus(status) {
    return Object.values(STATUS).includes(status);
}

/**
 * Normalize a status string to lowercase.
 * @param {string} status - The status string to normalize.
 * @returns {string|null} The lowercase status string, or `null` if the input is falsy.
 */
function normalizeStatus(status) {
    if (!status) return null;
    return status.toLowerCase();
}

/**
 * Determine whether the given status is considered active.
 * @param {string} status - Status value to evaluate (case-insensitive).
 * @returns {boolean} `true` if the status is pending or approved, `false` otherwise.
 */
function isActiveStatus(status) {
    return [STATUS.PENDING, STATUS.APPROVED].includes(normalizeStatus(status));
}

/**
 * Determines whether a status is considered soft-deleted.
 * @param {string} status - Status to check.
 * @returns {boolean} `true` if the status is one of declined, archived, expired, or cancelled; `false` otherwise.
 */
function isSoftDeletedStatus(status) {
    return [STATUS.DECLINED, STATUS.ARCHIVED, STATUS.EXPIRED, STATUS.CANCELLED].includes(normalizeStatus(status));
}

/**
 * Get status color for embeds
 * @param {string} status - Request status
 * @returns {Colors} - Discord color
 */
function getStatusColor(status) {
    const colorMap = {
        [STATUS.PENDING]: Colors.Yellow,
        [STATUS.APPROVED]: Colors.Green,
        [STATUS.DECLINED]: Colors.Red,
        [STATUS.ARCHIVED]: Colors.Grey,
        [STATUS.EXPIRED]: Colors.Orange,
        [STATUS.CANCELLED]: Colors.Blue,
        [STATUS.DELETED]: Colors.DarkGrey
    };
    return colorMap[status] || Colors.Grey;
}

/**
 * Get status emoji for display
 * @param {string} status - Request status
 * @returns {string} - Emoji string
 */
function getStatusEmoji(status) {
    const emojiMap = {
        [STATUS.PENDING]: "⏳",
        [STATUS.APPROVED]: "✅",
        [STATUS.DECLINED]: "❌",
        [STATUS.ARCHIVED]: "📦",
        [STATUS.EXPIRED]: "⏰",
        [STATUS.CANCELLED]: "🚫",
        [STATUS.DELETED]: "🗑️"
    };
    return emojiMap[status] || "❓";
}

/**
 * Validate request ID format
 * @param {string} id - Request ID to validate
 * @returns {boolean} - Whether ID is valid
 */
function isValidRequestId(id) {
    const mongoose = require("mongoose");
    return mongoose.isValidObjectId(id);
}

/**
 * Check if user can perform action on request
 * @param {Object} request - LFRequest document
 * @param {string} userId - User ID
 * @param {string} action - Action being performed
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
function canUserPerformAction(request, userId, action) {
    // Check ownership
    if (request.userId !== userId) {
        return { allowed: false, reason: "You can only manage your own requests." };
    }

    // Check if request exists in current guild
    if (!request.guildId) {
        return { allowed: false, reason: "Request not found in this server." };
    }

    // Action-specific checks
    switch (action) {
        case "cancel":
            if (![STATUS.PENDING, STATUS.APPROVED].includes(request.status)) {
                return { 
                    allowed: false, 
                    reason: `Only ${STATUS.PENDING} or ${STATUS.APPROVED} requests can be cancelled.` 
                };
            }
            break;
        
        case "resend":
            if (![STATUS.ARCHIVED, STATUS.EXPIRED].includes(request.status)) {
                return { 
                    allowed: false, 
                    reason: `Only ${STATUS.ARCHIVED} or ${STATUS.EXPIRED} requests can be resent.` 
                };
            }
            break;
        
        case "delete":
            if (![STATUS.DECLINED, STATUS.ARCHIVED, STATUS.EXPIRED, STATUS.CANCELLED].includes(request.status)) {
                return { 
                    allowed: false, 
                    reason: `Only ${STATUS.DECLINED}, ${STATUS.ARCHIVED}, ${STATUS.EXPIRED}, or ${STATUS.CANCELLED} requests can be deleted.` 
                };
            }
            break;
        
        case "edit":
            if (![STATUS.PENDING, STATUS.APPROVED].includes(request.status)) {
                return { 
                    allowed: false, 
                    reason: `Only ${STATUS.PENDING} or ${STATUS.APPROVED} requests can be edited.` 
                };
            }
            break;
    }

    return { allowed: true };
}

/**
 * Create a standardized error embed
 * @param {string} title - Error title
 * @param {string} description - Error description
 * @param {string} status - Request status (optional)
 * @returns {EmbedBuilder} - Error embed
 */
function createErrorEmbed(title, description, status = null) {
    const embed = new EmbedBuilder()
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setColor(Colors.Red)
        .setTimestamp();
    
    if (status) {
        embed.setFooter({ text: `Status: ${getStatusEmoji(status)} ${status.toUpperCase()}` });
    }
    
    return embed;
}

/**
 * Create a standardized success embed
 * @param {string} title - Success title
 * @param {string} description - Success description
 * @param {string} status - Request status (optional)
 * @returns {EmbedBuilder} - Success embed
 */
function createSuccessEmbed(title, description, status = null) {
    const embed = new EmbedBuilder()
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setColor(Colors.Green)
        .setTimestamp();
    
    if (status) {
        embed.setFooter({ text: `Status: ${getStatusEmoji(status)} ${status.toUpperCase()}` });
    }
    
    return embed;
}

/**
 * Create a standardized warning embed
 * @param {string} title - Warning title
 * @param {string} description - Warning description
 * @param {string} status - Request status (optional)
 * @returns {EmbedBuilder} - Warning embed
 */
function createWarningEmbed(title, description, status = null) {
    const embed = new EmbedBuilder()
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setColor(Colors.Yellow)
        .setTimestamp();
    
    if (status) {
        embed.setFooter({ text: `Status: ${getStatusEmoji(status)} ${status.toUpperCase()}` });
    }
    
    return embed;
}

/**
 * Soft delete a request (mark as deleted)
 * @param {string} requestId - Request ID
 * @param {string} guildId - Guild ID
 * @returns {Object} - { success: boolean, request?: Object, error?: string }
 */
async function softDeleteRequest(requestId, guildId) {
    try {
        const request = await LFRequest.findOneAndUpdate(
            { _id: requestId, guildId, status: { $in: [STATUS.DECLINED, STATUS.ARCHIVED, STATUS.EXPIRED, STATUS.CANCELLED] } },
            { 
                $set: { 
                    status: STATUS.DELETED, 
                    deletedAt: new Date(),
                    messageId: null,
                    publicMessageId: null
                } 
            },
            { new: true }
        );

        if (!request) {
            return { success: false, error: "Request not found or cannot be deleted." };
        }

        return { success: true, request };
    } catch (error) {
        logger.error(`Error soft deleting request ${requestId}: ${error.message}`);
        return { success: false, error: "Failed to delete request." };
    }
}

/**
 * Build a compact, human-readable preview string for a request suitable for lists.
 *
 * The preview includes the request type, game, status (with emoji), relative creation time,
 * a primary content field (teamName, riotID, lookingFor, or the first content value), and the request ID.
 * @param {Object} request - LFRequest-like document containing at least `type`, `game`, `status`, `createdAt`, `content`, and `_id`.
 * @returns {string} Formatted single-string preview for display in lists.
 */
function getRequestPreview(request) {
    const createdAt = Math.floor(new Date(request.createdAt).getTime() / 1000);
    const statusEmoji = getStatusEmoji(request.status);
    
    const primary = request.content?.teamName || 
                   request.content?.riotID || 
                   request.content?.lookingFor || 
                   Object.values(request.content || {})[0] || 
                   "No preview";

    return `• **${request.type}** | ${request.game} | ${statusEmoji} ${request.status.toUpperCase()} | <t:${createdAt}:R>\n  ↳ ${primary}\n  ID: \`${request._id}\``;
}

/**
 * Perform expiration and archival cleanup of LookingFor requests for a guild and optional user.
 *
 * Expires pending requests whose `expiresAt` is before now, and archives approved requests older than `config.RequestArchiveDays`. When archiving, attempts to delete the request's public message (if any), sets status to `ARCHIVED`, records `archivedAt`, and clears `publicMessageId`.
 * @param {Object} guild - Discord guild object whose requests will be cleaned.
 * @param {string|null} userId - If provided, restrict cleanup to this user's requests; pass `null` to operate on all users.
 * @param {string} type - Request type to target (e.g., `"LFP"` or `"LFT"`).
 * @param {string} publicChannelId - Legacy channel ID parameter (not used for game-specific channel resolution).
 * @param {Object} config - Configuration containing `RequestArchiveDays` (days before approved requests are archived). `RequestExpiryDays` is available in config but expiration uses each request's `expiresAt`.
 * @returns {Object} Results of the operation containing:
 *  - `{number} expired` — count of requests transitioned to `EXPIRED`.
 *  - `{number} archived` — count of requests transitioned to `ARCHIVED`.
 *  - `{string[]} errors` — list of error messages encountered during cleanup.
 */
async function cleanupRequests(guild, userId, type, publicChannelId, config) {
    const results = {
        expired: 0,
        archived: 0,
        errors: []
    };

    try {
        // Log cleanup start
        const scope = userId ? `user ${userId}` : 'all users';
        logger.info(`Starting cleanup for ${scope} in guild ${guild.id} (${type})`);

        // Expire old pending requests (using expiresAt field)
        const now = new Date();

        // Build query conditionally based on userId
        const expireQuery = {
            guildId: guild.id,
            type,
            status: STATUS.PENDING,
            expiresAt: { $lt: now }
        };
        
        // Only add userId filter if userId is provided (not null)
        if (userId !== null) {
            expireQuery.userId = userId;
        }

        const expiredResult = await LFRequest.updateMany(
            expireQuery,
            { 
                $set: { 
                    status: STATUS.EXPIRED
                } 
            }
        );
        results.expired = expiredResult.modifiedCount;
        
        // Log expiry results
        if (results.expired > 0) {
            logger.info(`Expired ${results.expired} pending requests for ${scope} in guild ${guild.id} (${type})`);
        }

        // Archive old approved requests
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - config.RequestArchiveDays);

        // Build query conditionally based on userId
        const archiveQuery = {
            guildId: guild.id,
            type,
            status: STATUS.APPROVED,
            createdAt: { $lt: archiveDate }
        };
        
        // Only add userId filter if userId is provided (not null)
        if (userId !== null) {
            archiveQuery.userId = userId;
        }

        const oldApproved = await LFRequest.find(archiveQuery);

        for (const req of oldApproved) {
            try {
                // Delete public message if it exists
                if (req.publicMessageId) {
                    const { getGameChannels } = require("./lfActionLogger");
                    const channels = getGameChannels(config, req.game);
                    const publicChannel = guild.channels.cache.get(channels.publicChannelId);
                    if (publicChannel) {
                        const msg = await publicChannel.messages.fetch(req.publicMessageId).catch(() => null);
                        if (msg) await msg.delete();
                    }
                }

                // Update request status
                req.status = STATUS.ARCHIVED;
                req.archivedAt = new Date();
                req.publicMessageId = null;
                await req.save();
                results.archived++;
            } catch (error) {
                logger.warn(`Failed to archive request ${req._id}: ${error.message}`);
                results.errors.push(`Failed to archive request ${req._id}: ${error.message}`);
            }
        }
        
        // Log archive results
        if (results.archived > 0) {
            logger.info(`Archived ${results.archived} approved requests for ${scope} in guild ${guild.id} (${type})`);
        }
        
        // Log completion
        logger.info(`Cleanup completed for ${scope} in guild ${guild.id} (${type}): ${results.expired} expired, ${results.archived} archived`);
        
    } catch (error) {
        const scope = userId ? `user ${userId}` : 'all users';
        logger.error(`Error during cleanup for ${scope} in guild ${guild.id} (${type}): ${error.message}`);
        results.errors.push(`Cleanup failed: ${error.message}`);
    }

    return results;
}

/**
 * Run cleanup across all guilds to expire and archive LookingFor requests, aggregating results.
 *
 * @returns {{totalExpired: number, totalArchived: number, errors: string[]}} Totals of expired and archived requests and collected error messages.
 */
async function globalCleanup(client, config) {
    const results = {
        totalExpired: 0,
        totalArchived: 0,
        errors: []
    };

    let guildCount = 0; // Declare outside try block to ensure it's always in scope
    logger.info('Starting global cleanup across all guilds');

    try {
        // Get all guilds where the bot is present
        const guilds = client.guilds.cache.values();
        
        for (const guild of guilds) {
            guildCount++;
            try {
                logger.info(`Processing guild ${guild.id} (${guild.name}) - ${guildCount}/${client.guilds.cache.size}`);
                
                // Cleanup requests for each game type
                const gameTypes = ['LFP', 'LFT'];
                
                for (const type of gameTypes) {
                    // Get all unique games for this guild and type
                    const games = await LFRequest.distinct('game', {
                        guildId: guild.id,
                        type: type
                    });
                    
                    if (games.length === 0) {
                        logger.debug(`No ${type} requests found for guild ${guild.id}`);
                        continue;
                    }
                    
                    logger.debug(`Found ${games.length} games for ${type} in guild ${guild.id}: ${games.join(', ')}`);
                    
                    for (const game of games) {
                        try {
                            const { getGameChannels } = require("./lfActionLogger");
                            const channels = getGameChannels(config, game);
                            const gameResults = await cleanupRequests(guild, null, type, channels.publicChannelId, config);
                            results.totalExpired += gameResults.expired;
                            results.totalArchived += gameResults.archived;
                            results.errors.push(...gameResults.errors);
                        } catch (error) {
                            logger.error(`Error cleaning up ${type} requests for game ${game} in guild ${guild.id}: ${error.message}`);
                            results.errors.push(`Guild ${guild.id} (${game} ${type}): ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                logger.error(`Error cleaning up guild ${guild.id}: ${error.message}`);
                results.errors.push(`Guild ${guild.id}: ${error.message}`);
            }
        }
    } catch (error) {
        logger.error(`Global cleanup failed: ${error.message}`);
        results.errors.push(`Global cleanup: ${error.message}`);
    }

    // Log final results
    logger.info(`Global cleanup completed: ${results.totalExpired} expired, ${results.totalArchived} archived across ${guildCount} guilds`);
    if (results.errors.length > 0) {
        logger.warn(`Global cleanup had ${results.errors.length} errors: ${results.errors.join('; ')}`);
    }

    return results;
}

module.exports = {
    STATUS,
    isStatusTransitionAllowed,
    isValidStatus,
    normalizeStatus,
    isActiveStatus,
    isSoftDeletedStatus,
    getStatusColor,
    getStatusEmoji,
    isValidRequestId,
    canUserPerformAction,
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    softDeleteRequest,
    getRequestPreview,
    cleanupRequests,
    globalCleanup
};
