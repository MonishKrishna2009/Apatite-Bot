const LFRequest = require("../Schemas/LookingFor/lfplft");
const { Logger } = require("./Logger");
const logger = new Logger();
const { STATUS } = require("./lfHelpers");
const { getGameChannels } = require("./lfActionLogger");

/**
 * Cleans up expired and archived requests for a user/game type
 * @param {Object} guild - Discord guild object
 * @param {String} userId - User ID
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
        // Expire old pending requests
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - config.RequestExpiryDays);

        const expiredResult = await LFRequest.updateMany(
            {
                userId,
                guildId: guild.id,
                type,
                status: STATUS.PENDING,
                createdAt: { $lt: expiryDate }
            },
            { 
                $set: { 
                    status: STATUS.EXPIRED, 
                    expiresAt: new Date()
                } 
            }
        );
        results.expired = expiredResult.modifiedCount;

        // Archive old approved requests
        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - config.RequestArchiveDays);

        const oldApproved = await LFRequest.find({
            userId,
            guildId: guild.id,
            type,
            status: STATUS.APPROVED,
            createdAt: { $lt: archiveDate }
        });

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
    } catch (error) {
        logger.error(`Error during cleanup: ${error.message}`);
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

    try {
        // Get all guilds where the bot is present
        const guilds = client.guilds.cache.values();
        
        for (const guild of guilds) {
            try {
                // Cleanup LFP requests
                const lfpResults = await cleanupRequests(guild, null, "LFP", config.valolfpLftChannelId, config);
                results.totalExpired += lfpResults.expired;
                results.totalArchived += lfpResults.archived;
                results.errors.push(...lfpResults.errors);

                // Cleanup LFT requests
                const lftResults = await cleanupRequests(guild, null, "LFT", config.valolfpLftChannelId, config);
                results.totalExpired += lftResults.expired;
                results.totalArchived += lftResults.archived;
                results.errors.push(...lftResults.errors);
            } catch (error) {
                logger.error(`Error cleaning up guild ${guild.id}: ${error.message}`);
                results.errors.push(`Guild ${guild.id}: ${error.message}`);
            }
        }
    } catch (error) {
        logger.error(`Global cleanup failed: ${error.message}`);
        results.errors.push(`Global cleanup: ${error.message}`);
    }

    return results;
}

module.exports = { cleanupRequests, globalCleanup };