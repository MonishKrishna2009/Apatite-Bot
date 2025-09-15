const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events } = require("discord.js");
const logger = new Logger();

class MemberLeaveLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildMemberRemove,
        });
    }

    async execute(member) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;
        try {
            const embed = logManager.createLogEmbed(
                "MEMBER_LEAVE",
                0xED4245,
                "**Member left the server**",
                `>>> **Member**: ${member.user.tag} (\`${member.id}\`)\n` +
                `**Account Created**: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
            ).setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            await logManager.sendLog("memberLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MemberLeaveLogs;