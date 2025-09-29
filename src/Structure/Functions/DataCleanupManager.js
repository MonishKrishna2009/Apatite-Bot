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

const config = require('../Configs/config.js');
const { Logger } = require('./Logger.js');
const { 
    CleanupLog, 
    FailedDeletion, 
    AnalyticsData, 
    RetentionPolicy 
} = require('../Schemas/DataCleanup/cleanupSchema.js');

class DataCleanupManager {
    constructor(client) {
        this.client = client;
        this.logger = new Logger();
        this.isRunning = false;
        this.cleanupInterval = null;
        
        // Run cleanup every 24 hours by default
        this.cleanupFrequency = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Hybrid approach: Discord channel cleanup + minimal database tracking
        this.discordCleanupEnabled = true;
        this.databaseTrackingEnabled = true; // For audit trails and retry logic
        
        // Cleanup statistics tracking
        this.cleanupStats = {
            totalRuns: 0,
            lastRun: null,
            totalDeleted: 0,
            totalErrors: 0,
            failedDeletions: []
        };
    }

    /**
     * Start the automatic data cleanup system
     */
    startCleanup() {
        if (this.isRunning) {
            this.logger.warn('Data cleanup is already running');
            return;
        }

        this.isRunning = true;

        // Run initial cleanup
        this.performCleanup();

        // Schedule periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.cleanupFrequency);
    }

    /**
     * Stop the automatic data cleanup system
     */
    stopCleanup() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Perform the main cleanup operation using hybrid approach
     */
    async performCleanup() {
        const startTime = Date.now();
        let performanceMetrics = {
            channelsProcessed: 0,
            apiCalls: 0,
            rateLimitHits: 0
        };

        try {
            this.cleanupStats.totalRuns++;
            this.cleanupStats.lastRun = new Date();
            
            // Check if logging is enabled before proceeding
            if (!this.client.config?.logging?.enabled) {
                return;
            }
            
            const cleanupStats = {
                messageLogs: 0,
                metadataLogs: 0,
                auditLogs: 0,
                analyticsData: 0,
                errors: 0,
                retriedFailures: 0,
                duration: 0,
                channelsProcessed: 0,
                apiCalls: 0,
                rateLimitHits: 0
            };

            // Clean up different types of data using hybrid approach
            if (this.discordCleanupEnabled) {
                cleanupStats.messageLogs = await this.cleanupDiscordMessageLogs();
                cleanupStats.metadataLogs = await this.cleanupDiscordMetadataLogs();
                cleanupStats.auditLogs = await this.cleanupDiscordAuditLogs();
            }
            
            if (this.databaseTrackingEnabled) {
                cleanupStats.analyticsData = await this.cleanupDatabaseAnalytics();
                cleanupStats.retriedFailures = await this.retryFailedDeletions();
            }

            // Calculate performance metrics
            const endTime = Date.now();
            cleanupStats.duration = endTime - startTime;
            cleanupStats.channelsProcessed = performanceMetrics.channelsProcessed;
            cleanupStats.apiCalls = performanceMetrics.apiCalls;
            cleanupStats.rateLimitHits = performanceMetrics.rateLimitHits;

            // Update statistics
            this.cleanupStats.totalDeleted += cleanupStats.messageLogs + cleanupStats.metadataLogs + cleanupStats.auditLogs + cleanupStats.analyticsData;
            this.cleanupStats.totalErrors += cleanupStats.errors;

            // Store cleanup statistics for monitoring (silent)
            await this.storeCleanupStatistics(cleanupStats);
            
            // Log final completion with comprehensive stats
            const totalDeleted = cleanupStats.messageLogs + cleanupStats.metadataLogs + cleanupStats.auditLogs + cleanupStats.analyticsData;
            const stats = {
                totalDeleted,
                messageLogs: cleanupStats.messageLogs,
                metadataLogs: cleanupStats.metadataLogs,
                auditLogs: cleanupStats.auditLogs,
                analyticsData: cleanupStats.analyticsData,
                retriedFailures: cleanupStats.retriedFailures,
                channelsProcessed: cleanupStats.channelsProcessed,
                apiCalls: cleanupStats.apiCalls,
                rateLimitHits: cleanupStats.rateLimitHits,
                duration: cleanupStats.duration
            };
            this.logger.success(`Data cleanup completed: ${JSON.stringify(stats)}`);
            
        } catch (error) {
            this.cleanupStats.totalErrors++;
            this.logger.error(`Data cleanup failed: ${error.message}`);
            
            // Store error statistics (silent)
            const errorStats = {
                messageLogs: 0,
                metadataLogs: 0,
                auditLogs: 0,
                analyticsData: 0,
                errors: 1,
                retriedFailures: 0,
                duration: Date.now() - startTime,
                channelsProcessed: performanceMetrics.channelsProcessed,
                apiCalls: performanceMetrics.apiCalls,
                rateLimitHits: performanceMetrics.rateLimitHits
            };
            
            await this.storeCleanupStatistics(errorStats);
        }
    }

