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

class MemberLeaveLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildMemberRemove,
        });
    }

    async execute(member) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for member leave log');
                return;
            }
            
            const embed = logManager.createLogEmbed(
                "MEMBER_LEAVE",
                0xED4245,
                "**Member left the server**",
                `>>> **Member**: ${member.user.tag} (\`${member.id}\`)\n` +
                `**Account Created**: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
            ).setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
            
            await logManager.sendPrivacyLog("memberLog", embed);
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MemberLeaveLogs;