const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events } = require("discord.js");
const logger = new Logger();

class MemberRoleLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildMemberUpdate,
        });
    }

    async execute(oldMember, newMember) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;
        try {
            // ---------------- ROLE CHANGE ----------------
            const oldRoles = oldMember.roles.cache;
            const newRoles = newMember.roles.cache;
            const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
            const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
            if (addedRoles.size > 0) {
                const embed = logManager.createLogEmbed(
                    "MEMBER_ROLE_UPDATE",
                    0x43B581,
                    "**Member role(s) added**",
                    `>>> **Member**: ${newMember.user.tag} (\`${newMember.id}\`)\n` +
                    `**Added Role(s)**: ${addedRoles.map(role => role.name).join(", ")}`
                );
                await logManager.sendLog("serverLog", embed);
            }
            if (removedRoles.size > 0) {
                const embed = logManager.createLogEmbed(
                    "MEMBER_ROLE_UPDATE",
                    0xF04747,
                    "**Member role(s) removed**",
                    `>>> **Member**: ${newMember.user.tag} (\`${newMember.id}\`)\n` +
                    `**Removed Role(s)**: ${removedRoles.map(role => role.name).join(", ")}`
                );
                await logManager.sendLog("serverLog", embed);
            }
        } catch (error) {
            logger.error(error);
        }
    }

}

module.exports = MemberRoleLogs;