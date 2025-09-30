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

class ThreadCreateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.ThreadCreate,
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
                logger.warn('LogManager not available for thread create log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!thread.guild) return;

            // Get who created the thread from audit logs
            const auditEntry = await logManager.getAuditLogEntry(thread.guild, AuditLogEvent.ThreadCreate, thread.id);

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry?.executor) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else if (thread.ownerId) {
                    const owner = thread.guild.members.cache.get(thread.ownerId);
                    if (owner) {
                        embed.setFooter({
                            text: `${owner.user.tag} • ${new Date().toLocaleTimeString()}`,
                            iconURL: owner.user.displayAvatarURL()
                        });
                    } else {
                        embed.setFooter({
                            text: `Thread Created • ${new Date().toLocaleTimeString()}`
                        });
                    }
                } else {
                    embed.setFooter({
                        text: `Thread Created • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Create thread creation log embed
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

            if (thread.autoArchiveDuration) {
                const archiveMinutes = thread.autoArchiveDuration;
                const archiveHours = Math.floor(archiveMinutes / 60);
                description += `**Auto Archive**: ${archiveHours} hours\n`;
            }

            if (thread.rateLimitPerUser) {
                description += `**Slowmode**: ${thread.rateLimitPerUser} seconds\n`;
            }

            description += `**Created**: <t:${Math.floor(thread.createdTimestamp / 1000)}:R>`;

            const embed = logManager.createLogEmbed(
                "THREAD_CREATE",
                0x57F287,
                "**Thread created**",
                description
            );

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("serverLog", embed);
        } catch (error) {
            logger.error("Error in ThreadCreateLogs:", error);
        }
    }
}

module.exports = ThreadCreateLogs;
