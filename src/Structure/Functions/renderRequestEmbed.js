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
const modalHandler = require("./LFSystem/modalHandler");

/**
 * Map a request status string to a display color and emoji.
 *
 * @param {string} status - Status identifier (case-insensitive).
 * @returns {{color: import('discord.js').ColorResolvable, emoji: string}} An object containing `color` and `emoji` for the given status; returns a default gray color and `"❓"` emoji for unknown statuses.
 */
function getStatusInfo(status) {
  const statusInfo = {
    pending: { color: Colors.Yellow, emoji: "⏳" },
    approved: { color: Colors.Green, emoji: "✅" },
    declined: { color: Colors.Red, emoji: "❌" },
    archived: { color: Colors.Grey, emoji: "📦" },
    expired: { color: Colors.Orange, emoji: "⏰" },
    cancelled: { color: Colors.DarkGrey, emoji: "🚫" },
    deleted: { color: Colors.DarkRed, emoji: "🗑️" }
  };
  
  return statusInfo[status.toLowerCase()] || { color: Colors.Grey, emoji: "❓" };
}

/**
 * Resolve display metadata (color, emoji, and human-readable name) for a given game identifier.
 *
 * Looks up known games by case-insensitive key and, if unknown, attempts to read game configuration
 * from the modalHandler; falls back to a default blue color, generic game emoji, and a capitalized
 * form of the provided game name when configuration is absent or on error.
 * @param {string} game - Game identifier or name (case-insensitive) to resolve.
 * @returns {{color:number, emoji:string, displayName:string}} Object containing:
 *   - color: numeric Discord embed color,
 *   - emoji: short string emoji representing the game,
 *   - displayName: human-readable game name.
 */
function getGameInfo(game) {
  const gameInfo = {
    valorant: { color: 0xFF4655, emoji: "🔫", displayName: "Valorant" },
    cs2: { color: 0x4B69FF, emoji: "💣", displayName: "Counter-Strike 2" },
    csgo: { color: 0x4B69FF, emoji: "💣", displayName: "CS:GO" },
    lol: { color: 0x0AC8FF, emoji: "⚔️", displayName: "League of Legends" },
    apex: { color: 0xFF0000, emoji: "🎯", displayName: "Apex Legends" },
    overwatch: { color: 0x9B9B9B, emoji: "🛡️", displayName: "Overwatch" },
    rocketleague: { color: 0x00D4FF, emoji: "🚗", displayName: "Rocket League" },
    fortnite: { color: 0x00FF00, emoji: "🏗️", displayName: "Fortnite" }
  };
  
  const info = gameInfo[game.toLowerCase()];
  if (info) return info;
  
  // Try to get from modalHandler config
  try {
    const lfpConfig = modalHandler.getGameConfig("lfp", game);
    const lftConfig = modalHandler.getGameConfig("lft", game);
    const displayName = lfpConfig?.displayName || lftConfig?.displayName || game.charAt(0).toUpperCase() + game.slice(1);
    
    return {
      color: Colors.Blue,
      emoji: "🎮",
      displayName: displayName
    };
  } catch (error) {
    return {
      color: Colors.Blue,
      emoji: "🎮",
      displayName: game.charAt(0).toUpperCase() + game.slice(1)
    };
  }
}

/**
 * Normalize a field value for display, returning "Not specified" for empty values and truncating long strings with an ellipsis.
 * @param {any} value - The value to format; will be converted to a trimmed string.
 * @param {number} [maxLength=1000] - Maximum allowed length of the returned string; longer values are truncated and end with "...".
 * @returns {string} The formatted string or `"Not specified"` if the input is empty or falsy.
 */
function formatFieldValue(value, maxLength = 1000) {
  if (!value || value.toString().trim() === '') return "Not specified";
  
  let formatted = value.toString().trim();
  
  // Truncate if too long
  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength - 3) + "...";
  }
  
  return formatted;
}

/**
 * Format a camelCase or PascalCase identifier into a human-readable label.
 *
 * Inserts spaces before capital letters, capitalizes the first character,
 * and normalizes common acronyms (`ID`, `URL`, `API`).
 * @param {string} key - Identifier to format (e.g., "playerId" or "summonerName").
 * @returns {string} The formatted label (e.g., "Player ID", "Summoner Name").
 */
