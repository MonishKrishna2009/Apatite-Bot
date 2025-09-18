const { EmbedBuilder, Colors, MessageFlags } = require("discord.js");
const LFRequest = require("../Schemas/LookingFor/lfplft");

/**
 * Checks if a user has exceeded the max active requests.
 * @param {Object} interaction - Discord interaction
 * @param {String} type - Request type ("LFP" or "LFT")
 * @param {Object} config - Config with MaxActiveRequest
 * @returns {Boolean} true if limit reached, false otherwise
 */

async function checkActiveRequests(interaction, type, config) {
    const { user, guild } = interaction;

    const activeRequest = await LFRequest.countDocuments({
        userId: user.id,
        guildId: guild.id,
        type,
        status: { $in: ["pending", "approved"] }
    });

    if (activeRequest >= config.MaxActiveRequest) {
        const limitEmbed = new EmbedBuilder()
            .setTitle("⚠️ Request Limit Reached")
            .setColor(Colors.Red)
            .setDescription(
                `You already have **${activeRequest} active ${type} requests**. ` +
                `The maximum allowed is **${config.MaxActiveRequest}**.\n\n` +
                `Please cancel or wait for existing requests to expire before creating new ones.`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [limitEmbed], flags: MessageFlags.Ephemeral });
        return true; // limit reached
    }

    return false; // safe to proceed
}

module.exports = { checkActiveRequests };