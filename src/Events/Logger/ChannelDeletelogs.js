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
        if (client.config.logging !== true) return;
        try {
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
            await logManager.sendLog("serverLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = ChannelDeleteLogs;