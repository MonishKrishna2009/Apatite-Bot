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
    case "Valorant": {
      if (req.type === "LFP") {
        base.setDescription(
          `>>> **User:** <@${req.userId}>\n` +
            `**Team Name:** ${req.content.teamName || "N/A"}\n` +
            `**Roles Needed:** ${req.content.rolesNeeded || "N/A"}\n` +
            `**Peak Rank:** ${req.content.peakRank || "N/A"}\n` +
            `**Current Rank:** ${req.content.currentRank || "N/A"}\n` +
            `**Additional Info:** ${req.content.additionalInfo || "N/A"}`
        );
      } else {
        base.setDescription(
          `>>> **User:** <@${req.userId}>\n` +
            `**Riot ID:** ${req.content.riotID || "N/A"}\n` +
            `**Roles Played:** ${req.content.rolesPlayed || "N/A"}\n` +
            `**Peak/Current Rank:** ${req.content.peakRank || "N/A"}\n` +
            `**Recent Teams:** ${req.content.recentTeams || "N/A"}\n` +
            `**Additional Info:** ${req.content.additionalInfo || "N/A"}`
        );
      }
      break;
    }

    // Future games (LoL, Apex, etc.)
    default: {
      base.setDescription(
        `>>> **User:** <@${req.userId}>\n**Details:** ${JSON.stringify(req.content, null, 2)}`
      );
      break;
    }
  }

  return base;
}

module.exports = { renderRequestEmbed };
