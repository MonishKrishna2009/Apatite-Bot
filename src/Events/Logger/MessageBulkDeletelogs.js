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

class MessageBulkDelete extends Event {
    constructor(client) {
        super(client, {
            name: Events.MessageBulkDelete,
        });
    }

    async execute(messages) {
        const { client } = this;
        const logManager = client.logManager;
        if (client.config.logging !== true) return;

        try {
            // Prepare log file
            const messageContents = messages.map(msg => {
                const authorTag = msg.author
                    ? `${msg.author.tag} (${msg.author.id})`
                    : "Unknown Author";
                const channelInfo = msg.channel
                    ? `#${msg.channel.name} (${msg.channel.id})`
                    : "Unknown Channel";
                const content = msg.content || "*No content*";
                return `[${new Date(msg.createdTimestamp).toLocaleString()}] ${authorTag} in ${channelInfo}: ${content}`;
            }).join("\n");

            const attachment = {
                attachment: Buffer.from(messageContents, "utf-8"),
                name: `bulk-deleted-messages-${Date.now()}.txt`
            };

            // Embed
            const embed = logManager.createLogEmbed(
                "MESSAGE_BULK_DELETE",
                0xed4245,
                "**Multiple messages deleted**",
                `>>> **Channel**: ${messages.first().channel} (\`${messages.first().channel.id}\`)\n` +
                `**Number of Messages**: \`${messages.size}\``
            );

            // Bulk delete has no executor info → no audit log
            embed.setFooter({
                text: `Bulk Delete • ${new Date().toLocaleTimeString()}`
            });

            await logManager.sendLog("messageLog", embed, { files: [attachment] });
        } catch (error) {
            logger.error(error);
        }
    }
}

module.exports = MessageBulkDelete;
