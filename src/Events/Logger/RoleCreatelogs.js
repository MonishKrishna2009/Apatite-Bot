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
    async execute(oldRole, newRole) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;

        try {
            // Get who made the change from audit logs
            const auditEntry = await logManager.getAuditLogEntry(newRole.guild, AuditLogEvent.RoleCreate, newRole.id);
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
                `>>> **Role**: ${newRole} (\`${newRole.id}\`)\n` +
                `**Name**: ${newRole.name}\n` +
                `**Color**: ${newRole.hexColor}\n` +
                `**Permissions**: \`${newRole.permissions.toArray().join(", ") || "None"}\``
            );
            setExecutorFooter(embed);
            await logManager.sendLog("serverLog", embed);
            return;
        } catch (error) {
            logger.error("RoleCreateLogs Event Error:", error);
        }

    }
}

module.exports = RoleCreateLogs;