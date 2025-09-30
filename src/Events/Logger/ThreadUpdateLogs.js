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

class ThreadUpdateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.ThreadUpdate,
        });
    }

    async execute(oldThread, newThread) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for thread update log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!newThread.guild) return;

            // Get who updated the thread from audit logs
            const auditEntry = await logManager.getAuditLogEntry(newThread.guild, AuditLogEvent.ThreadUpdate, newThread.id);

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry && auditEntry.executor) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `${auditEntry?.executor?.tag ?? 'Unknown'} • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Check for different types of updates and collect all changes
            const embedsToSend = [];

            if (oldThread.name !== newThread.name) {
                const embed = logManager.createLogEmbed(
                    "THREAD_UPDATE",
                    0x4287f5,
                    "**Thread name updated**",
                    `>>> **Thread**: ${newThread.name} (\`${newThread.id}\`)\n` +
                    `**Old Name**: ${oldThread.name}\n` +
                    `**New Name**: ${newThread.name}`
                );
                embedsToSend.push(embed);
            }

            if (oldThread.archived !== newThread.archived) {
                const embed = logManager.createLogEmbed(
                    "THREAD_UPDATE",
                    0x4287f5,
                    `**Thread ${newThread.archived ? 'archived' : 'unarchived'}**`,
                    `>>> **Thread**: ${newThread.name} (\`${newThread.id}\`)\n` +
                    `**Status**: ${newThread.archived ? 'Archived' : 'Unarchived'}\n` +
                    `**Auto Archive Duration**: ${newThread.autoArchiveDuration ? `${newThread.autoArchiveDuration} minutes` : 'None'}`
                );
                embedsToSend.push(embed);
            }

            if (oldThread.locked !== newThread.locked) {
                const embed = logManager.createLogEmbed(
                    "THREAD_UPDATE",
                    0x4287f5,
                    `**Thread ${newThread.locked ? 'locked' : 'unlocked'}**`,
                    `>>> **Thread**: ${newThread.name} (\`${newThread.id}\`)\n` +
                    `**Status**: ${newThread.locked ? 'Locked' : 'Unlocked'}`
                );
                embedsToSend.push(embed);
            }

            if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
                const embed = logManager.createLogEmbed(
                    "THREAD_UPDATE",
                    0x4287f5,
                    "**Thread slowmode updated**",
                    `>>> **Thread**: ${newThread.name} (\`${newThread.id}\`)\n` +
                    `**Old Slowmode**: ${oldThread.rateLimitPerUser || 0} seconds\n` +
                    `**New Slowmode**: ${newThread.rateLimitPerUser || 0} seconds`
                );
                embedsToSend.push(embed);
            }

            if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
                const embed = logManager.createLogEmbed(
                    "THREAD_UPDATE",
                    0x4287f5,
                    "**Thread auto-archive duration updated**",
                    `>>> **Thread**: ${newThread.name} (\`${newThread.id}\`)\n` +
                    `**Old Duration**: ${oldThread.autoArchiveDuration ? `${oldThread.autoArchiveDuration} minutes` : 'None'}\n` +
                    `**New Duration**: ${newThread.autoArchiveDuration ? `${newThread.autoArchiveDuration} minutes` : 'None'}`
                );
                embedsToSend.push(embed);
            }

            // Send all detected changes
            for (const embed of embedsToSend) {
                setExecutorFooter(embed);
                await logManager.sendPrivacyLog("serverLog", embed);
            }

        } catch (error) {
            logger.error("Error in ThreadUpdateLogs:", error);
        }
    }
}

module.exports = ThreadUpdateLogs;
