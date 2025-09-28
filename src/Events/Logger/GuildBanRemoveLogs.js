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

class GuildBanRemoveLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildBanRemove,
        });
    }

    async execute(ban) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for guild ban remove log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!ban.guild) return;

            // Get who made the unban from audit logs
            const auditEntry = await logManager.getAuditLogEntry(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry && auditEntry.executor) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `Unban • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Create unban log embed
            let description = `>>> **User**: ${ban.user.tag} (\`${ban.user.id}\`)\n` +
                `**User ID**: \`${ban.user.id}\`\n` +
                `**Account Created**: <t:${Math.floor(ban.user.createdTimestamp / 1000)}:R>`;

            // Add audit log reason if available
            if (auditEntry?.reason) {
                description += `\n**Reason**: ${auditEntry.reason}`;
            }

            const embed = logManager.createLogEmbed(
                "GUILD_BAN_REMOVE",
                0x57F287,
                "**Member unbanned**",
                description
            ).setThumbnail(ban.user.displayAvatarURL({ dynamic: true }));

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("serverLog", embed);
        } catch (error) {
            logger.error("Error in GuildBanRemoveLogs:", error);
        }
    }
}

module.exports = GuildBanRemoveLogs;
