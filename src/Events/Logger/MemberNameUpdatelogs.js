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
                await logManager.sendLog("memberLog", embed);
                return;
            }
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MemberNameUpdateLogs;