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

class RoleCreateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildRoleCreate,
        });
    }
    async execute(role) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;

        try {
            // Get who made the change from audit logs
            const auditEntry = await logManager.getAuditLogEntry(role.guild, AuditLogEvent.RoleCreate, role.id);

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

            // ---------------- ROLE CREATE ----------------
            const embed = logManager.createLogEmbed(
                "ROLE_CREATE",
                0x57f287,
                "**New role created**",
                `>>> **Role**: ${role} (\`${role.id}\`)\n` +
                `**Name**: ${role.name}\n` +
                `**Color**: ${role.hexColor}\n` +
                `**Permissions**: \`${role.permissions.toArray().join(", ") || "None"}\``
            );
            setExecutorFooter(embed);
            await logManager.sendLog("serverLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }

}

module.exports = RoleCreateLogs;