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

class ServerLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildUpdate,
        });
    }

    async execute(oldGuild, newGuild) {
        const { client } = this;
        const logManager = client.logManager;

        if (client.config.logging !== true) return;

        try {
            // Get who made the change from audit logs
            const auditEntry = await logManager.getAuditLogEntry(newGuild, AuditLogEvent.GuildUpdate);

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

            // ---------------- SERVER NAME CHANGE ----------------
            if (oldGuild.name !== newGuild.name) {
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**Server name updated**",
                    `>>> **New Name**: ${newGuild.name}\n` +
                    `**Old Name**: ${oldGuild.name}\n` +
                    `**ID**: ${newGuild.id}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- SERVER ICON CHANGE ----------------
            if (oldGuild.iconURL() !== newGuild.iconURL()) {
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**Server icon updated**",
                    `>>> **Server**: ${newGuild.name} (\`${newGuild.id}\`)\n` +
                    `${newGuild.iconURL() ? "A new server icon was set." : "The server icon was removed."}`
                );

                if (newGuild.iconURL()) {
                    embed.setThumbnail(newGuild.iconURL());
                }

                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- VERIFICATION LEVEL CHANGE ----------------
            if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
                const levels = ["None", "Low", "Medium", "High", "Very High"];
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**Verification level updated**",
                    `>>> **Server**: ${newGuild.name} (\`${newGuild.id}\`)\n` +
                    `**Old Level**: ${levels[oldGuild.verificationLevel]}\n` +
                    `**New Level**: ${levels[newGuild.verificationLevel]}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- AFK CHANNEL CHANGE ----------------
            if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**AFK channel updated**",
                    `>>> **Old AFK Channel**: ${oldGuild.afkChannel ? oldGuild.afkChannel.name : "None"}\n` +
                    `**New AFK Channel**: ${newGuild.afkChannel ? newGuild.afkChannel.name : "None"}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- AFK TIMEOUT CHANGE ----------------
            if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**AFK timeout updated**",
                    `>>> **Old Timeout**: ${oldGuild.afkTimeout / 60} minutes\n` +
                    `**New Timeout**: ${newGuild.afkTimeout / 60} minutes`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- SYSTEM CHANNEL CHANGE ----------------
            if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**System channel updated**",
                    `>>> **Old System Channel**: ${oldGuild.systemChannel ? oldGuild.systemChannel.name : "None"}\n` +
                    `**New System Channel**: ${newGuild.systemChannel ? newGuild.systemChannel.name : "None"}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- DEFAULT NOTIFICATIONS CHANGE ----------------
            if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
                const notifLevels = ["All Messages", "Only @mentions"];
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**Default notifications updated**",
                    `>>> **Old Setting**: ${notifLevels[oldGuild.defaultMessageNotifications]}\n` +
                    `**New Setting**: ${notifLevels[newGuild.defaultMessageNotifications]}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- EXPLICIT CONTENT FILTER CHANGE ----------------
            if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                const filterLevels = [
                    "Disabled",
                    "Members without roles",
                    "All members"
                ];
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**Explicit content filter updated**",
                    `>>> **Old Setting**: ${filterLevels[oldGuild.explicitContentFilter]}\n` +
                    `**New Setting**: ${filterLevels[newGuild.explicitContentFilter]}`
                );
                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- SERVER BANNER CHANGE ----------------
            if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**Server banner updated**",
                    `>>> **Server**: ${newGuild.name} (\`${newGuild.id}\`)\n` +
                    `${newGuild.bannerURL() ? "A new banner was set." : "The banner was removed."}`
                );

                if (newGuild.bannerURL()) {
                    embed.setImage(newGuild.bannerURL());
                }

                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- SERVER SPLASH IMAGE CHANGE ----------------
            if (oldGuild.splashURL() !== newGuild.splashURL()) {
                const embed = logManager.createLogEmbed(
                    "SERVER_UPDATE",
                    0xFFA500,
                    "**Server splash updated**",
                    `>>> **Server**: ${newGuild.name} (\`${newGuild.id}\`)\n` +
                    `${newGuild.splashURL() ? "A new splash screen was set." : "The splash screen was removed."}`
                );

                if (newGuild.splashURL()) {
                    embed.setImage(newGuild.splashURL());
                }

                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

        } catch (error) {
            logger.error("Error in ServerLog GuildUpdate:", error);
        }
    }
}

module.exports = ServerLogs;
