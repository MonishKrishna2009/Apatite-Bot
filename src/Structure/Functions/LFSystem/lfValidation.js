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
const modalHandler = require("./modalHandler");
const { STATUS, isValidStatus, normalizeStatus } = require("./lfHelpers");
const config = require("../../Configs/config");

/**
 * Validation result class
 */
class ValidationResult {
    constructor(isValid = true, errors = [], warnings = []) {
        this.isValid = isValid;
        this.errors = errors;
        this.warnings = warnings;
    }

    addError(message) {
        this.errors.push(message);
        this.isValid = false;
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    hasWarnings() {
        return this.warnings.length > 0;
    }
}

/**
 * Validate Discord user ID format
 * @param {string} userId - User ID to validate
 * @returns {boolean} - Whether ID is valid
 */
function validateUserId(userId) {
    if (!userId || typeof userId !== 'string') return false;
    return /^\d{17,19}$/.test(userId);
}

/**
 * Validate Discord guild ID format
 * @param {string} guildId - Guild ID to validate
 * @returns {boolean} - Whether ID is valid
 */
function validateGuildId(guildId) {
    if (!guildId || typeof guildId !== 'string') return false;
    return /^\d{17,19}$/.test(guildId);
}

/**
 * Validate Discord message ID format
 * @param {string} messageId - Message ID to validate
 * @returns {boolean} - Whether ID is valid
 */
function validateMessageId(messageId) {
    if (!messageId) return true; // Null/undefined is valid
    if (typeof messageId !== 'string') return false;
    return /^\d{17,19}$/.test(messageId);
}

/**
 * Validate game configuration
 * @param {string} gameType - LFP or LFT
 * @param {string} game - Game key
 * @returns {ValidationResult} - Validation result
 */
function validateGameConfig(gameType, game) {
    const result = new ValidationResult();

    if (!gameType || !['lfp', 'lft'].includes(gameType.toLowerCase())) {
        result.addError(`Invalid game type: ${gameType}`);
        return result;
    }

    if (!game || typeof game !== 'string') {
        result.addError('Game is required');
        return result;
    }

    const gameConfig = modalHandler.getGameConfig(gameType, game);
    if (!gameConfig) {
        result.addError(`Game '${game}' not found in ${gameType.toUpperCase()} configuration`);
        return result;
    }

    // Validate channels exist
    if (!validateMessageId(gameConfig.reviewChannel)) {
        result.addError(`Invalid review channel ID for game '${game}'`);
    }

    if (!validateMessageId(gameConfig.publicChannel)) {
        result.addError(`Invalid public channel ID for game '${game}'`);
    }

    // Validate fields configuration
    if (!gameConfig.fields || !Array.isArray(gameConfig.fields)) {
        result.addError(`Invalid fields configuration for game '${game}'`);
    } else {
        const fieldIds = new Set();
        for (const field of gameConfig.fields) {
            if (!field.id || typeof field.id !== 'string') {
                result.addError(`Invalid field ID in game '${game}' configuration`);
                continue;
            }

            if (fieldIds.has(field.id)) {
                result.addError(`Duplicate field ID '${field.id}' in game '${game}' configuration`);
            }
            fieldIds.add(field.id);

            if (field.required && !field.label) {
                result.addError(`Required field '${field.id}' missing label in game '${game}' configuration`);
            }

            if (field.maxLength && (typeof field.maxLength !== 'number' || field.maxLength <= 0)) {
                result.addError(`Invalid maxLength for field '${field.id}' in game '${game}' configuration`);
            }
        }
    }

    return result;
}

/**
 * Validate request content against game configuration
 * @param {Object} content - Request content
 * @param {string} gameType - LFP or LFT
 * @param {string} game - Game key
 * @returns {ValidationResult} - Validation result
 */
function validateRequestContent(content, gameType, game) {
    const result = new ValidationResult();

    if (!content || typeof content !== 'object') {
        result.addError('Content is required and must be an object');
        return result;
    }

    const gameConfig = modalHandler.getGameConfig(gameType, game);
    if (!gameConfig) {
        result.addError(`Game configuration not found for '${game}'`);
        return result;
    }

    // Check required fields
    for (const field of gameConfig.fields) {
        if (field.required && (!content[field.id] || content[field.id].trim() === '')) {
            result.addError(`Required field '${field.label || field.id}' is missing or empty`);
        }
    }

    // Check field lengths
    for (const field of gameConfig.fields) {
        if (content[field.id] && field.maxLength) {
            if (content[field.id].length > field.maxLength) {
                result.addError(`Field '${field.label || field.id}' exceeds maximum length of ${field.maxLength} characters`);
            }
        }
    }

    // Check for unexpected fields
    const validFieldIds = new Set(gameConfig.fields.map(f => f.id));
    for (const fieldId of Object.keys(content)) {
        if (!validFieldIds.has(fieldId)) {
            result.addWarning(`Unexpected field '${fieldId}' in content`);
        }
    }

    return result;
}

/**
 * Validate Discord message size limits
 * @param {string} content - Message content to validate
 * @param {Array} embeds - Array of embeds to validate
 * @returns {ValidationResult} - Validation result
 */
function validateMessageLimits(content = "", embeds = []) {
    const result = new ValidationResult();

    // Check content length
    if (content && content.length > 2000) {
        result.addError(`Message content exceeds 2000 character limit (${content.length} characters)`);
    }

    // Check total embed count
    if (embeds.length > 10) {
        result.addError(`Too many embeds (${embeds.length}/10 maximum)`);
    }

    // Validate each embed
    for (let i = 0; i < embeds.length; i++) {
        const embedResult = validateEmbedLimits(embeds[i]);
        if (!embedResult.isValid) {
            result.addError(`Embed ${i + 1}: ${embedResult.errors.join(', ')}`);
        }
        if (embedResult.hasWarnings()) {
            result.addWarning(`Embed ${i + 1}: ${embedResult.warnings.join(', ')}`);
        }
    }

    // Check total message size (approximate)
    const totalSize = content.length + embeds.reduce((total, embed) => {
        const data = embed.data;
        return total + 
            (data.title?.length || 0) + 
            (data.description?.length || 0) + 
            (data.footer?.text?.length || 0) +
            (data.fields?.reduce((fieldTotal, field) => fieldTotal + (field.name?.length || 0) + (field.value?.length || 0), 0) || 0);
    }, 0);

    if (totalSize > 6000) {
        result.addWarning(`Total message size is quite large (${totalSize} characters). Discord may truncate very long messages.`);
    }

    return result;
}

/**
 * Validate embed field limits
 * @param {EmbedBuilder} embed - Embed to validate
 * @returns {ValidationResult} - Validation result
 */
function validateEmbedLimits(embed) {
    const result = new ValidationResult();

    const data = embed.data;

    // Check title length
    if (data.title && data.title.length > 256) {
        result.addError(`Embed title exceeds 256 character limit (${data.title.length} characters)`);
    }

    // Check description length
    if (data.description && data.description.length > 4096) {
        result.addError(`Embed description exceeds 4096 character limit (${data.description.length} characters)`);
    }

    // Check footer text length
    if (data.footer?.text && data.footer.text.length > 2048) {
        result.addError(`Embed footer text exceeds 2048 character limit (${data.footer.text.length} characters)`);
    }

    // Check author name length
    if (data.author?.name && data.author.name.length > 256) {
        result.addError(`Embed author name exceeds 256 character limit (${data.author.name.length} characters)`);
    }

    // Check field count
    if (data.fields && data.fields.length > 25) {
        result.addError(`Embed has too many fields (${data.fields.length}/25 maximum)`);
    }

    // Check individual field limits
    if (data.fields) {
        for (let i = 0; i < data.fields.length; i++) {
            const field = data.fields[i];

            if (field.name && field.name.length > 256) {
                result.addError(`Field ${i + 1} name exceeds 256 character limit (${field.name.length} characters)`);
            }

            if (field.value && field.value.length > 1024) {
                result.addError(`Field ${i + 1} value exceeds 1024 character limit (${field.value.length} characters)`);
            }
        }
    }

    return result;
}

/**
 * Validate channel existence and permissions
 * @param {Object} guild - Discord guild object
 * @param {string} channelId - Channel ID to validate
 * @param {Array} requiredPermissions - Required permissions for bot
 * @returns {ValidationResult} - Validation result
 */
async function validateChannelAccess(guild, channelId, requiredPermissions = ['ViewChannel', 'SendMessages']) {
    const result = new ValidationResult();

    if (!guild) {
        result.addError('Guild is required');
        return result;
    }

    if (!validateMessageId(channelId)) {
        result.addError(`Invalid channel ID: ${channelId}`);
        return result;
    }

    try {
        const channel = await guild.channels.fetch(channelId);
        if (!channel) {
            result.addError(`Channel ${channelId} not found`);
            return result;
        }

        // Check bot permissions
        const botMember = guild.members.me;
        if (!botMember) {
            result.addError('Bot member not found in guild');
            return result;
        }

        const permissions = channel.permissionsFor(botMember);
        for (const permission of requiredPermissions) {
            if (!permissions.has(permission)) {
                result.addError(`Bot missing permission '${permission}' in channel ${channel.name}`);
            }
        }

    } catch (error) {
        result.addError(`Error validating channel ${channelId}: ${error.message}`);
    }

    return result;
}

/**
 * Validate user existence in guild
 * @param {Object} guild - Discord guild object
 * @param {string} userId - User ID to validate
 * @returns {ValidationResult} - Validation result
 */
async function validateUserInGuild(guild, userId) {
    const result = new ValidationResult();

    if (!guild) {
        result.addError('Guild is required');
        return result;
    }

    if (!validateUserId(userId)) {
        result.addError(`Invalid user ID: ${userId}`);
        return result;
    }

    try {
        const member = await guild.members.fetch(userId);
        if (!member) {
            result.addError(`User ${userId} not found in guild`);
        }
    } catch (error) {
        if (error.code === 10007) { // Unknown member
            result.addError(`User ${userId} not found in guild`);
        } else {
            result.addError(`Error validating user ${userId}: ${error.message}`);
        }
    }

    return result;
}

/**
 * Validate configuration completeness
 * @returns {ValidationResult} - Validation result
 */
function validateSystemConfig() {
    const result = new ValidationResult();

    // Check if LFP/LFT system is enabled
    if (!config.lfpLftSystem) {
        result.addWarning('LFP/LFT system is disabled in configuration');
    }

    // Check required configuration values
    if (!config.lfplftModroleId) {
        result.addError('LFP/LFT mod role ID not configured');
    }

    if (!config.lfActionLogChannelId) {
        result.addError('LF action log channel ID not configured');
    }

    // Check numeric configuration values
    if (typeof config.MaxActiveRequest !== 'number' || config.MaxActiveRequest <= 0) {
        result.addError('MaxActiveRequest must be a positive number');
    }

    if (typeof config.RequestExpiryDays !== 'number' || config.RequestExpiryDays <= 0) {
        result.addError('RequestExpiryDays must be a positive number');
    }

    if (typeof config.RequestArchiveDays !== 'number' || config.RequestArchiveDays <= 0) {
        result.addError('RequestArchiveDays must be a positive number');
    }

    if (typeof config.RequestDeleteDays !== 'number' || config.RequestDeleteDays <= 0) {
        result.addError('RequestDeleteDays must be a positive number');
    }

    // Validate date relationships
    if (config.RequestDeleteDays <= config.RequestArchiveDays) {
        result.addWarning('RequestDeleteDays should be greater than RequestArchiveDays for proper lifecycle management');
    }

    return result;
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    return input
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/```/g, '') // Remove code blocks
        .replace(/`/g, '') // Remove inline code
        .replace(/\*\*/g, '') // Remove bold formatting
        .replace(/\*/g, '') // Remove italic formatting
        .replace(/__/g, '') // Remove underline formatting
        .replace(/_/g, '') // Remove underscore formatting
        .replace(/~~/g, '') // Remove strikethrough formatting
        .replace(/\|\|/g, '') // Remove spoiler formatting
        .trim();
}

/**
 * Validate and sanitize request content
 * @param {Object} content - Request content
 * @param {string} gameType - LFP or LFT
 * @param {string} game - Game key
 * @returns {Object} - Sanitized content and validation result
 */
function validateAndSanitizeContent(content, gameType, game) {
    const validationResult = validateRequestContent(content, gameType, game);
    
    if (!validationResult.isValid) {
        return { content: null, validationResult };
    }

    const sanitizedContent = {};
    for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string') {
            sanitizedContent[key] = sanitizeInput(value);
        } else {
            sanitizedContent[key] = value;
        }
    }

    return { content: sanitizedContent, validationResult };
}

module.exports = {
    ValidationResult,
    validateUserId,
    validateGuildId,
    validateMessageId,
    validateGameConfig,
    validateRequestContent,
    validateMessageLimits,
    validateEmbedLimits,
    validateChannelAccess,
    validateUserInGuild,
    validateSystemConfig,
    sanitizeInput,
    validateAndSanitizeContent
};
