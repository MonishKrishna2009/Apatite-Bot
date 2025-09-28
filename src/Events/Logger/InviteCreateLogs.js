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

class InviteCreateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.InviteCreate,
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
                logger.warn('LogManager not available for invite create log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!invite.guild) return;

            // Get who created the invite from audit logs
            const auditEntry = await logManager.getAuditLogEntry(invite.guild, AuditLogEvent.InviteCreate, invite.code);

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else if (invite.inviter) {
                    embed.setFooter({
                        text: `${invite.inviter.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: invite.inviter.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `Invite Created • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Create invite creation log embed
            let description = `>>> **Invite Code**: \`${invite.code}\`\n` +
                `**Channel**: ${invite.channel} (\`${invite.channel.id}\`)\n`;

            if (invite.inviter) {
                description += `**Created By**: ${invite.inviter.tag} (\`${invite.inviter.id}\`)\n`;
            }

            if (invite.maxAge) {
                const maxAgeHours = Math.floor(invite.maxAge / 3600);
                const maxAgeDays = Math.floor(maxAgeHours / 24);
                
                if (maxAgeDays > 0) {
                    description += `**Expires**: ${maxAgeDays} days\n`;
                } else if (maxAgeHours > 0) {
                    description += `**Expires**: ${maxAgeHours} hours\n`;
                } else {
                    description += `**Expires**: ${invite.maxAge} seconds\n`;
                }
            } else {
                description += `**Expires**: Never\n`;
            }

            if (invite.maxUses) {
                description += `**Max Uses**: ${invite.maxUses}\n`;
            } else {
                description += `**Max Uses**: Unlimited\n`;
            }

            if (invite.temporary) {
                description += `**Temporary**: Yes (7-day membership)\n`;
            }

            const embed = logManager.createLogEmbed(
                "INVITE_CREATE",
                0x57F287,
                "**Invite link created**",
                description
            );

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("serverLog", embed);
        } catch (error) {
            logger.error("Error in InviteCreateLogs:", error);
        }
    }
}

module.exports = InviteCreateLogs;
