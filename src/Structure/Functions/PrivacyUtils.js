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

class PrivacyUtils {
    constructor() {
        this.privacyConfig = config.logging?.privacyControls || {};
        this.piiPatterns = this.privacyConfig.piiPatterns || {};
        this.sanitizationConfig = this.privacyConfig.sanitization || {};
    }

    /**
     * Redact PII from content based on configured patterns
     * @param {string} content - Content to redact
     * @param {boolean} enabled - Whether PII redaction is enabled
     * @returns {string} - Redacted content
     */
    redactPII(content, enabled = true) {
        if (!enabled || !content || typeof content !== 'string') {
            return content;
        }

        let redactedContent = content;

        // Email addresses
        if (this.piiPatterns.email) {
            redactedContent = redactedContent.replace(this.piiPatterns.email, '[EMAIL]');
        }

        // Phone numbers
        if (this.piiPatterns.phone) {
            redactedContent = redactedContent.replace(this.piiPatterns.phone, '[PHONE]');
        }

        // Social Security Numbers
        if (this.piiPatterns.ssn) {
            redactedContent = redactedContent.replace(this.piiPatterns.ssn, '[SSN]');
        }

        // Credit Card Numbers
        if (this.piiPatterns.creditCard) {
            redactedContent = redactedContent.replace(this.piiPatterns.creditCard, '[PAYMENT_INFO]');
        }

        // IP Addresses
        if (this.piiPatterns.ipAddress) {
            redactedContent = redactedContent.replace(this.piiPatterns.ipAddress, '[IP_ADDRESS]');
        }

        return redactedContent;
    }

    /**
     * Sanitize content by removing suspicious patterns and links
     * @param {string} content - Content to sanitize
     * @param {boolean} enabled - Whether sanitization is enabled
     * @returns {string} - Sanitized content
     */
    sanitizeContent(content, enabled = true) {
        if (!enabled || !content || typeof content !== 'string') {
            return content;
        }

        let sanitizedContent = content;

        // Remove executable links if enabled
        if (this.sanitizationConfig.removeExecutableLinks) {
            // Remove suspicious file extensions
            sanitizedContent = sanitizedContent.replace(/\.(exe|bat|cmd|scr|pif|com|js|jar|app|deb|rpm|msi|dmg)/gi, '[FILE_REMOVED]');
            
            // Remove suspicious URL patterns
            sanitizedContent = sanitizedContent.replace(/https?:\/\/[^\s]*(?:\.exe|\.bat|\.cmd|\.scr|\.pif|\.com|\.js|\.jar)/gi, '[SUSPICIOUS_LINK_REMOVED]');
        }

        // Remove suspicious patterns if enabled
        if (this.sanitizationConfig.removeSuspiciousPatterns) {
            // Remove potential command injections
            sanitizedContent = sanitizedContent.replace(/[;&|`$(){}[\]]/g, '');
            
            // Remove potential SQL injection patterns
            sanitizedContent = sanitizedContent.replace(/(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi, '[PATTERN_REMOVED]');
        }

        // Truncate content if too long
        const maxLength = this.sanitizationConfig.maxContentLength || 2000;
        if (sanitizedContent.length > maxLength) {
            sanitizedContent = sanitizedContent.substring(0, maxLength - 3) + '...';
        }

        return sanitizedContent;
    }

    /**
     * Process message content with privacy controls
     * @param {string} content - Original content
     * @param {Object} options - Processing options
     * @returns {Object} - Processed content with metadata
     */
    processMessageContent(content, options = {}) {
        const {
            redactPII = config.logging?.piiRedaction ?? true,
            sanitizeContent = config.logging?.contentSanitization ?? true,
            fullContentLogging = config.logging?.fullContentLogging ?? false
        } = options;

        // If full content logging is disabled, return metadata only
        if (!fullContentLogging) {
            return {
                content: '[CONTENT_REDACTED_FOR_PRIVACY]',
                originalLength: content?.length || 0,
                hasContent: !!content,
                redacted: true,
                reason: 'Full content logging disabled'
            };
        }

        // Process content with privacy controls
        let processedContent = content || '*No content*';
        const originalLength = processedContent.length;
        let wasRedacted = false;
        let wasSanitized = false;

        // Apply PII redaction
        const redactedContent = this.redactPII(processedContent, redactPII);
        if (redactedContent !== processedContent) {
            wasRedacted = true;
            processedContent = redactedContent;
        }

        // Apply content sanitization
        const sanitizedContent = this.sanitizeContent(processedContent, sanitizeContent);
        if (sanitizedContent !== processedContent) {
            wasSanitized = true;
            processedContent = sanitizedContent;
        }

        return {
            content: processedContent,
            originalLength,
            hasContent: !!content,
            redacted: wasRedacted,
            sanitized: wasSanitized,
            reason: wasRedacted || wasSanitized ? 'Privacy controls applied' : 'No processing needed'
        };
    }

    /**
     * Anonymize user data for analytics
     * @param {Object} userData - User data to anonymize
     * @param {boolean} enabled - Whether anonymization is enabled
     * @returns {Object} - Anonymized user data
     */
    anonymizeUserData(userData, enabled = true) {
        if (!enabled || !userData) {
            return userData;
        }

        const anonymized = { ...userData };

        // Anonymize user ID
        if (anonymized.id) {
            anonymized.id = this.hashUserId(anonymized.id);
        }

        // Remove or anonymize sensitive fields
        delete anonymized.email;
        delete anonymized.phone;
        delete anonymized.ip;
        
        // Keep only essential non-personal data for analytics
        const allowedFields = ['id', 'username', 'discriminator', 'avatar', 'createdAt', 'bot'];
        const filtered = {};
        
        for (const field of allowedFields) {
            if (anonymized[field] !== undefined) {
                filtered[field] = anonymized[field];
            }
        }

        return filtered;
    }

    /**
     * Create a hash of user ID for anonymization
     * @param {string} userId - User ID to hash
     * @returns {string} - Hashed user ID
     */
    hashUserId(userId) {
        // Simple hash function for anonymization
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `anon_${Math.abs(hash).toString(36)}`;
    }

    /**
     * Check if content should be logged based on privacy settings
     * @param {string} channelId - Channel ID
     * @param {string} channelType - Type of channel
     * @returns {boolean} - Whether content should be logged
     */
    shouldLogContent(channelId, channelType = 'text') {
        // Don't log in private channels unless explicitly allowed
        if (channelType === 'DM' || channelType === 'GROUP_DM') {
            return false;
        }

        // Check if full content logging is enabled
        if (!config.logging?.fullContentLogging) {
            return false;
        }

        // Additional checks can be added here for specific channels
        return true;
    }

    /**
     * Get retention date for data type
     * @param {string} dataType - Type of data (fullContent, metadata, auditLogs)
     * @returns {Date} - Date when data should be deleted
     */
    getRetentionDate(dataType) {
        const retentionDays = config.logging?.retentionDays || {};
        const days = retentionDays[dataType] || retentionDays.metadata || 365;
        
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - days);
        
        return retentionDate;
    }

    /**
     * Check if data should be retained based on creation date
     * @param {Date} createdAt - Creation date of data
     * @param {string} dataType - Type of data
     * @returns {boolean} - Whether data should be retained
     */
    shouldRetainData(createdAt, dataType) {
        const retentionDate = this.getRetentionDate(dataType);
        return new Date(createdAt) > retentionDate;
    }
}

module.exports = { PrivacyUtils };
