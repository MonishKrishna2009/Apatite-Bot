const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events, AuditLogEvent } = require("discord.js");
const logger = new Logger();

class VoiceLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.VoiceStateUpdate,
        });
    }

    async execute(oldState, newState) {
        const { client } = this;
        const logManager = client.logManager;

        try {
            const member = newState.member || oldState.member;

            // Audit Log (for kicks/moves by mods, if available)
            const auditEntry = await logManager.getAuditLogEntry(newState.guild, AuditLogEvent.MemberUpdate);

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

            // ---------------- JOIN VOICE CHANNEL ----------------
            if (!oldState.channelId && newState.channelId) {
                const embed = logManager.createLogEmbed(
                    "VOICE_UPDATE",
                    0x2ECC71,
                    "**Member joined voice channel**",
                    `>>> **User**: ${member.user} (\`${member.id}\`)\n` +
                    `**Channel**: ${newState.channel.name} (<#${newState.channel.id}>)`
                );
                setExecutorFooter(embed);
                return await logManager.sendLog("voiceLog", embed);
            }

            // ---------------- LEAVE VOICE CHANNEL ----------------
            if (oldState.channelId && !newState.channelId) {
                const embed = logManager.createLogEmbed(
                    "VOICE_UPDATE",
                    0xE74C3C,
                    "**Member left voice channel**",
                    `>>> **User**: ${member.user} (\`${member.id}\`)\n` +
                    `**Channel**: ${oldState.channel.name} (<#${oldState.channel.id}>)`
                );
                setExecutorFooter(embed);
                return await logManager.sendLog("voiceLog", embed);
            }

            // ---------------- MOVED VOICE CHANNEL ----------------
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                const embed = logManager.createLogEmbed(
                    "VOICE_UPDATE",
                    0x3498DB,
                    "**Member switched voice channels**",
                    `>>> **User**: ${member.user} (\`${member.id}\`)\n` +
                    `**From**: ${oldState.channel.name} (<#${oldState.channel.id}>)\n` +
                    `**To**: ${newState.channel.name} (<#${newState.channel.id}>)`
                );
                setExecutorFooter(embed);
                return await logManager.sendLog("voiceLog", embed);
            }

        } catch (error) {
            logger.error("Error in VoiceLogs:", error);
        }
    }
}

module.exports = VoiceLogs;
