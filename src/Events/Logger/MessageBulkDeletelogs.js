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
const { Logger } = require("../../Structure/Functions/index.js");
const { Events } = require("discord.js");
const logger = new Logger();

class MessageBulkDelete extends Event {
    constructor(client) {
        super(client, {
            name: Events.MessageBulkDelete,
        });
    }

    async execute(messages) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;

        try {
            const firstMessage = messages.first();
            if (!firstMessage) return;
            
            // Skip if no guild (DMs, etc.)
            if (!firstMessage.guild) return;
            
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for bulk delete log');
                return;
            }
            
            // Check if content should be logged based on privacy settings
            const shouldLogContent = logManager.shouldLogContent(firstMessage.channel.id, firstMessage.channel.type);
            
            let attachment = null;
            let messageContents = '';

            // Only create attachment if content logging is enabled
            if (shouldLogContent) {
                // Prepare log file with privacy controls
                messageContents = messages.map(msg => {
                    const authorTag = msg.author
                        ? `${msg.author.tag} (${msg.author.id})`
                        : "Unknown Author";
                    const channelInfo = msg.channel
                        ? `#${msg.channel.name} (${msg.channel.id})`
                        : "Unknown Channel";
                    
                    // Process content with privacy controls
                    const processedContent = logManager.processMessageContent(msg.content, {
                        fullContentLogging: true
                    });
                    
                    return `[${new Date(msg.createdTimestamp).toLocaleString()}] ${authorTag} in ${channelInfo}: ${processedContent.content}`;
                }).join("\n");

                attachment = {
                    attachment: Buffer.from(messageContents, "utf-8"),
                    name: `bulk-deleted-messages-${Date.now()}.txt`
                };
            }

            // Create embed with privacy considerations
            let description = `>>> **Channel**: ${firstMessage.channel} (\`${firstMessage.channel.id}\`)\n` +
                `**Number of Messages**: \`${messages.size}\``;
            
            if (!shouldLogContent) {
                description += `\n\n**Content**: [CONTENT_NOT_LOGGED_FOR_PRIVACY]`;
            } else {
                description += `\n\n**Content**: [See attachment - Content processed for privacy]`;
            }

            const embed = logManager.createLogEmbed(
                "MESSAGE_BULK_DELETE",
                0xed4245,
                "**Multiple messages deleted**",
                description
            );

            // Bulk delete has no executor info → no audit log
            embed.setFooter({
                text: `Bulk Delete • ${new Date().toLocaleTimeString()}`
            });

            const options = shouldLogContent && attachment ? { files: [attachment] } : {};
            await logManager.sendPrivacyLog("messageLog", embed, options);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MessageBulkDelete;