    /**
     * Clean up Discord message logs based on retention policy
     * Uses Discord API to delete old messages from log channels
     */
    async cleanupDiscordMessageLogs() {
        try {
            const retentionDays = config.logging?.retentionDays?.fullContent ?? 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const messageLogChannelId = config.logging?.messageLogChannelId;
            if (!messageLogChannelId) {
                this.logger.warn('Message log channel not configured, skipping cleanup');
                return 0;
            }

            const deletedCount = await this.cleanupDiscordChannel(messageLogChannelId, cutoffDate, 'messageLogs');
            
            // Silent cleanup - only log completion stats
            return deletedCount;
            
        } catch (error) {
            this.logger.error(`Failed to cleanup Discord message logs: ${error.message}`);
            return 0;
        }
    }

    /**
     * Clean up Discord metadata logs based on retention policy
     * Includes member logs, server logs, and voice logs
     */
    async cleanupDiscordMetadataLogs() {
        try {
            const retentionDays = config.logging?.retentionDays?.metadata ?? 365;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            let totalDeleted = 0;
            
            // Clean up member logs
            if (config.logging?.memberLogChannelId) {
                const memberDeleted = await this.cleanupDiscordChannel(config.logging.memberLogChannelId, cutoffDate, 'memberLogs');
                totalDeleted += memberDeleted;
            }
            
            // Clean up server logs
            if (config.logging?.serverLogChannelId) {
                const serverDeleted = await this.cleanupDiscordChannel(config.logging.serverLogChannelId, cutoffDate, 'serverLogs');
                totalDeleted += serverDeleted;
            }
            
            // Clean up voice logs
            if (config.logging?.voiceLogChannelId) {
                const voiceDeleted = await this.cleanupDiscordChannel(config.logging.voiceLogChannelId, cutoffDate, 'voiceLogs');
                totalDeleted += voiceDeleted;
            }

            // Silent cleanup - only log completion stats
            return totalDeleted;
            
        } catch (error) {
            this.logger.error(`Failed to cleanup Discord metadata logs: ${error.message}`);
            return 0;
        }
    }

    /**
     * Clean up Discord audit logs based on retention policy
     * Note: Audit logs typically have longer retention (7 years for compliance)
     */
    async cleanupDiscordAuditLogs() {
        try {
            const retentionDays = config.logging?.retentionDays?.auditLogs ?? 2555; // 7 years
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            // Audit logs are typically mixed with other logs, so we clean them from all log channels
            let totalDeleted = 0;
            const logChannelIds = [
                config.logging?.messageLogChannelId,
                config.logging?.memberLogChannelId,
                config.logging?.serverLogChannelId,
                config.logging?.voiceLogChannelId
            ].filter(Boolean);

            for (const channelId of logChannelIds) {
                const deleted = await this.cleanupDiscordChannel(channelId, cutoffDate, 'auditLogs');
                totalDeleted += deleted;
            }
            
            // Silent cleanup - only log completion stats
            return totalDeleted;
            
        } catch (error) {
            this.logger.error(`Failed to cleanup Discord audit logs: ${error.message}`);
            return 0;
        }
    }

