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
const { createErrorEmbed } = require("./lfHelpers");
const { Logger } = require("../Logger");
const logger = new Logger();

/**
 * Timeout Handler for LF System
 * Handles various timeout scenarios and provides fallback responses
 */
class TimeoutHandler {
    constructor() {
        this.defaultTimeout = 30000; // 30 seconds
        this.longTimeout = 60000; // 60 seconds for database operations
    }

    /**
     * Execute a function with timeout handling
     * @param {Function} fn - Function to execute
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} operation - Operation name for logging
     * @returns {Promise} - Function result or timeout error
     */
    async executeWithTimeout(fn, timeoutMs = this.defaultTimeout, operation = "operation") {
        let timeoutHandle;
        
        // Create a promise that rejects after the specified timeout
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`Timeout: ${operation} took longer than ${timeoutMs}ms`));
            }, timeoutMs);
        });

        // Wrap the function call to convert synchronous exceptions to promise rejections
        // This ensures that if fn() throws synchronously, it becomes a rejected promise
        const wrappedFunction = Promise.resolve().then(() => fn());

        try {
            // Race the function execution against the timeout
            // Whichever resolves/rejects first wins
            return await Promise.race([wrappedFunction, timeoutPromise]);
        } finally {
            // Always clear the timeout to prevent memory leaks and unhandled rejections
            // This runs regardless of whether the function succeeded, failed, or timed out
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
    }

    /**
     * Handle interaction reply with timeout
     * @param {Object} interaction - Discord interaction
     * @param {Object} replyOptions - Reply options
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<boolean>} - Success status
     */
    async handleInteractionReply(interaction, replyOptions, timeoutMs = 5000) {
        try {
            await this.executeWithTimeout(
                () => interaction.reply(replyOptions),
                timeoutMs,
                "interaction reply"
            );
            return true;
        } catch (error) {
            logger.error(`Failed to reply to interaction ${interaction.id}: ${error.message}`);
            
            // Try to send a fallback response
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        embeds: [createErrorEmbed("Timeout", "The operation took too long to complete. Please try again.")],
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        embeds: [createErrorEmbed("Timeout", "The operation took too long to complete. Please try again.")],
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (fallbackError) {
                logger.error(`Failed to send fallback response for interaction ${interaction.id}: ${fallbackError.message}`);
            }
            
            return false;
        }
    }

    /**
     * Handle database operations with timeout
     * @param {Function} dbOperation - Database operation function
     * @param {string} operation - Operation name
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise} - Operation result
     */
    async handleDatabaseOperation(dbOperation, operation = "database operation", timeoutMs = this.longTimeout) {
        try {
            return await this.executeWithTimeout(dbOperation, timeoutMs, operation);
        } catch (error) {
            if (error.message.includes("Timeout")) {
                throw new Error(`Database operation '${operation}' timed out after ${timeoutMs}ms`);
            }
            throw error;
        }
    }

    /**
     * Handle message sending with timeout
     * @param {Object} channel - Discord channel
     * @param {Object} messageOptions - Message options
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<Object>} - Sent message or null
     */
    async handleMessageSend(channel, messageOptions, timeoutMs = 10000) {
        try {
            const message = await this.executeWithTimeout(
                () => channel.send(messageOptions),
                timeoutMs,
                "message send"
            );
            return message;
        } catch (error) {
            logger.error(`Failed to send message to channel ${channel.id}: ${error.message}`);
            return null;
        }
    }

    /**
     * Handle message editing with timeout
     * @param {Object} message - Discord message
     * @param {Object} editOptions - Edit options
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<boolean>} - Success status
     */
    async handleMessageEdit(message, editOptions, timeoutMs = 5000) {
        try {
            await this.executeWithTimeout(
                () => message.edit(editOptions),
                timeoutMs,
                "message edit"
            );
            return true;
        } catch (error) {
            logger.error(`Failed to edit message ${message.id}: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle message deletion with timeout
     * @param {Object} message - Discord message
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<boolean>} - Success status
     */
    async handleMessageDelete(message, timeoutMs = 3000) {
        try {
            await this.executeWithTimeout(
                () => message.delete(),
                timeoutMs,
                "message delete"
            );
            return true;
        } catch (error) {
            logger.error(`Failed to delete message ${message.id}: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle user fetching with timeout
     * @param {Object} client - Discord client
     * @param {string} userId - User ID
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<Object|null>} - User object or null
     */
    async handleUserFetch(client, userId, timeoutMs = 5000) {
        try {
            const user = await this.executeWithTimeout(
                () => client.users.fetch(userId),
                timeoutMs,
                "user fetch"
            );
            return user;
        } catch (error) {
            logger.error(`Failed to fetch user ${userId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Handle guild member fetching with timeout
     * @param {Object} guild - Discord guild
     * @param {string} userId - User ID
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<Object|null>} - Guild member or null
     */
    async handleMemberFetch(guild, userId, timeoutMs = 5000) {
        try {
            const member = await this.executeWithTimeout(
                () => guild.members.fetch(userId),
                timeoutMs,
                "member fetch"
            );
            return member;
        } catch (error) {
            logger.error(`Failed to fetch member ${userId} from guild ${guild.id}: ${error.message}`);
            return null;
        }
    }

    /**
     * Handle channel fetching with timeout
     * @param {Object} guild - Discord guild
     * @param {string} channelId - Channel ID
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<Object|null>} - Channel or null
     */
    async handleChannelFetch(guild, channelId, timeoutMs = 5000) {
        try {
            const channel = await this.executeWithTimeout(
                () => guild.channels.fetch(channelId),
                timeoutMs,
                "channel fetch"
            );
            return channel;
        } catch (error) {
            logger.error(`Failed to fetch channel ${channelId} from guild ${guild.id}: ${error.message}`);
            return null;
        }
    }

    /**
     * Create a timeout error embed
     * @param {string} operation - Operation that timed out
     * @returns {EmbedBuilder} - Error embed
     */
    createTimeoutErrorEmbed(operation = "operation") {
        return new EmbedBuilder()
            .setTitle("⏱️ Operation Timeout")
            .setColor(Colors.Orange)
            .setDescription(`The ${operation} took too long to complete and has been cancelled.`)
            .addFields({
                name: "What to do next",
                value: "• Try the command again\n• Check if the server is experiencing issues\n• Contact support if the problem persists",
                inline: false
            })
            .setTimestamp();
    }

    /**
     * Create a database timeout error embed
     * @param {string} operation - Database operation that timed out
     * @returns {EmbedBuilder} - Error embed
     */
    createDatabaseTimeoutErrorEmbed(operation = "database operation") {
        return new EmbedBuilder()
            .setTitle("🗄️ Database Timeout")
            .setColor(Colors.Red)
            .setDescription(`The ${operation} timed out. This usually indicates server issues.`)
            .addFields({
                name: "What to do next",
                value: "• Wait a few minutes and try again\n• Check server status\n• Contact an administrator if the issue persists",
                inline: false
            })
            .setTimestamp();
    }
}

// Create singleton instance
const timeoutHandler = new TimeoutHandler();

module.exports = {
    TimeoutHandler,
    timeoutHandler
};
