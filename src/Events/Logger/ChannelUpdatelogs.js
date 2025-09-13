const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events, AuditLogEvent } = require("discord.js");
const logger = new Logger();

class ChannelLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.ChannelUpdate,
        });
    }

    async execute(oldChannel, newChannel) {
        const { client } = this;
        const logManager = client.logManager;

        if (client.config.logging !== true) return;

        try {
            // Get who made the change from audit logs
            const auditEntry = await logManager.getAuditLogEntry(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);

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
            if (oldChannel.name !== newChannel.name) {
                const embed = logManager.createLogEmbed(
                    "CHANNEL_UPDATE",
                    0x4287f5,
                    "**Text channel name updated**",
                    `>>> **Name**: ${newChannel.name} (<#${newChannel.id}>)\n` +
                    `**ID**: \`${newChannel.id}\`\n` +
                    `**Previous Name**: ${oldChannel.name}`
                );

                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- TOPIC CHANGE ----------------
            if (oldChannel.topic !== newChannel.topic) {
                const embed = logManager.createLogEmbed(
                    "CHANNEL_UPDATE",
                    0x4287f5,
                    "**Channel topic updated**",
                    `>>> **Channel**: ${newChannel} (\`${newChannel.id}\`)\n` +
                    `**Old Topic**: ${oldChannel.topic || "None"}\n` +
                    `**New Topic**: ${newChannel.topic || "None"}`
                );

                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- NSFW CHANGE ----------------
            if (oldChannel.nsfw !== newChannel.nsfw) {
                const embed = logManager.createLogEmbed(
                    "CHANNEL_UPDATE",
                    0x4287f5,
                    "**NSFW status updated**",
                    `>>> **Channel**: ${newChannel} (\`${newChannel.id}\`)\n` +
                    `**Old**: ${oldChannel.nsfw ? "NSFW ✔️" : "NSFW ❌"}\n` +
                    `**New**: ${newChannel.nsfw ? "NSFW ✔️" : "NSFW ❌"}`
                );

                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- SLOWMODE CHANGE ----------------
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                const embed = logManager.createLogEmbed(
                    "CHANNEL_UPDATE",
                    0x4287f5,
                    "**Slowmode updated**",
                    `>>> **Channel**: ${newChannel} (\`${newChannel.id}\`)\n` +
                    `**Old**: ${oldChannel.rateLimitPerUser || 0} seconds\n` +
                    `**New**: ${newChannel.rateLimitPerUser || 0} seconds`
                );

                setExecutorFooter(embed);
                await logManager.sendLog("serverLog", embed);
                return;
            }

            // ---------------- CATEGORY CHANGE ----------------
            if (oldChannel.parentId !== newChannel.parentId) {
                const embed = logManager.createLogEmbed(
                    "CHANNEL_UPDATE",
                    0x4287f5,
                    "**Channel category updated**",
                    `>>> **Channel**: ${newChannel} (\`${newChannel.id}\`)\n` +
                    `**Old Category**: ${oldChannel.parent ? oldChannel.parent.name : "None"}\n` +
                    `**New Category**: ${newChannel.parent ? newChannel.parent.name : "None"}`
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

module.exports = ChannelLogs;
