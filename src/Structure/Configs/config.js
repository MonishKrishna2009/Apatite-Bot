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

/*
 * ================================================================================
 * CONFIGURATION FILE - APATITE BOT
 * ================================================================================
 * 
 * This file contains all configuration options for the Apatite Bot.
 * 
 * IMPORTANT PRIVACY NOTICE:
 * This bot includes comprehensive privacy controls for GDPR/CCPA compliance.
 * Review the logging.privacyControls section carefully before enabling features.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Copy .env.example to .env and fill in your values
 * 2. Review privacy settings in the logging section
 * 3. Configure channel IDs for your Discord server
 * 4. Test in a development environment first
 * 
 * PRIVACY COMPLIANCE:
 * - Full content logging is DISABLED by default
 * - PII redaction is ENABLED by default
 * - Automatic data cleanup runs every 24 hours
 * - Retention periods are configured for compliance
 * 
 * For detailed documentation, see: GitAssets/docs/Logging-System.md
 * ================================================================================
 */

const env = require('dotenv');
env.config();

module.exports = {
    // ============================================================================
    // BASIC BOT CONFIGURATION
    // ============================================================================
    
    // Discord Bot Token - Required for bot authentication
    // Get this from https://discord.com/developers/applications
    Token: process.env.TOKEN,
    
    // Default command prefix for text commands (slash commands work regardless)
    // Example: !help, !ping, etc.
    DefaultPrefix: "!",
    
    // MongoDB connection string for database storage
    // Format: mongodb://username:password@host:port/database
    mongoUrl: process.env.MONGO_URI,
    
    // Discord Application Client ID - Required for OAuth and slash commands
    clientID: process.env.CLIENT_ID,
    
    // Discord Application Client Secret - Required for OAuth flows
    clientSecret: process.env.CLIENT_SECRET,
    
    // Webhook URL for external logging (optional)
    // Used to send logs to external services like Discord webhooks
    logWebhook: process.env.LOG_WEBHOOK,
    
    // Development mode - enables additional debugging and testing features
    underDevelopment: true,
    
    // Automatically deploy slash commands when bot starts
    // Set to false if you want to deploy commands manually
    deploySlashOnReady: true,

    // ============================================================================
    // TICKET SYSTEM CONFIGURATION
    // ============================================================================
    
    // Enable/disable the ticket system
    ticketSystem: true,
    
    // Channel where ticket creation/deletion logs are sent
    ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID,
    
    // Channel where ticket dashboard is displayed
    ticketDashChannelId: process.env.TICKET_DASH_CHANNEL_ID,
    
    // Role ID that can manage tickets (support staff)
    ticketSupportRoleId: process.env.TICKET_SUPPORT_ROLE_ID, 
    
    // Channel where ticket transcripts are stored
    ticketTranscriptChannelId: process.env.TICKET_TRANSCRIPT_CHANNEL_ID, 
    
    // Category ID where ticket channels are created
    ticketCategoryId: process.env.TICKET_CATEGORY, 

    // ============================================================================
    // LOGGING SYSTEM CONFIGURATION
    // ============================================================================
    
    logging: {
        // Enable/disable the entire logging system
        enabled: true,
        
        // ========================================================================
        // PRIVACY CONTROLS - CRITICAL FOR COMPLIANCE
        // ========================================================================
        
        // Full message content logging - DISABLED BY DEFAULT FOR PRIVACY
        // ⚠️  WARNING: Enabling this logs complete message content including PII
        // ⚠️  Only enable if you have explicit user consent and comply with GDPR/CCPA
        // ⚠️  This setting affects all message-related logs (delete, edit, bulk delete)
        fullContentLogging: false,
        
        // Data retention periods (in days)
        // These determine how long different types of data are kept before automatic deletion
        retentionDays: {
            fullContent: 30,      // Full message content - shortest retention for privacy
            metadata: 365,        // Event metadata (who, when, where) - 1 year
            auditLogs: 2555       // Audit logs - 7 years for compliance requirements
        },
        
        // IMPORTANT: Zero-day retention is supported - use 0 for immediate deletion
        // The DataCleanupManager uses nullish coalescing (??) instead of logical OR (||)
        // This means explicit 0 values are honored, not treated as falsy defaults
        
        // ========================================================================
        // DATA PROTECTION SETTINGS
        // ========================================================================
        
        // Automatically redact PII (Personally Identifiable Information)
        // Removes emails, phone numbers, SSNs, credit cards, IP addresses
        piiRedaction: true,
        
        // Sanitize content by removing suspicious patterns and executable links
        // Helps prevent security issues and removes potentially harmful content
        contentSanitization: true,
        
        // Anonymize user data in analytics and reports
        // Replaces user IDs with hashed versions for privacy
        anonymizeAnalytics: true,
        
        // ========================================================================
        // LOG CHANNEL CONFIGURATION
        // ========================================================================
        
        // Channel IDs for different types of logs - set these in your .env file
        serverLogChannelId: process.env.SERVER_LOG_CHANNEL_ID,     // Server events (channels, roles)
        memberLogChannelId: process.env.MEMBER_LOG_CHANNEL_ID,     // Member events (join, leave, updates)
        voiceLogChannelId: process.env.VOICE_LOG_CHANNEL_ID,       // Voice channel activity
        messageLogChannelId: process.env.MESSAGE_LOG_CHANNEL_ID,   // Message events (delete, edit, bulk)
        
        // ========================================================================
        // ADVANCED PRIVACY CONTROLS - EXPERT SETTINGS
        // ========================================================================
        
        privacyControls: {
            // ====================================================================
            // PII REDACTION PATTERNS
            // ====================================================================
            // Regular expressions used to identify and redact sensitive information
            // You can modify these patterns or add new ones as needed
            piiPatterns: {
                email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,                    // Email addresses
                phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,  // US phone numbers
                ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,                                              // Social Security Numbers
                creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,                                   // Credit card numbers
                ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g                                     // IP addresses
            },
            
            // ====================================================================
            // CONTENT SANITIZATION SETTINGS
            // ====================================================================
            sanitization: {
                // Remove potentially dangerous file extensions and links
                removeExecutableLinks: true,
                
                // Remove suspicious patterns that might indicate injection attempts
                removeSuspiciousPatterns: true,
                
                // Maximum content length before truncation (Discord embed limit)
                maxContentLength: 2000,
                
                // Domains that are allowed in links (others may be flagged)
                allowedDomains: ['discord.com', 'discordapp.com', 'github.com']
            },
            
            // ====================================================================
            // ANALYTICS PRIVACY SETTINGS
            // ====================================================================
            analytics: {
                // Replace user IDs with anonymized versions in analytics
                anonymizeUserIds: true,
                
                // Only store aggregate data, never individual user data
                aggregateDataOnly: true,
                
                // How long to keep analytics data (days)
                retentionDays: 90,
                
                // Exclude private channels from analytics collection
                excludePersonalChannels: true
            },
            
            // ====================================================================
            // USER RIGHTS (GDPR/CCPA COMPLIANCE)
            // ====================================================================
            userRights: {
                // Allow users to request deletion of their data
                enableDataDeletion: true,
                
                // Allow users to request a copy of their data (data portability)
                enableDataPortability: true,
                
                // Allow users to request information about their stored data
                enableAccessRequests: true,
                
                // Maximum days to respond to user rights requests (legal requirement)
                responseTimeDays: 30
            }
        }
    },

    // ============================================================================
    // LOOKING FOR PLAYER/TEAM (LFP/LFT) SYSTEM CONFIGURATION
    // ============================================================================
    
    // Enable/disable the Looking For Player/Team system
    lfpLftSystem: true,
    
    // Role ID that can moderate LFP/LFT requests (approve/decline)
    lfplftModroleId: process.env.LF_MOD_ROLE_ID,
    
    // Channel where LFP/LFT action logs are sent
    lfActionLogChannelId: process.env.LF_ACTION_LOG_CHANNEL_ID,
    
    // Maximum number of active requests a user can have at once
    MaxActiveRequest: 5,
    
    // Days after which requests automatically expire
    RequestExpiryDays: 7,
    
    // Days after which expired requests are moved to archive
    RequestArchiveDays: 30,
    
    // Days after which soft-deleted requests (archived, expired, cancelled) are permanently deleted
    RequestDeleteDays: 60,
    
    // ============================================================================
    // RATE LIMITING CONFIGURATION
    // ============================================================================
    
    // Rate limiting prevents abuse by limiting how often users can perform actions
    // Each limit specifies: maxRequests = how many actions, windowMs = time window in milliseconds
    rateLimits: {
        // Rate limit for creating new requests
        create: {
            maxRequests: 3,       // Maximum 3 requests
            windowMs: 300000      // Within 5 minutes (300,000 ms)
        },
        
        // Rate limit for editing existing requests
        edit: {
            maxRequests: 5,       // Maximum 5 edits
            windowMs: 60000       // Within 1 minute (60,000 ms)
        },
        
        // Rate limit for cancelling requests
        cancel: {
            maxRequests: 10,      // Maximum 10 cancellations
            windowMs: 300000      // Within 5 minutes (300,000 ms)
        },
        
        // Default rate limit for other actions
        default: {
            maxRequests: 5,       // Maximum 5 actions
            windowMs: 300000      // Within 5 minutes (300,000 ms)
        }
    },


    // ============================================================================
    // ADMINISTRATIVE CONFIGURATION
    // ============================================================================
    
    // Bot administrators and developers with elevated permissions
    // These users can access admin commands and debug features
    developers: [
        {
            name: "Monk",                                    // Display name
            id: "1156911026164482078",                      // Discord user ID
        }
        // Add more developers here as needed
    ],
    
    // Development guilds for testing commands and features
    // Commands are deployed to these guilds immediately (no global deployment delay)
    devGuilds: [
        {
          name: "Apatite",                                  // Display name
          id: "1420309277699997738",                        // Discord guild ID
        }
        // Add more development guilds here as needed
      ],
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

const { validateConfig } = require('../Functions/ConfigValidator');

// Validate configuration on startup
validateConfig(module.exports);