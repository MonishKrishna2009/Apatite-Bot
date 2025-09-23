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

const { EmbedBuilder} = require('discord.js');

class LogManager {
    constructor(client) {
        this.client = client;
    }

    // Get log channel for specific type from config
    getLogChannel(logType) {
        const config = require("../Configs/config.js");
        
        switch(logType) {
            case 'serverLog':
                return config.serverLogChannelId
            case 'memberLog':
                return config.memberLogChannelId
            case 'voiceLog':
                return config.voiceLogChannelId
            case 'messageLog':
                return config.messageLogChannelId
            default:
                return null;
        }
    }

    // Create standardized embed
    createLogEmbed(type, color, title, description = null, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .addFields(fields)
            .setTimestamp()
            .setFooter({ text: `Log Type: ${type}` });
    
        if (description) embed.setDescription(description);
    
        return embed;
    }

    // Send log to appropriate channel
    async sendLog(logType, embed, options = {}) {
        try {
            const channelId = this.getLogChannel(logType);
            if (!channelId) return;

            const channel = await this.client.channels.fetch(channelId);
            if (!channel) return;

            await channel.send({ embeds: [embed], ...options });
        } catch (error) {
            console.error(`Failed to send ${logType} log:`, error);
        }
    }

    // Get audit log entry for actions
    async getAuditLogEntry(guild, action, targetId = null) {
        try {
            const auditLogs = await guild.fetchAuditLogs({
                type: action,
                limit: 1
            });
            
            const entry = auditLogs.entries.first();
            if (!entry) return null;
            
            // Check if the entry is recent (within last 5 seconds)
            if (Date.now() - entry.createdTimestamp > 5000) return null;
            
            // If targetId is provided, check if it matches
            if (targetId && entry.target?.id !== targetId) return null;
            
            return entry;
        } catch (error) {
            console.error('Failed to fetch audit log:', error);
            return null;
        }
    }

}

module.exports = LogManager;