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

const { EmbedBuilder, Colors } = require("discord.js");
const { Logger } = require("../Logger");
const logger = new Logger();

/**
 * Send a formatted log embed to the configured LF action log channel describing a leaderboard/request-related action.
 *
 * When a `request` is provided the embed includes request metadata and a short preview of up to three content fields.
 * When `request` is null the embed contains a summary for bulk or system-level actions and includes optional staff and reason.
 *
 * @param {string} action - Action identifier (e.g., "create", "approve", "delete", "legacy_clean", "bulk_cleanup", "system_action").
 * @param {Object|null} request - LFRequest document to log; pass `null` for bulk/system actions.
 * @param {Object} user - User who performed the action (object containing at least `id` and `tag`).
 * @param {Object|null} [staff=null] - Staff member involved, if applicable (object containing at least `id` and `tag`).
 * @param {string|null} [reason=null] - Optional reason or note describing the action.
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
            'expire': Colors.Yellow,
            'legacy_clean': Colors.Red,
            'bulk_cleanup': Colors.Orange,
            'system_action': Colors.Blue
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
            'expire': '⏰',
            'legacy_clean': '🧹',
            'bulk_cleanup': '🧽',
            'system_action': '⚙️'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${actionEmojis[action] || '📋'} LF Action: ${action.toUpperCase()}`)
            .setColor(actionColors[action] || Colors.Grey)
            .setTimestamp();

        // Handle cases where request is null (e.g., bulk operations, system actions)
        if (request) {
            embed.setDescription(
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
        } else {
            // For actions without specific request (bulk operations, system actions)
            embed.setDescription(
                `>>> **Action:** ${action.toUpperCase()}\n` +
                `**User:** <@${user.id}> (${user.tag})\n` +
                (staff ? `**Staff Member:** <@${staff.id}> (${staff.tag})\n` : '') +
                (reason ? `**Reason:** ${reason}` : '')
            );
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
    
    // Try to get from JSON config files first
    try {
        const modalHandler = require("./modalHandler");
        const lfpConfig = modalHandler.lfpConfig;
        const lftConfig = modalHandler.lftConfig;
        
        // Check both LFP and LFT configs for the game
        const gameConfig = lfpConfig[gameKey] || lftConfig[gameKey];
        if (gameConfig) {
            return {
                reviewChannelId: gameConfig.reviewChannel,
                publicChannelId: gameConfig.publicChannel
            };
        }
    } catch (error) {
        logger.warn(`Failed to load game config for ${game}: ${error.message}`);
    }
    
    // Fallback to legacy config structure
    const gameChannels = config.gameChannels?.[gameKey];
    if (gameChannels) {
        return {
            reviewChannelId: gameChannels.reviewChannelId,
            publicChannelId: gameChannels.publicChannelId
        };
    }
    
    // Final fallback to legacy channels
    return {
        reviewChannelId: config.valoReviewChannelId,
        publicChannelId: config.valolfpLftChannelId
    };
}

module.exports = { logLFAction, getGameChannels };
