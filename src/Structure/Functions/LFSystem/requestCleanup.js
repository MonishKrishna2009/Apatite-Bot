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

const LFRequest = require("../../Schemas/LookingFor/lfplft");
const { Logger } = require("../Logger");
const logger = new Logger();
const { STATUS } = require("./lfHelpers");
const { getGameChannels } = require("./lfActionLogger");

/**
 * Cleans up expired and archived requests for a user/game type
 * @param {Object} guild - Discord guild object
 * @param {String|null} userId - User ID (null for global cleanup)
 * @param {String} type - Request type (e.g., "LFP" or "LFT")
 * @param {String} publicChannelId - Channel ID where public embeds are posted
 * @param {Object} config - Config object with RequestExpiryDays & RequestArchiveDays
 * @returns {Object} - Cleanup results
 */
async function cleanupRequests(guild, userId, type, publicChannelId, config) {
    const results = {
        expired: 0,
        archived: 0,
        errors: []
    };

    try {
        // Log cleanup start
        const scope = userId ? `user ${userId}` : 'all users';
        logger.info(`Starting cleanup for ${scope} in guild ${guild.id} (${type})`);

        // Expire old pending requests (using expiresAt field)
        const now = new Date();

        // Build query conditionally based on userId
        const expireQuery = {
            guildId: guild.id,
            type,
            status: STATUS.PENDING,
            expiresAt: { $lt: now }
        };
        
        // Only add userId filter if userId is provided (not null)
        if (userId !== null) {
            expireQuery.userId = userId;
        }

        const expiredResult = await LFRequest.updateMany(
            expireQuery,
            { 
                $set: { 
                    status: STATUS.EXPIRED
                } 
            }
        );
        results.expired = expiredResult.modifiedCount;
        
        // Log expiry results
        if (results.expired > 0) {
            logger.info(`Expired ${results.expired} pending requests for ${scope} in guild ${guild.id} (${type})`);
        }

        // Archive old approved requests
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - config.RequestArchiveDays);

        // Build query conditionally based on userId
        const archiveQuery = {
            guildId: guild.id,
            type,
            status: STATUS.APPROVED,
            createdAt: { $lt: archiveDate }
        };
        
        // Only add userId filter if userId is provided (not null)
        if (userId !== null) {
            archiveQuery.userId = userId;
        }

        const oldApproved = await LFRequest.find(archiveQuery);

        for (const req of oldApproved) {
            try {
                // Delete public message if it exists
                if (req.publicMessageId) {
                    const channels = getGameChannels(config, req.game);
                    const publicChannel = guild.channels.cache.get(channels.publicChannelId);
                    if (publicChannel) {
                        const msg = await publicChannel.messages.fetch(req.publicMessageId).catch(() => null);
                        if (msg) await msg.delete();
                    }
                }

                // Update request status
                req.status = STATUS.ARCHIVED;
                req.archivedAt = new Date();
                req.publicMessageId = null;
                await req.save();
                results.archived++;
            } catch (error) {
                logger.warn(`Failed to archive request ${req._id}: ${error.message}`);
                results.errors.push(`Failed to archive request ${req._id}: ${error.message}`);
            }
        }
        
        // Log archive results
        if (results.archived > 0) {
            logger.info(`Archived ${results.archived} approved requests for ${scope} in guild ${guild.id} (${type})`);
        }
        
        // Log completion
        logger.info(`Cleanup completed for ${scope} in guild ${guild.id} (${type}): ${results.expired} expired, ${results.archived} archived`);
        
    } catch (error) {
        logger.error(`Error during cleanup for ${scope} in guild ${guild.id} (${type}): ${error.message}`);
        results.errors.push(`Cleanup failed: ${error.message}`);
    }

    return results;
}

/**
 * Global cleanup function that can be run on interval
 * @param {Object} client - Discord client
 * @param {Object} config - Configuration object
 */
async function globalCleanup(client, config) {
    const results = {
        totalExpired: 0,
        totalArchived: 0,
        errors: []
    };

    logger.info('Starting global cleanup across all guilds');

    try {
        // Get all guilds where the bot is present
        const guilds = client.guilds.cache.values();
        let guildCount = 0;
        
        for (const guild of guilds) {
            guildCount++;
            try {
                logger.info(`Processing guild ${guild.id} (${guild.name}) - ${guildCount}/${client.guilds.cache.size}`);
                
                // Cleanup requests for each game type
                const gameTypes = ['LFP', 'LFT'];
                
                for (const type of gameTypes) {
                    // Get all unique games for this guild and type
                    const games = await LFRequest.distinct('game', {
                        guildId: guild.id,
                        type: type
                    });
                    
                    if (games.length === 0) {
                        logger.debug(`No ${type} requests found for guild ${guild.id}`);
                        continue;
                    }
                    
                    logger.debug(`Found ${games.length} games for ${type} in guild ${guild.id}: ${games.join(', ')}`);
                    
                    for (const game of games) {
                        try {
                            const channels = getGameChannels(config, game);
                            const gameResults = await cleanupRequests(guild, null, type, channels.publicChannelId, config);
                            results.totalExpired += gameResults.expired;
                            results.totalArchived += gameResults.archived;
                            results.errors.push(...gameResults.errors);
                        } catch (error) {
                            logger.error(`Error cleaning up ${type} requests for game ${game} in guild ${guild.id}: ${error.message}`);
                            results.errors.push(`Guild ${guild.id} (${game} ${type}): ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                logger.error(`Error cleaning up guild ${guild.id}: ${error.message}`);
                results.errors.push(`Guild ${guild.id}: ${error.message}`);
            }
        }
    } catch (error) {
        logger.error(`Global cleanup failed: ${error.message}`);
        results.errors.push(`Global cleanup: ${error.message}`);
    }

    // Log final results
    logger.info(`Global cleanup completed: ${results.totalExpired} expired, ${results.totalArchived} archived across ${guildCount} guilds`);
    if (results.errors.length > 0) {
        logger.warn(`Global cleanup had ${results.errors.length} errors: ${results.errors.join('; ')}`);
    }

    return results;
}

module.exports = { cleanupRequests, globalCleanup };