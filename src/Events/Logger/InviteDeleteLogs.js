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

class InviteDeleteLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.InviteDelete,
        });
    }

    async execute(invite) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for invite delete log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!invite.guild) return;

            // Get who deleted the invite from audit logs
            const auditEntry = await logManager.getAuditLogEntry(invite.guild, AuditLogEvent.InviteDelete, invite.code);

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `Invite Deleted • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Create invite deletion log embed
            let description = `>>> **Invite Code**: \`${invite.code}\`\n`;

            if (invite.channel) {
                description += `**Channel**: ${invite.channel.name} (\`${invite.channel.id}\`)\n`;
            }

            if (invite.inviter) {
                description += `**Created By**: ${invite.inviter.tag} (\`${invite.inviter.id}\`)\n`;
            }

            if (invite.uses !== undefined) {
                description += `**Uses**: ${invite.uses}`;
                if (invite.maxUses) {
                    description += `/${invite.maxUses}`;
                }
                description += `\n`;
            }

            if (invite.createdTimestamp) {
                description += `**Created**: <t:${Math.floor(invite.createdTimestamp / 1000)}:R>\n`;
            }

            const embed = logManager.createLogEmbed(
                "INVITE_DELETE",
                0xED4245,
                "**Invite link deleted**",
                description
            );

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("serverLog", embed);
        } catch (error) {
            logger.error("Error in InviteDeleteLogs:", error);
        }
    }
}

module.exports = InviteDeleteLogs;
