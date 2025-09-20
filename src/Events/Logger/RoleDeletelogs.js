const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events, AuditLogEvent } = require("discord.js");
const logger = new Logger();

class RoleDeleteLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildRoleDelete,
        });
    }

    async execute(role) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;

        try {
            // Get who deleted the role from audit logs
            const auditEntry = await logManager.getAuditLogEntry(role.guild, AuditLogEvent.RoleDelete, role.id);

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

            // ---------------- ROLE DELETE ----------------
            const embed = logManager.createLogEmbed(
                "ROLE_DELETE",
                0xed4245,
                "**Role deleted**",
                `>>> **Name**: \`${role.name}\`\n` +
                `**ID**: \`${role.id}\`\n` +
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

module.exports = RoleDeleteLogs;
