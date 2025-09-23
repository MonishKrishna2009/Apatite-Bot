const { EmbedBuilder, Colors } = require("discord.js");
const { Logger } = require("./Logger");
const logger = new Logger();

/**
 * Logs LF actions for accountability
 * @param {Object} client - Discord client
 * @param {Object} config - Configuration object
 * @param {string} action - Action performed
 * @param {Object} request - LFRequest document
 * @param {Object} user - User who performed the action
 * @param {Object} staff - Staff member (if applicable)
 * @param {string} reason - Reason for action (if applicable)
 */
async function logLFAction(client, config, action, request, user, staff = null, reason = null) {
    try {
        const logChannelId = config.lfActionLogChannelId;
        if (!logChannelId) {
            logger.warn("LF Action Log channel not configured");
            return;
        }

        const logChannel = client.channels.cache.get(logChannelId);
        if (!logChannel) {
            logger.warn(`LF Action Log channel not found: ${logChannelId}`);
            return;
        }

        const actionColors = {
            'create': Colors.Green,
            'edit': Colors.Blue,
            'approve': Colors.Green,
            'decline': Colors.Red,
            'cancel': Colors.Orange,
            'resend': Colors.Purple,
            'delete': Colors.DarkRed,
            'archive': Colors.Grey,
            'expire': Colors.Yellow
        };

        const actionEmojis = {
            'create': '📝',
            'edit': '✏️',
            'approve': '✅',
            'decline': '❌',
            'cancel': '🚫',
            'resend': '🔄',
            'delete': '🗑️',
            'archive': '📦',
            'expire': '⏰'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${actionEmojis[action] || '📋'} LF Action: ${action.toUpperCase()}`)
            .setColor(actionColors[action] || Colors.Grey)
            .setTimestamp()
            .setDescription(
                `>>> **Request ID:** \`${request._id}\`\n` +
                `**Type:** ${request.type}\n` +
                `**Game:** ${request.game}\n` +
                `**Status:** ${request.status}\n` +
                `**User:** <@${user.id}> (${user.tag})\n` +
                `**Guild ID:** \`${request.guildId}\`` +
                (staff ? `\n**Staff Member:** <@${staff.id}> (${staff.tag})` : '') +
                (reason ? `\n**Reason:** ${reason}` : '')
            );

        // Add request content preview
        const contentPreview = Object.entries(request.content || {})
            .slice(0, 3) // Show first 3 fields
            .map(([key, value]) => `**${key}**: ${value}`)
            .join('\n');

        if (contentPreview) {
            embed.addFields({ 
                name: '📋 Request Details', 
                value: `>>> ${contentPreview}`, 
                inline: false 
            });
        }

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        logger.error(`Failed to log LF action: ${error.message}`);
    }
}

/**
 * Get game-specific channel IDs
 * @param {Object} config - Configuration object
 * @param {string} game - Game name (lowercase)
 * @returns {Object} - { reviewChannelId, publicChannelId }
 */
function getGameChannels(config, game) {
    const gameKey = game.toLowerCase();
    const gameChannels = config.gameChannels?.[gameKey];
    
    if (gameChannels) {
        return {
            reviewChannelId: gameChannels.reviewChannelId,
            publicChannelId: gameChannels.publicChannelId
        };
    }
    
    // Fallback to legacy channels
    return {
        reviewChannelId: config.valoReviewChannelId,
        publicChannelId: config.valolfpLftChannelId
    };
}

module.exports = { logLFAction, getGameChannels };
