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

class VoiceLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.VoiceStateUpdate,
        });
    }

    async execute(oldState, newState) {
        const { client } = this;
        const logManager = client.logManager;

        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;

        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for voice log');
                return;
            }
            const member = newState.member || oldState.member;

            // Audit Log (for kicks/moves by mods, if available)
            const auditEntry = await logManager.getAuditLogEntry(newState.guild, AuditLogEvent.MemberUpdate);

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

            // ---------------- JOIN VOICE CHANNEL ----------------
            if (!oldState.channelId && newState.channelId) {
                const embed = logManager.createLogEmbed(
                    "VOICE_UPDATE",
                    0x2ECC71,
                    "**Member joined voice channel**",
                    `>>> **User**: ${member.user} (\`${member.id}\`)\n` +
                    `**Channel**: ${newState.channel.name} (<#${newState.channel.id}>)`
                );
                setExecutorFooter(embed);
                return await logManager.sendPrivacyLog("voiceLog", embed);
            }

            // ---------------- LEAVE VOICE CHANNEL ----------------
            if (oldState.channelId && !newState.channelId) {
                const embed = logManager.createLogEmbed(
                    "VOICE_UPDATE",
                    0xE74C3C,
                    "**Member left voice channel**",
                    `>>> **User**: ${member.user} (\`${member.id}\`)\n` +
                    `**Channel**: ${oldState.channel.name} (<#${oldState.channel.id}>)`
                );
                setExecutorFooter(embed);
                return await logManager.sendPrivacyLog("voiceLog", embed);
            }

            // ---------------- MOVED VOICE CHANNEL ----------------
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                const embed = logManager.createLogEmbed(
                    "VOICE_UPDATE",
                    0x3498DB,
                    "**Member switched voice channels**",
                    `>>> **User**: ${member.user} (\`${member.id}\`)\n` +
                    `**From**: ${oldState.channel.name} (<#${oldState.channel.id}>)\n` +
                    `**To**: ${newState.channel.name} (<#${newState.channel.id}>)`
                );
                setExecutorFooter(embed);
                return await logManager.sendPrivacyLog("voiceLog", embed);
            }

        } catch (error) {
            logger.error("Error in VoiceLogs:", error);
        }
    }
}

module.exports = VoiceLogs;
