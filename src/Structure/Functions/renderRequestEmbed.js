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
 * Get status-based color and emoji
 * @param {string} status - Request status
 * @returns {Object} - { color, emoji }
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
 * Get game-specific color and emoji
 * @param {string} game - Game name
 * @returns {Object} - { color, emoji, displayName }
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
 * Format field value for display
 * @param {any} value - Field value
 * @param {number} maxLength - Maximum length for truncation
 * @returns {string} - Formatted value
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
 * Convert camelCase to readable format
 * @param {string} key - Field key
 * @returns {string} - Readable field name
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
 * Renders an embed for a Looking For Player / Team request
 * @param {Object} req - LFRequest mongoose document
 * @param {User} user - Discord.js User object of the request creator
 * @returns {EmbedBuilder}
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
