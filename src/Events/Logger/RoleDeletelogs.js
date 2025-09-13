const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events, AuditLogEvent } = require("discord.js");
const logger = new Logger();

class RoleDeletelogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildRoleDelete,
        });
    }
    async execute(oldRole, newRole) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;

        try {
            // Get who made the change from audit logs
            const auditEntry = await logManager.getAuditLogEntry(oldRole.guild, AuditLogEvent.RoleDelete, oldRole.id);
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
                `>>> **Role**: \`${oldRole.name}\` (\`${oldRole.id}\`)\n` +
                `**Color**: ${oldRole.hexColor}\n` +
                `**Permissions**: \`${oldRole.permissions.toArray().join(", ") || "None"}\``
            );
            setExecutorFooter(embed);
            await logManager.sendLog("serverLog", embed);
            return;
        } catch (error) {
            logger.error("RoleDeleteLogs Event Error:", error);
        }
    }
}