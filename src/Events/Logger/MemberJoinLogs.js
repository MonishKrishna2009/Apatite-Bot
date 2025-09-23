/*
 * Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.
 *
 * Copyright (C) 2025 Monish Krishna
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events } = require("discord.js");
const logger = new Logger();

class MemberJoinLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildMemberAdd,
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
            await logManager.sendLog("memberLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MemberJoinLogs;