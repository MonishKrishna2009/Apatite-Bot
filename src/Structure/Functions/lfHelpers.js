const { EmbedBuilder, Colors, MessageFlags } = require("discord.js");
const LFRequest = require("../Schemas/LookingFor/lfplft");
const { Logger } = require("./Logger");
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
 * Check if a status transition is allowed
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} - Whether transition is allowed
 */
function isStatusTransitionAllowed(fromStatus, toStatus) {
    return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
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
 * Get request preview text for lists
 * @param {Object} request - LFRequest document
 * @returns {string} - Formatted preview text
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
 * Clean up expired and archived requests
 * @param {Object} guild - Discord guild object
 * @param {string} userId - User ID
 * @param {string} type - Request type (LFP or LFT)
 * @param {string} publicChannelId - Public channel ID
 * @param {Object} config - Configuration object
 * @returns {Object} - Cleanup results
 */
async function cleanupRequests(guild, userId, type, publicChannelId, config) {
    const results = {
        expired: 0,
        archived: 0,
        errors: []
    };

    try {
        // Expire old pending requests
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - config.RequestExpiryDays);

        const expiredResult = await LFRequest.updateMany(
            {
                userId,
                guildId: guild.id,
                type,
                status: STATUS.PENDING,
                createdAt: { $lt: expiryDate }
            },
            { 
                $set: { 
                    status: STATUS.EXPIRED, 
                    expiresAt: new Date()
                } 
            }
        );
        results.expired = expiredResult.modifiedCount;

        // Archive old approved requests
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - config.RequestArchiveDays);

        const oldApproved = await LFRequest.find({
            userId,
            guildId: guild.id,
            type,
            status: STATUS.APPROVED,
            createdAt: { $lt: archiveDate }
        });

        for (const req of oldApproved) {
            try {
                // Delete public message if it exists
                if (req.publicMessageId) {
                    const publicChannel = guild.channels.cache.get(publicChannelId);
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
    } catch (error) {
        logger.error(`Error during cleanup: ${error.message}`);
        results.errors.push(`Cleanup failed: ${error.message}`);
    }

    return results;
}

module.exports = {
    STATUS,
    isStatusTransitionAllowed,
    getStatusColor,
    getStatusEmoji,
    isValidRequestId,
    canUserPerformAction,
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    softDeleteRequest,
    getRequestPreview,
    cleanupRequests
};
