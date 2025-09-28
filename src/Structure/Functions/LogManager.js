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
const { PrivacyUtils } = require('./PrivacyUtils.js');

class LogManager {
    constructor(client) {
        this.client = client;
        this.privacyUtils = new PrivacyUtils();
    }

    // Get log channel for specific type from config
    getLogChannel(logType) {
        const config = require("../Configs/config.js");
        const loggingConfig = config.logging || {};
        
        switch(logType) {
            case 'serverLog':
                return loggingConfig.serverLogChannelId;
            case 'memberLog':
                return loggingConfig.memberLogChannelId;
            case 'voiceLog':
                return loggingConfig.voiceLogChannelId;
            case 'messageLog':
                return loggingConfig.messageLogChannelId;
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
            if (!channelId) {
                console.warn(`No channel configured for log type: ${logType}`);
                return;
            }

            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                console.warn(`Channel ${channelId} not found for log type: ${logType}`);
                return;
            }

            // Check if bot has permission to send messages in this channel
            if (!channel.permissionsFor(this.client.user)?.has('SendMessages')) {
                console.warn(`No permission to send messages in channel ${channelId} for log type: ${logType}`);
                return;
            }

            await channel.send({ embeds: [embed], ...options });
        } catch (error) {
            console.error(`Failed to send ${logType} log:`, error);
        }
    }

    // Get audit log entry for actions
    async getAuditLogEntry(guild, action, targetId = null) {
        try {
            // Check if guild has audit log permissions
            if (!guild.me?.permissions?.has('ViewAuditLog')) {
                return null;
            }

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

    // Privacy-aware message content processing
    processMessageContent(content, options = {}) {
        return this.privacyUtils.processMessageContent(content, options);
    }

    // Create privacy-aware embed for message logs
    createMessageLogEmbed(type, color, title, messageData, options = {}) {
        const {
            includeContent = false,
            channel = null,
            author = null,
            messageId = null
        } = options;

        let description = `>>> **Author**: ${author ? `${author.tag} (\`${author.id}\`)` : 'Unknown'}\n`;
        
        if (channel) {
            description += `**Channel**: ${channel} (\`${channel.id}\`)\n`;
        }
        
        if (messageId) {
            description += `**Message ID**: \`${messageId}\`\n\n`;
        }

        // Process message content based on privacy settings
        if (includeContent && messageData?.content) {
            const processedContent = this.processMessageContent(messageData.content, {
                fullContentLogging: true // Allow content for message logs when explicitly requested
            });
            
            description += `**Content**:\n${processedContent.content}`;
            
            // Add privacy notice if content was processed
            if (processedContent.redacted || processedContent.sanitized) {
                description += `\n\n> *Privacy Notice: ${processedContent.reason}*`;
            }
        } else {
            description += `**Content**: [CONTENT_NOT_LOGGED_FOR_PRIVACY]`;
        }

        return this.createLogEmbed(type, color, title, description);
    }

    // Send privacy-aware log
    async sendPrivacyLog(logType, embed, options = {}) {
        try {
            // Check if logging is enabled
            const config = require("../Configs/config.js");
            const loggingConfig = config.logging || {};
            
            if (!loggingConfig.enabled) {
                return;
            }

            // Add privacy footer to embed
            if (loggingConfig.piiRedaction || loggingConfig.contentSanitization) {
                embed.setFooter({
                    text: `${embed.data.footer?.text || ''} • Privacy controls active`,
                    iconURL: embed.data.footer?.iconURL
                });
            }

            await this.sendLog(logType, embed, options);
        } catch (error) {
            console.error(`Failed to send privacy log:`, error);
        }
    }

    // Check if content should be logged based on privacy settings
    shouldLogContent(channelId, channelType = 'text') {
        return this.privacyUtils.shouldLogContent(channelId, channelType);
    }

    // Get retention information for logging
    getRetentionInfo(dataType) {
        const retentionDate = this.privacyUtils.getRetentionDate(dataType);
        const config = require("../Configs/config.js");
        const retentionDays = config.logging?.retentionDays?.[dataType] || 365;
        
        return {
            retentionDate,
            retentionDays,
            dataType
        };
    }

    // Create analytics-safe log data
    createAnalyticsData(eventData, options = {}) {
        const {
            anonymize = true,
            aggregateOnly = true
        } = options;

        if (!anonymize) {
            return eventData;
        }

        const analyticsData = { ...eventData };

        // Remove or anonymize user-specific data
        if (analyticsData.user) {
            analyticsData.user = this.privacyUtils.anonymizeUserData(analyticsData.user, true);
        }

        // Remove personal content
        delete analyticsData.content;
        delete analyticsData.message;

        // Keep only aggregate-appropriate data
        if (aggregateOnly) {
            const allowedFields = ['eventType', 'timestamp', 'channelType', 'guildId'];
            const filtered = {};
            
            for (const field of allowedFields) {
                if (analyticsData[field] !== undefined) {
                    filtered[field] = analyticsData[field];
                }
            }
            
            return filtered;
        }

        return analyticsData;
    }

}

module.exports = LogManager;