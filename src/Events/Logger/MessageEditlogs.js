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

class MessageEdit extends Event {
    constructor(client) {
        super(client, {
            name: Events.MessageUpdate,
        });
    }
    async execute(oldMessage, newMessage) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;
        try {
            // Ignore if content didn't change (e.g., embed update)
            if (oldMessage.content === newMessage.content) return;
            // Ignore bots
            if (newMessage.author?.bot) return;
            const member = newMessage.member || oldMessage.member;
            // Get who made the change from audit logs (if available)
            const auditEntry = await logManager.getAuditLogEntry(newMessage.guild, AuditLogEvent.MessageUpdate);
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

            // ---------------- MESSAGE EDIT ----------------
            const embed = logManager.createLogEmbed(
                "MESSAGE_UPDATE",
                0xfaa61a,
                "**Message edited**",
                `>>> **Author**: ${member} (\`${member.id}\`)\n` +
                `**Channel**: ${newMessage.channel} (\`${newMessage.channel.id}\`)\n` +
                `**Message ID**: \`${newMessage.id}\`\n\n` +
                `**Old Message**:\n${oldMessage.content || "*No content*"}\n\n` +
                `**New Message**:\n${newMessage.content || "*No content*"}`
            );

            setExecutorFooter(embed);
            await logManager.sendLog("messageLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MessageEdit;