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

class ChannelDeleteLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.ChannelDelete,
        });
    }
    async execute(channel) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for channel delete log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!channel.guild) return;
            // Get who made the change from audit logs
            const auditEntry = await logManager.getAuditLogEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()  
                    });
                }
                return embed;
            };
            const embed = logManager.createLogEmbed(
                "CHANNEL_DELETE",
                0xED4245,
                "**Channel deleted**",
                `>>> **Channel**: ${channel.name} (\`${channel.id}\`)\n` +
                `**Type**: ${channel.type}\n` +
                `**Created At**: <t:${Math.floor(channel.createdTimestamp / 1000)}:R>`
            );
            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("serverLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = ChannelDeleteLogs;