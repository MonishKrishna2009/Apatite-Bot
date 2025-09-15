const { EmbedBuilder, Colors } = require("discord.js");

/**
 * Renders an embed for a Looking For Player / Team request
 * @param {Object} req - LFRequest mongoose document
 * @param {User} user - Discord.js User object of the request creator
 * @returns {EmbedBuilder}
 */
function renderRequestEmbed(req, user) {
    const base = new EmbedBuilder()
        .setTitle(req.type === "LFP" ? "👥 Looking for Players" : "🔎 Looking for Team")
        .setColor(Colors.Grey)
        .setFooter({ text: `Request ID: ${req._id}` })
        .setTimestamp();

    if (user) {
        base.setThumbnail(user.displayAvatarURL({ dynamic: true }));
    }

    // Game-specific formatting
    switch (req.game) {
        case "Valorant":
            base.setDescription(
                req.type === "LFP"
                    ? `>>> **User:** <@${req.userId}>\n**Team Name:** ${req.content.teamName}\n**Roles Needed:** ${req.content.rolesNeeded}\n**Peak Rank:** ${req.content.peakRank}\n**Current Rank:** ${req.content.currentRank}\n**Additional Info:** ${req.content.additionalInfo || "N/A"}`
                    : `>>> >>> **User:** <@${user.id}>\n**Riot ID:** ${riotID}\n**Roles Played:** ${rolesPlayed}\n**Peak/Current Rank:** ${peekRank}\n**Recent Teams:** ${recentTeams}\n**Additional Info:** ${additionalInfo} || "N/A"}`
            );
            break;

        case "csgo":
            base.setDescription(
                req.type === "LFP"
                    ? `>>> **User:** <@${req.userId}>\n**Team Name:** ${req.content.teamName}\n**Needed Roles:** ${req.content.rolesNeeded}`
                    : `>>> **User:** <@${req.userId}>\n**Looking For:** ${req.content.lookingFor}\n**Playstyle:** ${req.content.playstyle}`
            );
            break;

        // future games (LoL, Apex, etc.)
        default:
            base.setDescription(`>>> **User:** <@${req.userId}>\n**Details:** ${JSON.stringify(req.content, null, 2)}`);
            break;
    }

    return base;
}

module.exports = { renderRequestEmbed };
