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
const { Events, AuditLogEvent } = require("discord.js");
const logger = new Logger();

class MessageEdit extends Event {
    constructor(client) {
        super(client, {
            name: Events.MessageUpdate,
        });
    }
    async execute(oldMessage, newMessage) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Ignore if content didn't change (e.g., embed update)
            if (oldMessage.content === newMessage.content) return;
            
            // Ignore bots
            if (newMessage.author?.bot) return;
            
            // Skip if no guild (DMs, etc.)
            if (!newMessage.guild) return;
            
            const member = newMessage.member || oldMessage.member;
            if (!member) return; // Skip if member not available
            
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for message edit log');
                return;
            }
            
            // Check if content should be logged based on privacy settings
            const shouldLogContent = logManager.shouldLogContent(newMessage.channel.id, newMessage.channel.type);
            
            // Helper: build footer with message author
            const setExecutorFooter = (embed) => {
                embed.setFooter({
                    text: `${member.user.tag} • ${new Date().toLocaleTimeString()}`,
                    iconURL: member.user.displayAvatarURL()
                });
                return embed;
            };

            // Create privacy-aware embed for message edit
            let description = `>>> **Author**: ${member} (\`${member.id}\`)\n` +
                `**Channel**: ${newMessage.channel} (\`${newMessage.channel.id}\`)\n` +
                `**Message ID**: \`${newMessage.id}\`\n\n`;

            if (shouldLogContent) {
                // Process old and new content with privacy controls
                const oldProcessed = logManager.processMessageContent(oldMessage.content, {
                    fullContentLogging: true
                });
                const newProcessed = logManager.processMessageContent(newMessage.content, {
                    fullContentLogging: true
                });
                
                description += `**Old Message**:\n${oldProcessed.content}\n\n` +
                    `**New Message**:\n${newProcessed.content}`;
                
                // Add privacy notice if content was processed
                if (oldProcessed.redacted || oldProcessed.sanitized || newProcessed.redacted || newProcessed.sanitized) {
                    description += `\n\n> *Privacy Notice: Content processed for privacy protection*`;
                }
            } else {
                description += `**Old Message**: [CONTENT_NOT_LOGGED_FOR_PRIVACY]\n\n` +
                    `**New Message**: [CONTENT_NOT_LOGGED_FOR_PRIVACY]`;
            }

            const embed = logManager.createLogEmbed(
                "MESSAGE_UPDATE",
                0xfaa61a,
                "**Message edited**",
                description
            );

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("messageLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MessageEdit;