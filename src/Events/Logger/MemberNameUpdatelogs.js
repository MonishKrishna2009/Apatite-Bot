const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events } = require("discord.js");
const logger = new Logger();

class MemberNameUpdateLogs extends Event {
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
            // ---------------- NICKNAME CHANGE ----------------
            if (oldMember.nickname !== newMember.nickname) {
                const embed = logManager.createLogEmbed(
                    "MEMBER_UPDATE",
                    0x4287f5,
                    "**Member nickname updated**",
                    `>>> **Member**: ${newMember.user.tag} (\`${newMember.id}\`)\n` +
                    `**Old Nickname**: ${oldMember.nickname || "None"}\n` +
                    `**New Nickname**: ${newMember.nickname || "None"}`
                );
                await logManager.sendLog("serverLog", embed);
                return;
            }
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MemberNameUpdateLogs;