    /**
     * Clean up analytics data from database (minimal tracking)
     */
    async cleanupDatabaseAnalytics() {
        try {
            const retentionDays = config.logging?.privacyControls?.analytics?.retentionDays ?? 90;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            // Clean up analytics data from database
            const deletedCount = await this.deleteDatabaseRecords('analyticsData', cutoffDate);
            
            // Silent cleanup - only log completion stats
            return deletedCount;
            
        } catch (error) {
            this.logger.error(`Failed to cleanup database analytics: ${error.message}`);
            return 0;
        }
    }

    /**
     * Clean up Discord channel messages based on retention policy
     * @param {string} channelId - Discord channel ID
     * @param {Date} cutoffDate - Date before which messages should be deleted
     * @param {string} logType - Type of logs being cleaned (for tracking)
     * @returns {number} - Number of deleted messages
     */
    async cleanupDiscordChannel(channelId, cutoffDate, logType) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                this.logger.warn(`Channel ${channelId} not found, skipping cleanup`);
                return 0;
            }

            // Check if bot has permission to delete messages
            if (!channel.permissionsFor(this.client.user).has('ManageMessages')) {
                this.logger.warn(`No permission to delete messages in ${channel.name}, skipping cleanup`);
                return 0;
            }

            let totalDeleted = 0;
            let beforeMessageId = null;
            const batchSize = 100; // Discord API limit for bulk operations
            const maxMessages = 1000; // Limit to prevent excessive API calls

            // Silent channel cleanup - only log completion stats

            // Fetch messages in batches and delete old ones
            while (totalDeleted < maxMessages) {
                try {
                    const messages = await channel.messages.fetch({
                        limit: batchSize,
                        before: beforeMessageId
                    });

                    if (messages.size === 0) break;

                    const messagesToDelete = [];
                    let oldestMessage = null;

                    for (const [messageId, message] of messages) {
                        if (message.createdAt < cutoffDate) {
                            messagesToDelete.push(messageId);
                        }
                        
                        if (!oldestMessage || message.createdAt < oldestMessage.createdAt) {
                            oldestMessage = message;
                        }
                    }

                    // Delete messages in batches (Discord allows up to 100 at a time)
                    if (messagesToDelete.length > 0) {
                        const deleteResult = await this.bulkDeleteMessages(channel, messagesToDelete, logType);
                        totalDeleted += deleteResult.deleted;
                        
                        // Track failed deletions for retry
                        if (deleteResult.failed.length > 0) {
                            try {
                                await this.trackFailedDeletions(channelId, deleteResult.failed, logType);
                            } catch (error) {
                                this.logger.error(`Failed to track failed deletions for channel ${channelId}: ${error.message}`);
                            }
                        }
                    }

                    // Set up for next batch
                    beforeMessageId = oldestMessage?.id;

                    // Rate limiting: wait between batches to avoid hitting Discord API limits
                    await this.delay(1000); // 1 second delay

                } catch (error) {
                    this.logger.error(`Error fetching messages from ${channel.name}: ${error.message}`);
                    break;
                }
            }

            // Silent channel cleanup - only log completion stats
            return totalDeleted;

        } catch (error) {
            this.logger.error(`Failed to cleanup Discord channel ${channelId}: ${error.message}`);
            return 0;
        }
    }

    /**
     * Bulk delete messages from a Discord channel
     * @param {Channel} channel - Discord channel
     * @param {Array<string>} messageIds - Array of message IDs to delete
     * @param {string} logType - Type of logs being deleted
     * @returns {Object} - Result with deleted count and failed IDs
     */
    async bulkDeleteMessages(channel, messageIds, logType) {
        const result = { deleted: 0, failed: [] };

        // Process in chunks of 100 (Discord API limit)
        const chunks = this.chunkArray(messageIds, 100);

        for (const chunk of chunks) {
            try {
                // Use bulk delete for messages newer than 2 weeks
                const recentMessages = chunk.filter(id => {
                    const message = channel.messages.cache.get(id);
                    if (!message) return false;
                    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
                    return message.createdAt > twoWeeksAgo;
                });

                if (recentMessages.length > 1) {
                    // Bulk delete for recent messages
                    const deleted = await channel.bulkDelete(recentMessages, true);
                    result.deleted += deleted.size;
                } else if (recentMessages.length === 1) {
                    // Individual delete for single recent message
                    const messageId = recentMessages[0];
                    try {
                        const message = channel.messages.cache.get(messageId) || await channel.messages.fetch(messageId);
                        await message.delete();
                        result.deleted++;
                    } catch (error) {
                        this.logger.warn(`Failed to delete recent message ${messageId}: ${error.message}`);
                        result.failed.push(messageId);
                    }
                }

                // Individual delete for older messages
                const olderMessages = chunk.filter(id => !recentMessages.includes(id));
                for (const messageId of olderMessages) {
                    try {
                        const message = channel.messages.cache.get(messageId) || await channel.messages.fetch(messageId);
                        await message.delete();
                        result.deleted++;
                    } catch (error) {
                        this.logger.warn(`Failed to delete message ${messageId}: ${error.message}`);
                        result.failed.push(messageId);
                    }
                }

                // Rate limiting between chunks
                if (chunks.length > 1) {
                    await this.delay(500);
                }

            } catch (error) {
                this.logger.error(`Failed to bulk delete messages in ${channel.name}: ${error.message}`);
                result.failed.push(...chunk);
            }
        }

        return result;
    }

    /**
     * Track failed deletions for retry later using MongoDB
     * @param {string} channelId - Channel ID
     * @param {Array<string>} failedIds - Array of failed message IDs
     * @param {string} logType - Type of logs
     */
    async trackFailedDeletions(channelId, failedIds, logType) {
        try {
            const mongoose = require('mongoose');
            
            // Check if MongoDB is connected
            if (mongoose.connection.readyState !== 1) {
                this.logger.warn('MongoDB not connected, tracking failed deletions in memory only');
                // Fallback to memory tracking
                this.trackFailedDeletionsInMemory(channelId, failedIds, logType);
                return;
            }

            // Get channel and guild information
            const channel = this.client.channels.cache.get(channelId);
            const guild = channel?.guild;

            // Determine failure reason (simplified for now)
            const failureReason = 'unknown'; // Could be enhanced to detect specific reasons

            // Create failed deletion record
            const failedDeletion = new FailedDeletion({
                channelId,
                channelName: channel?.name || 'Unknown Channel',
                messageIds: failedIds,
                logType,
                failureReason,
                retryCount: 0,
                resolved: false,
                serverInfo: {
                    guildId: guild?.id || 'unknown',
                    guildName: guild?.name || 'unknown'
                }
            });

            // Save to MongoDB
            await failedDeletion.save();
            
            // Silent tracking - only log completion stats
            
        } catch (error) {
            this.logger.error(`Failed to track failed deletions in MongoDB: ${error.message}`);
            // Fallback to memory tracking
            this.trackFailedDeletionsInMemory(channelId, failedIds, logType);
        }
    }

    /**
     * Fallback method to track failed deletions in memory
     * @param {string} channelId - Channel ID
     * @param {Array<string>} failedIds - Array of failed message IDs
     * @param {string} logType - Type of logs
     */
    trackFailedDeletionsInMemory(channelId, failedIds, logType) {
        const failure = {
            channelId,
            messageIds: failedIds,
            logType,
            timestamp: new Date(),
            retryCount: 0
        };

        this.cleanupStats.failedDeletions.push(failure);
        
        // Keep only last 1000 failed deletions to prevent memory issues
        if (this.cleanupStats.failedDeletions.length > 1000) {
            this.cleanupStats.failedDeletions = this.cleanupStats.failedDeletions.slice(-1000);
        }

        // Silent memory tracking - only log completion stats
    }

    /**
     * Retry failed message deletions using MongoDB
     * @returns {number} - Number of successfully retried deletions
     */
    async retryFailedDeletions() {
        try {
            const mongoose = require('mongoose');
            
            // Check if MongoDB is connected
            if (mongoose.connection.readyState !== 1) {
                this.logger.warn('MongoDB not connected, retrying from memory only');
                return await this.retryFailedDeletionsFromMemory();
            }

            // Get unresolved failed deletions from MongoDB
            const failedDeletions = await FailedDeletion.find({
                resolved: false,
                retryCount: { $lt: 3 } // Max 3 retries
            }).limit(100); // Process in batches

            let totalRetryCount = 0;

            for (const failure of failedDeletions) {
                try {
                    const channel = await this.client.channels.fetch(failure.channelId);
                    if (!channel) {
                        // Mark as resolved if channel doesn't exist
                        await FailedDeletion.findByIdAndUpdate(failure._id, {
                            resolved: true,
                            resolvedAt: new Date()
                        });
                        continue;
                    }

                    let successCount = 0;
                    const remainingMessageIds = [];

                    for (const messageId of failure.messageIds) {
                        try {
                            const message = await channel.messages.fetch(messageId);
                            await message.delete();
                            successCount++;
                            totalRetryCount++;
                        } catch (error) {
                            // Message might have been deleted manually or doesn't exist
                            remainingMessageIds.push(messageId);
                        }
                    }

                    // Update the failure record
                    const updateData = {
                        retryCount: failure.retryCount + 1,
                        lastRetry: new Date()
                    };

                    if (remainingMessageIds.length === 0) {
                        // All messages were successfully deleted
                        updateData.resolved = true;
                        updateData.resolvedAt = new Date();
                        updateData.messageIds = []; // Clear the array
                    } else {
                        // Update with remaining message IDs
                        updateData.messageIds = remainingMessageIds;
                    }

                    await FailedDeletion.findByIdAndUpdate(failure._id, updateData);

                    if (successCount > 0) {
                        // Silent retry - only log completion stats
                    }

                } catch (error) {
                    this.logger.error(`Failed to retry deletions for ${failure.logType}: ${error.message}`);
                    
                    // Increment retry count even on error
                    await FailedDeletion.findByIdAndUpdate(failure._id, {
                        retryCount: failure.retryCount + 1,
                        lastRetry: new Date()
                    });
                }
            }

            // Also retry any in-memory failures
            const memoryRetryCount = await this.retryFailedDeletionsFromMemory();
            totalRetryCount += memoryRetryCount;

            return totalRetryCount;

        } catch (error) {
            this.logger.error(`Failed to retry failed deletions from MongoDB: ${error.message}`);
            // Fallback to memory retry
            return await this.retryFailedDeletionsFromMemory();
        }
    }

    /**
     * Fallback method to retry failed deletions from memory
     * @returns {number} - Number of successfully retried deletions
     */
    async retryFailedDeletionsFromMemory() {
        let retryCount = 0;
        const maxRetries = 3;

        for (let i = this.cleanupStats.failedDeletions.length - 1; i >= 0; i--) {
            const failure = this.cleanupStats.failedDeletions[i];
            
            if (failure.retryCount >= maxRetries) {
                // Remove failures that have exceeded max retries
                this.cleanupStats.failedDeletions.splice(i, 1);
                continue;
            }

            try {
                const channel = await this.client.channels.fetch(failure.channelId);
                if (!channel) {
                    this.cleanupStats.failedDeletions.splice(i, 1);
                    continue;
                }

                let successCount = 0;
                for (const messageId of failure.messageIds) {
                    try {
                        const message = await channel.messages.fetch(messageId);
                        await message.delete();
                        successCount++;
                        retryCount++;
                    } catch (error) {
                        // Message might have been deleted manually or doesn't exist
                        continue;
                    }
                }

                if (successCount > 0) {
                    failure.retryCount++;
                        // Silent retry - only log completion stats
                }

                // Remove from retry list if all messages were handled
                if (successCount === failure.messageIds.length) {
                    this.cleanupStats.failedDeletions.splice(i, 1);
                }

            } catch (error) {
                this.logger.error(`Failed to retry memory deletions for ${failure.logType}: ${error.message}`);
                failure.retryCount++;
            }
        }

        return retryCount;
    }

    /**
     * Delete database records using MongoDB
     * @param {string} collectionName - Database collection name
     * @param {Date} cutoffDate - Date before which records should be deleted
     * @returns {number} - Number of deleted records
     */
    async deleteDatabaseRecords(collectionName, cutoffDate) {
        try {
            const mongoose = require('mongoose');
            
            // Check if MongoDB is connected
            if (mongoose.connection.readyState !== 1) {
                this.logger.warn('MongoDB not connected, skipping database cleanup');
                return 0;
            }

            let deletedCount = 0;

            switch (collectionName) {
                case 'analyticsData': {
                    const analyticsResult = await AnalyticsData.deleteMany({
                        timestamp: { $lt: cutoffDate }
                    });
                    deletedCount = analyticsResult.deletedCount;
                    break;
                }
                    
                case 'cleanupLogs': {
                    // Keep cleanup logs for audit purposes, but limit retention
                    const cleanupCutoff = new Date();
                    cleanupCutoff.setDate(cleanupCutoff.getDate() - 365); // Keep for 1 year
                    
                    const cleanupResult = await CleanupLog.deleteMany({
                        timestamp: { $lt: cleanupCutoff }
                    });
                    deletedCount = cleanupResult.deletedCount;
                    break;
                }
                    
                case 'failedDeletions': {
                    // Clean up resolved failed deletions older than 30 days
                    const failedCutoff = new Date();
                    failedCutoff.setDate(failedCutoff.getDate() - 30);
                    
                    const failedResult = await FailedDeletion.deleteMany({
                        resolved: true,
                        resolvedAt: { $lt: failedCutoff }
                    });
                    deletedCount = failedResult.deletedCount;
                    break;
                }
                    
                default:
                    this.logger.warn(`Unknown collection name: ${collectionName}`);
                    return 0;
            }

            if (deletedCount > 0) {
                // Silent database cleanup - only log completion stats
            }
            
            return deletedCount;
            
        } catch (error) {
            this.logger.error(`Failed to delete database records from ${collectionName}: ${error.message}`);
            return 0;
        }
    }

    /**
     * Store cleanup statistics for monitoring and audit trails using MongoDB
     * @param {Object} stats - Cleanup statistics
     */
    async storeCleanupStatistics(stats) {
        try {
            const mongoose = require('mongoose');
            
            // Check if MongoDB is connected
            if (mongoose.connection.readyState !== 1) {
                this.logger.warn('MongoDB not connected, skipping statistics storage');
                return;
            }

            // Get server information
            const guild = this.client.guilds.cache.first();
            
            // Create cleanup record
            const cleanupRecord = new CleanupLog({
                method: 'hybrid',
                stats: {
                    messageLogs: stats.messageLogs || 0,
                    metadataLogs: stats.metadataLogs || 0,
                    auditLogs: stats.auditLogs || 0,
                    analyticsData: stats.analyticsData || 0,
                    errorCount: stats.errors || 0,
                    retriedFailures: stats.retriedFailures || 0
                },
                totalDeleted: (stats.messageLogs || 0) + (stats.metadataLogs || 0) + 
                             (stats.auditLogs || 0) + (stats.analyticsData || 0),
                retentionPolicies: {
                    fullContent: config.logging?.retentionDays?.fullContent ?? 30,
                    metadata: config.logging?.retentionDays?.metadata ?? 365,
                    auditLogs: config.logging?.retentionDays?.auditLogs ?? 2555,
                    analytics: config.logging?.privacyControls?.analytics?.retentionDays ?? 90
                },
                performance: {
                    duration: stats.duration || 0,
                    channelsProcessed: stats.channelsProcessed || 0,
                    apiCalls: stats.apiCalls || 0,
                    rateLimitHits: stats.rateLimitHits || 0
                },
                serverInfo: {
                    guildId: guild?.id || 'unknown',
                    guildName: guild?.name || 'unknown',
                    botVersion: process.env.npm_package_version || '1.0.0'
                }
            });

            // Save to MongoDB
            await cleanupRecord.save();
            
            // Silent storage - no logging
            
        } catch (error) {
            this.logger.error(`Failed to store cleanup statistics: ${error.message}`);
        }
    }


    /**
     * Utility method to split array into chunks
     * @param {Array} array - Array to chunk
     * @param {number} chunkSize - Size of each chunk
     * @returns {Array} - Array of chunks
     */
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Utility method to add delay between operations
     * @param {number} ms - Milliseconds to delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get cleanup statistics and status
     */
    getCleanupStatus() {
        return {
            isRunning: this.isRunning,
            cleanupFrequency: this.cleanupFrequency,
            nextCleanup: this.cleanupInterval ? new Date(Date.now() + this.cleanupFrequency) : null,
            method: 'hybrid', // Discord + Database
            discordCleanupEnabled: this.discordCleanupEnabled,
            databaseTrackingEnabled: this.databaseTrackingEnabled,
            statistics: this.cleanupStats,
            retentionPolicies: {
                fullContent: config.logging?.retentionDays?.fullContent ?? 30,
                metadata: config.logging?.retentionDays?.metadata ?? 365,
                auditLogs: config.logging?.retentionDays?.auditLogs ?? 2555,
                analytics: config.logging?.privacyControls?.analytics?.retentionDays ?? 90
            }
        };
    }

    /**
     * Manually trigger cleanup for specific data type using hybrid approach
     */
    async manualCleanup(dataType) {
        try {
            this.logger.info(`Manual hybrid cleanup triggered for ${dataType}`);
            
            let deletedCount = 0;
            switch (dataType) {
                case 'messageLogs':
                    deletedCount = await this.cleanupDiscordMessageLogs();
                    break;
                case 'metadataLogs':
                    deletedCount = await this.cleanupDiscordMetadataLogs();
                    break;
                case 'auditLogs':
                    deletedCount = await this.cleanupDiscordAuditLogs();
                    break;
                case 'analyticsData':
                    deletedCount = await this.cleanupDatabaseAnalytics();
                    break;
                case 'failedDeletions':
                    deletedCount = await this.retryFailedDeletions();
                    break;
                case 'discord': {
                    // Clean up all Discord channels
                    const messageLogs = await this.cleanupDiscordMessageLogs();
                    const metadataLogs = await this.cleanupDiscordMetadataLogs();
                    const auditLogs = await this.cleanupDiscordAuditLogs();
                    deletedCount = messageLogs + metadataLogs + auditLogs;
                    break;
                }
                case 'database':
                    deletedCount = await this.cleanupDatabaseAnalytics();
                    break;
                case 'all':
                    await this.performCleanup();
                    deletedCount = 'All data types cleaned using hybrid approach';
                    break;
                default:
                    throw new Error(`Unknown data type: ${dataType}. Available: messageLogs, metadataLogs, auditLogs, analyticsData, failedDeletions, discord, database, all`);
            }

            this.logger.success(`Manual hybrid cleanup completed for ${dataType}: ${deletedCount} entries`);
            return deletedCount;
            
        } catch (error) {
            this.logger.error(`Manual hybrid cleanup failed for ${dataType}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get detailed cleanup statistics and performance metrics from MongoDB
     */
    async getDetailedStats() {
        try {
            const mongoose = require('mongoose');
            
            // Check if MongoDB is connected
            if (mongoose.connection.readyState !== 1) {
                this.logger.warn('MongoDB not connected, returning basic stats only');
                return this.getBasicStats();
            }

            // Get recent cleanup logs from MongoDB
            const recentCleanups = await CleanupLog.find({})
                .sort({ timestamp: -1 })
                .limit(10)
                .lean();

            // Get failed deletions count
            const pendingFailedDeletions = await FailedDeletion.countDocuments({
                resolved: false,
                retryCount: { $lt: 3 }
            });

            // Get total statistics
            const totalStats = await CleanupLog.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRuns: { $sum: 1 },
                        totalDeleted: { $sum: '$totalDeleted' },
                        totalErrors: { $sum: '$stats.errorCount' },
                        avgDuration: { $avg: '$performance.duration' },
                        lastRun: { $max: '$timestamp' }
                    }
                }
            ]);

            const stats = totalStats[0] || {
                totalRuns: 0,
                totalDeleted: 0,
                totalErrors: 0,
                avgDuration: 0,
                lastRun: null
            };

            return {
                system: {
                    isRunning: this.isRunning,
                    method: 'hybrid',
                    discordEnabled: this.discordCleanupEnabled,
                    databaseEnabled: this.databaseTrackingEnabled,
                    frequency: this.cleanupFrequency,
                    nextRun: this.cleanupInterval ? new Date(Date.now() + this.cleanupFrequency) : null,
                    mongodbConnected: mongoose.connection.readyState === 1
                },
                performance: {
                    totalRuns: stats.totalRuns,
                    lastRun: stats.lastRun,
                    totalDeleted: stats.totalDeleted,
                    totalErrors: stats.totalErrors,
                    avgDuration: Math.round(stats.avgDuration || 0),
                    pendingRetries: pendingFailedDeletions,
                    memoryFailures: this.cleanupStats.failedDeletions.length
                },
                retention: {
                    fullContent: config.logging?.retentionDays?.fullContent ?? 30,
                    metadata: config.logging?.retentionDays?.metadata ?? 365,
                    auditLogs: config.logging?.retentionDays?.auditLogs ?? 2555,
                    analytics: config.logging?.privacyControls?.analytics?.retentionDays ?? 90
                },
                recentCleanups: recentCleanups,
                failures: this.cleanupStats.failedDeletions.slice(-10) // Last 10 memory failures
            };

        } catch (error) {
            this.logger.error(`Failed to get detailed stats from MongoDB: ${error.message}`);
            return this.getBasicStats();
        }
    }

    /**
     * Fallback method to get basic statistics when MongoDB is not available
     */
    getBasicStats() {
        return {
            system: {
                isRunning: this.isRunning,
                method: 'hybrid',
                discordEnabled: this.discordCleanupEnabled,
                databaseEnabled: this.databaseTrackingEnabled,
                frequency: this.cleanupFrequency,
                nextRun: this.cleanupInterval ? new Date(Date.now() + this.cleanupFrequency) : null,
                mongodbConnected: false
            },
            performance: {
                totalRuns: this.cleanupStats.totalRuns,
                lastRun: this.cleanupStats.lastRun,
                totalDeleted: this.cleanupStats.totalDeleted,
                totalErrors: this.cleanupStats.totalErrors,
                pendingRetries: this.cleanupStats.failedDeletions.length
            },
            retention: {
                fullContent: config.logging?.retentionDays?.fullContent ?? 30,
                metadata: config.logging?.retentionDays?.metadata ?? 365,
                auditLogs: config.logging?.retentionDays?.auditLogs ?? 2555,
                analytics: config.logging?.privacyControls?.analytics?.retentionDays ?? 90
            },
            failures: this.cleanupStats.failedDeletions.slice(-10)
        };
    }

    /**
     * Configure cleanup settings
     * @param {Object} options - Configuration options
     */
    configureCleanup(options) {
        if (options.frequency) {
            this.cleanupFrequency = options.frequency;
            this.logger.info(`Cleanup frequency updated to ${options.frequency}ms`);
        }
        
        if (options.discordCleanup !== undefined) {
            this.discordCleanupEnabled = options.discordCleanup;
            this.logger.info(`Discord cleanup ${options.discordCleanup ? 'enabled' : 'disabled'}`);
        }
        
        if (options.databaseTracking !== undefined) {
            this.databaseTrackingEnabled = options.databaseTracking;
            this.logger.info(`Database tracking ${options.databaseTracking ? 'enabled' : 'disabled'}`);
        }
        
        this.logger.info('Cleanup configuration updated');
    }

    /**
     * Validate retention policies are properly configured
     */
    validateRetentionPolicies() {
        const issues = [];
        const retentionDays = config.logging?.retentionDays ?? {};
        
        if (!retentionDays.fullContent || retentionDays.fullContent < 1) {
            issues.push('Full content retention must be at least 1 day');
        }
        
        if (!retentionDays.metadata || retentionDays.metadata < 1) {
            issues.push('Metadata retention must be at least 1 day');
        }
        
        if (!retentionDays.auditLogs || retentionDays.auditLogs < 365) {
            issues.push('Audit logs retention must be at least 1 year for compliance');
        }
        
        const analyticsRetention = config.logging?.privacyControls?.analytics?.retentionDays;
        if (analyticsRetention && analyticsRetention < 1) {
            issues.push('Analytics retention must be at least 1 day');
        }

        if (issues.length > 0) {
            this.logger.warn(`Retention policy issues found: ${issues.join(', ')}`);
        } else {
            this.logger.success('All retention policies are properly configured');
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }
}

module.exports = { DataCleanupManager };
