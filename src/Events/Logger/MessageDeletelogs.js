const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events, AuditLogEvent } = require("discord.js");
const logger = new Logger();

class MessageDelete extends Event {
    constructor(client) {
        super(client, {
            name: Events.MessageDelete,
        });
    }
    async execute(message) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;
        try {
            // Ignore bots
            if (message.author?.bot) return;
            const member = message.member;
            // Get who made the change from audit logs (if available)
            const auditEntry = await logManager.getAuditLogEntry(message.guild, AuditLogEvent.MessageDelete);
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
            // ---------------- MESSAGE DELETE ----------------
            const embed = logManager.createLogEmbed(
                "MESSAGE_DELETE",
                0xed4245,
                "**Message deleted**",
                `>>> **Author**: ${member} (\`${member.id}\`)\n` +
                `**Channel**: ${message.channel} (\`${message.channel.id}\`)\n` +
                `**Message ID**: \`${message.id}\`\n\n` +
                `**Content**:\n${message.content || "*No content*"}`
            );

            setExecutorFooter(embed);
            await logManager.sendLog("messageLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MessageDelete;