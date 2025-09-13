const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events } = require("discord.js");
const logger = new Logger();

class MemberJoinLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.MemberAdd,
        });
    }
    async execute(member) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;
        try {
            const embed = logManager.createLogEmbed(
                "MEMBER_JOIN",
                0x57F287,
                "**Member joined the server**",
                `>>> **Member**: ${member.user.tag} (\`${member.id}\`)\n` +
                `**Account Created**: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
            ).setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            await logManager.sendLog("serverLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MemberJoinLogs;