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

class ThreadDeleteLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.ThreadDelete,
        });
    }

    async execute(thread) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for thread delete log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!thread.guild) return;

            // Get who deleted the thread from audit logs
            const auditEntry = await logManager.getAuditLogEntry(thread.guild, AuditLogEvent.ThreadDelete, thread.id);

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `Thread Deleted • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Create thread deletion log embed
            let description = `>>> **Thread**: ${thread.name} (\`${thread.id}\`)\n` +
                `**Type**: ${thread.type}\n`;

            if (thread.parent) {
                description += `**Parent Channel**: ${thread.parent.name} (\`${thread.parent.id}\`)\n`;
            }

            if (thread.ownerId) {
                const owner = thread.guild.members.cache.get(thread.ownerId);
                if (owner) {
                    description += `**Created By**: ${owner.user.tag} (\`${thread.ownerId}\`)\n`;
                } else {
                    description += `**Created By**: <@${thread.ownerId}>\n`;
                }
            }

            if (thread.messageCount) {
                description += `**Messages**: ${thread.messageCount}\n`;
            }

            if (thread.memberCount) {
                description += `**Members**: ${thread.memberCount}\n`;
            }

            if (thread.createdTimestamp) {
                description += `**Created**: <t:${Math.floor(thread.createdTimestamp / 1000)}:R>\n`;
            }

            description += `**Deleted**: <t:${Math.floor(Date.now() / 1000)}:R>`;

            const embed = logManager.createLogEmbed(
                "THREAD_DELETE",
                0xED4245,
                "**Thread deleted**",
                description
            );

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("serverLog", embed);
        } catch (error) {
            logger.error("Error in ThreadDeleteLogs:", error);
        }
    }
}

module.exports = ThreadDeleteLogs;
