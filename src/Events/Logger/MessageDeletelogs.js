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

class MessageDelete extends Event {
    constructor(client) {
        super(client, {
            name: Events.MessageDelete,
        });
    }
    async execute(message) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Ignore bots
            if (message.author?.bot) return;
            
            // Skip if no guild (DMs, etc.)
            if (!message.guild) return;
            
            const member = message.member;
            if (!member) return; // Skip if member not available
            
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for message delete log');
                return;
            }
            
            // Check if content should be logged based on privacy settings
            const shouldLogContent = logManager.shouldLogContent(message.channel.id, message.channel.type);
            
            // Get who made the change from audit logs (if available)
            const auditEntry = await logManager.getAuditLogEntry(message.guild, AuditLogEvent.MessageDelete);
            
            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `${member.user.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: member.user.displayAvatarURL()
                    });
                }
                return embed;
            };

            // Create privacy-aware embed
            const embed = logManager.createMessageLogEmbed(
                "MESSAGE_DELETE",
                0xed4245,
                "**Message deleted**",
                { content: message.content },
                {
                    includeContent: shouldLogContent,
                    channel: message.channel,
                    author: member.user,
                    messageId: message.id
                }
            );

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("messageLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MessageDelete;