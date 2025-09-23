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

class RoleUpdateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildRoleUpdate,
        });
    }
    async execute(oldRole, newRole) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;

        try {
            // Get who made the change from audit logs
            const auditEntry = await logManager.getAuditLogEntry(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
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

            // ---------------- NAME CHANGE ----------------
            if (oldRole.name !== newRole.name) {
                const embed = logManager.createLogEmbed(
                    "ROLE_UPDATE",
                    0x4287f5,
                    "**Role name updated**",
                    `>>> **Role**: ${newRole} (\`${newRole.id}\`)\n` +
                    `**Old Name**: ${oldRole.name}\n` +
                    `**New Name**: ${newRole.name}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }
            // ---------------- COLOR CHANGE ----------------
            if (oldRole.color !== newRole.color) {
                const embed = logManager.createLogEmbed(
                    "ROLE_UPDATE",
                    0x4287f5,
                    "**Role color updated**",
                    `>>> **Role**: ${newRole} (\`${newRole.id}\`)\n` +
                    `**Old Color**: ${oldRole.hexColor}\n` +
                    `**New Color**: ${newRole.hexColor}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }
            // ---------------- PERMISSION CHANGE ----------------
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                const oldPerms = oldRole.permissions.toArray();
                const newPerms = newRole.permissions.toArray();
                const addedPerms = newPerms.filter(perm => !oldPerms.includes(perm));
                const removedPerms = oldPerms.filter(perm => !newPerms.includes(perm));
                let description = `>>> **Role**: ${newRole} (\`${newRole.id}\`)\n`;
                if (addedPerms.length > 0) {
                    description += `**Added Permissions**: ${addedPerms.map(perm => `\`${perm}\``).join(", ")}\n`;
                }
                if (removedPerms.length > 0) {
                    description += `**Removed Permissions**: ${removedPerms.map(perm => `\`${perm}\``).join(", ")}\n`;
                }
                const embed = logManager.createLogEmbed(
                    "ROLE_UPDATE",
                    0x4287f5,
                    "**Role permissions updated**",
                    description
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = RoleUpdateLogs;