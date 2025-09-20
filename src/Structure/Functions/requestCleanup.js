const LFRequest = require("../Schemas/LookingFor/lfplft");
const { Logger } = require("./Logger");
const logger = new Logger();

/**
 * Cleans up expired and archived requests for a user/game type
 * @param {Object} guild - Discord guild object
 * @param {String} userId - User ID
 * @param {String} type - Request type (e.g., "LFP" or "LFT")
 * @param {String} publicChannelId - Channel ID where public embeds are posted
 * @param {Object} config - Config object with RequestExpiryDays & RequestArchiveDays
 */
async function cleanupRequests(guild, userId, type, publicChannelId, config) {
    // Expiry check
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - config.RequestExpiryDays);

    await LFRequest.updateMany(
        {
            userId,
            guildId: guild.id,
            type,
            status: "pending",
            createdAt: { $lt: expiryDate }
        },
        { $set: { status: "expired" } }
    );

    // Archive check
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - config.RequestArchiveDays);

    const oldApproved = await LFRequest.find({
        userId,
        guildId: guild.id,
        type,
        status: "approved",
        createdAt: { $lt: archiveDate }
    });

    for (const req of oldApproved) {
        if (req.publicMessageId) {
            try {
                const publicChannel = guild.channels.cache.get(publicChannelId);
                if (publicChannel) {
                    const msg = await publicChannel.messages.fetch(req.publicMessageId).catch(() => null);
                    if (msg) await msg.delete();
                }
            } catch (err) {
                logger.warn(`Failed to delete archived public message for request ${req._id}: ${err.message}`);
            }
        }

        req.status = "archived";
        req.publicMessageId = null;
        await req.save();
    }
}

module.exports = { cleanupRequests };