function formatFieldName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/\bId\b/g, 'ID')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bApi\b/g, 'API');
}

/**
 * Renders an embed summarizing a Looking For Player/Team request for display in Discord.
 * @param {Object} req - LFRequest mongoose document containing fields like type, status, game, content, createdAt, expiresAt, reviewedBy, updatedAt, userId, and _id.
 * @param {import('discord.js').User} [user] - Discord user object of the request creator; used for avatar/thumbnail if provided.
 * @returns {EmbedBuilder} The constructed EmbedBuilder representing the request.
 */
function renderRequestEmbed(req, user) {
  const statusInfo = getStatusInfo(req.status);
  const gameInfo = getGameInfo(req.game);
  
  // Create base embed with proper colors and title
  const embed = new EmbedBuilder()
    .setTitle(`${statusInfo.emoji} ${req.type} Request - ${gameInfo.displayName}`)
    .setColor(statusInfo.color)
    .setTimestamp()
    .setFooter({ 
      text: `Request ID: ${req._id} • Status: ${req.status.toUpperCase()}`,
      iconURL: user?.displayAvatarURL({ dynamic: true })
    });

  // Add thumbnail
  if (user) {
    embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
  }

  // Add author field
  embed.addFields({
    name: "👤 Player Information",
    value: `**User:** <@${req.userId}>\n**Game:** ${gameInfo.emoji} ${gameInfo.displayName}\n**Type:** ${req.type}`,
    inline: true
  });

  // Add status field
  embed.addFields({
    name: "📊 Request Status",
    value: `**Status:** ${statusInfo.emoji} ${req.status.toUpperCase()}\n**Created:** <t:${Math.floor(new Date(req.createdAt).getTime() / 1000)}:R>`,
    inline: true
  });

  // Add game-specific content fields
  if (req.content && typeof req.content === 'object') {
    const contentEntries = Object.entries(req.content);
    
    if (contentEntries.length > 0) {
      // Group fields into chunks for better organization
      const primaryFields = [];
      const secondaryFields = [];
      
      contentEntries.forEach(([key, value]) => {
        const formattedValue = formatFieldValue(value);
        const fieldName = formatFieldName(key);
        
        // Prioritize important fields
        const importantFields = ['teamName', 'riotID', 'steamID', 'summonerName', 'rolesNeeded', 'rolesPlayed', 'peakRank', 'currentRank'];
        
        if (importantFields.includes(key)) {
          primaryFields.push(`**${fieldName}:** ${formattedValue}`);
        } else {
          secondaryFields.push(`**${fieldName}:** ${formattedValue}`);
        }
      });
      
      // Add primary fields
      if (primaryFields.length > 0) {
        embed.addFields({
          name: "🎯 Key Details",
          value: primaryFields.join('\n'),
          inline: false
        });
      }
      
      // Add secondary fields if they exist and aren't too long
      if (secondaryFields.length > 0) {
        const secondaryValue = secondaryFields.join('\n');
        if (secondaryValue.length <= 1024) {
          embed.addFields({
            name: "📝 Additional Information",
            value: secondaryValue,
            inline: false
          });
        }
      }
    }
  }

  // Add expiry information if applicable
  if (req.expiresAt) {
    const expiryTimestamp = Math.floor(new Date(req.expiresAt).getTime() / 1000);
    embed.addFields({
      name: "⏰ Expiry Information",
      value: `**Expires:** <t:${expiryTimestamp}:R>\n**Expires At:** <t:${expiryTimestamp}:F>`,
      inline: true
    });
  }

  // Add review information if available
  if (req.reviewedBy) {
    embed.addFields({
      name: "👨‍💼 Review Information",
      value: `**Reviewed By:** <@${req.reviewedBy}>\n**Updated:** <t:${Math.floor(new Date(req.updatedAt).getTime() / 1000)}:R>`,
      inline: true
    });
  }

  return embed;
}

module.exports = { renderRequestEmbed };
