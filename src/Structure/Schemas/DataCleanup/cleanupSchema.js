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

const mongoose = require('mongoose');

/**
 * Schema for tracking cleanup statistics and audit trails
 */
const cleanupLogSchema = new mongoose.Schema({
    // Basic information
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true // Index for efficient querying by date
    },
    
    // Cleanup method used
    method: {
        type: String,
        enum: ['hybrid', 'discord', 'database', 'manual'],
        default: 'hybrid',
        required: true
    },
    
    // Cleanup statistics
    stats: {
        messageLogs: {
            type: Number,
            default: 0,
            min: 0
        },
        metadataLogs: {
            type: Number,
            default: 0,
            min: 0
        },
        auditLogs: {
            type: Number,
            default: 0,
            min: 0
        },
        analyticsData: {
            type: Number,
            default: 0,
            min: 0
        },
        errors: {
            type: Number,
            default: 0,
            min: 0
        },
        retriedFailures: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Total entries cleaned
    totalDeleted: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    
    // Retention policies used during cleanup
    retentionPolicies: {
        fullContent: {
            type: Number,
            required: true
        },
        metadata: {
            type: Number,
            required: true
        },
        auditLogs: {
            type: Number,
            required: true
        },
        analytics: {
            type: Number,
            required: true
        }
    },
    
    // Cleanup duration and performance metrics
    performance: {
        duration: {
            type: Number, // Duration in milliseconds
            default: 0
        },
        channelsProcessed: {
            type: Number,
            default: 0
        },
        apiCalls: {
            type: Number,
            default: 0
        },
        rateLimitHits: {
            type: Number,
            default: 0
        }
    },
    
    // Error details (if any)
    errorDetails: [{
        errorType: {
            type: String,
            enum: ['discord_api', 'database', 'permission', 'network', 'other'],
            required: true
        },
        errorMessage: {
            type: String,
            required: true
        },
        channelId: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Server information
    serverInfo: {
        guildId: {
            type: String,
            required: true,
            index: true
        },
        guildName: String,
        botVersion: String
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'cleanupLogs',
    suppressReservedKeysWarning: true // Suppress reserved key warnings
});

/**
 * Schema for tracking failed deletions that need retry
 */
const failedDeletionSchema = new mongoose.Schema({
    // Channel information
    channelId: {
        type: String,
        required: true,
        index: true
    },
    
    channelName: {
        type: String,
        required: true
    },
    
    // Failed message IDs
    messageIds: [{
        type: String,
        required: true
    }],
    
    // Log type
    logType: {
        type: String,
        enum: ['messageLogs', 'metadataLogs', 'auditLogs', 'analyticsData'],
        required: true
    },
    
    // Retry tracking
    retryCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 10 // Prevent infinite retries
    },
    
    // Failure reason
    failureReason: {
        type: String,
        enum: ['permission_denied', 'message_not_found', 'rate_limit', 'network_error', 'unknown'],
        required: true
    },
    
    // Timestamps
    firstFailed: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    lastRetry: {
        type: Date,
        default: Date.now
    },
    
    // Resolution
    resolved: {
        type: Boolean,
        default: false,
        index: true
    },
    
    resolvedAt: Date,
    
    // Server information
    serverInfo: {
        guildId: {
            type: String,
            required: true,
            index: true
        },
        guildName: String
    }
}, {
    timestamps: true,
    collection: 'failedDeletions',
    suppressReservedKeysWarning: true
});

/**
 * Schema for analytics data (if collected)
 */
const analyticsDataSchema = new mongoose.Schema({
    // Event information
    eventType: {
        type: String,
        enum: ['message_log', 'member_log', 'server_log', 'voice_log', 'cleanup'],
        required: true,
        index: true
    },
    
    // Anonymized user data
    user: {
        anonymizedId: String, // Hashed user ID
        username: String, // Keep username for analytics
        isBot: Boolean
    },
    
    // Channel information
    channel: {
        id: String,
        name: String,
        type: String
    },
    
    // Event data (no personal content)
    eventData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    
    // Server information
    serverInfo: {
        guildId: {
            type: String,
            required: true,
            index: true
        },
        guildName: String
    },
    
    // Data processing flags
    processed: {
        piiRedacted: {
            type: Boolean,
            default: false
        },
        contentSanitized: {
            type: Boolean,
            default: false
        },
        anonymized: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    collection: 'analyticsData',
    suppressReservedKeysWarning: true
});

/**
 * Schema for retention policy configuration
 */
const retentionPolicySchema = new mongoose.Schema({
    // Policy name
    name: {
        type: String,
        required: true,
        unique: true
    },
    
    // Policy configuration
    policies: {
        fullContent: {
            type: Number,
            default: 30,
            min: 1,
            max: 365
        },
        metadata: {
            type: Number,
            default: 365,
            min: 1,
            max: 2555 // 7 years
        },
        auditLogs: {
            type: Number,
            default: 2555, // 7 years
            min: 365,
            max: 3650 // 10 years max
        },
        analytics: {
            type: Number,
            default: 90,
            min: 1,
            max: 365
        }
    },
    
    // Policy metadata
    description: String,
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Last updated
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    
    // Updated by
    updatedBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    collection: 'retentionPolicies',
    suppressReservedKeysWarning: true
});

// Create indexes for efficient querying
cleanupLogSchema.index({ timestamp: -1, 'serverInfo.guildId': 1 }); // Most recent first, by guild
cleanupLogSchema.index({ method: 1, timestamp: -1 }); // By method and time
failedDeletionSchema.index({ resolved: 1, retryCount: 1, firstFailed: 1 }); // For retry queries
failedDeletionSchema.index({ 'serverInfo.guildId': 1, resolved: 1 }); // By guild and resolution
analyticsDataSchema.index({ timestamp: -1, eventType: 1 }); // Time and type queries
analyticsDataSchema.index({ 'serverInfo.guildId': 1, timestamp: -1 }); // By guild and time

// Create models
const CleanupLog = mongoose.model('CleanupLog', cleanupLogSchema);
const FailedDeletion = mongoose.model('FailedDeletion', failedDeletionSchema);
const AnalyticsData = mongoose.model('AnalyticsData', analyticsDataSchema);
const RetentionPolicy = mongoose.model('RetentionPolicy', retentionPolicySchema);

module.exports = {
    CleanupLog,
    FailedDeletion,
    AnalyticsData,
    RetentionPolicy,
    cleanupLogSchema,
    failedDeletionSchema,
    analyticsDataSchema,
    retentionPolicySchema
};
