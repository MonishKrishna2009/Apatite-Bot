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

const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft.js");
const config = require("../../Structure/Configs/config.js");
const { getGameChannels } = require("../../Structure/Functions/LFSystem/lfActionLogger");

class LFUpdate extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildMemberRemove,
        });
    }
    async execute(member) {
        try {
            const userId = member.id;
            const guildId = member.guild.id;

            // Fetch all requests by this user
            const requests = await LFRequest.find({ userId, guildId });

            if (!requests.length) return;

            for (const req of requests) {
                try {
                    // Get game-specific channels
                    const channels = getGameChannels(config, req.game);
                    
                    // Delete review message if exists
                    if (req.messageId && channels.reviewChannelId) {
                        const reviewCh = member.guild.channels.cache.get(channels.reviewChannelId);
                        if (reviewCh) {
                            const msg = await reviewCh.messages.fetch(req.messageId).catch(() => null);
                            if (msg) await msg.delete();
                        }
                    }

                    // Delete public message if exists
                    if (req.publicMessageId && channels.publicChannelId) {
                        const publicCh = member.guild.channels.cache.get(channels.publicChannelId);
                        if (publicCh) {
                            const msg = await publicCh.messages.fetch(req.publicMessageId).catch(() => null);
                            if (msg) await msg.delete();
                        }
                    }

                    // Soft delete DB entry instead of hard delete
                    req.status = 'deleted';
                    req.deletedAt = new Date();
                    req.messageId = null;
                    req.publicMessageId = null;
                    await req.save();
                } catch (err) {
                    logger.error(`Cleanup failed for request ${req._id} of user ${userId}: ${err.message}`);
                }
            }

            logger.info(`Cleaned up ${requests.length} LFP/LFT requests for user ${userId} after leaving.`);
        } catch (err) {
            logger.error(`Failed to cleanup requests on user leave: ${err.message}`);
        }
    }
}

module.exports = LFUpdate