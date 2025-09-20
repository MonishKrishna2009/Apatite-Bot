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