const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events } = require("discord.js");
const logger = new Logger();

const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft.js");
const config = require("../../Structure/Configs/config.js")

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
                    // Delete review message if exists
                    if (req.messageId) {
                        const reviewCh = member.guild.channels.cache.get(config.valoReviewChannelId);
                        if (reviewCh) {
                            const msg = await reviewCh.messages.fetch(req.messageId).catch(() => null);
                            if (msg) await msg.delete();
                        }
                    }

                    // Delete public message if exists
                    if (req.publicMessageId) {
                        const publicCh = member.guild.channels.cache.get(config.valolfpLftChannelId);
                        if (publicCh) {
                            const msg = await publicCh.messages.fetch(req.publicMessageId).catch(() => null);
                            if (msg) await msg.delete();
                        }
                    }

                    // Delete DB entry
                    await LFRequest.findByIdAndDelete(req._id);
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