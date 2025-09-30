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
    return /^\d{17,20}$/.test(userId);
}

/**
 * Determine whether a string is a valid Discord guild ID.
 * @param {string} guildId - The guild ID to validate.
 * @returns {boolean} `true` if the value is a string of 17 to 20 digits, `false` otherwise.
 */
function validateGuildId(guildId) {
    if (!guildId || typeof guildId !== 'string') return false;
    return /^\d{17,20}$/.test(guildId);
}

/**
 * Strict snowflake validator that requires a valid 17-20 digit snowflake string.
 * @param {string} snowflake - Snowflake ID to validate.
 * @returns {boolean} `true` if the value is a string of 17–20 digits, `false` otherwise.
 */
function validateStrictSnowflake(snowflake) {
    if (!snowflake || typeof snowflake !== 'string') return false;
    return /^\d{17,20}$/.test(snowflake);
}

/**
 * Validate Discord channel ID format (strict - no null/undefined allowed).
 * @param {string} channelId - Channel ID to validate.
 * @returns {boolean} `true` if the value is a string of 17–20 digits, `false` otherwise.
 */
function validateChannelId(channelId) {
    return validateStrictSnowflake(channelId);
}

/**
 * Checks whether a Discord message ID is either absent or a valid 17–20 digit snowflake.
 * @param {string|null|undefined} messageId - Message ID to validate; null or undefined is treated as valid.
 * @returns {boolean} `true` if `messageId` is null/undefined or a string of 17–20 digits, `false` otherwise.
 */
function validateMessageId(messageId) {
    if (messageId == null) return true; // Null/undefined is valid
    if (messageId === '') return false; // Empty string is invalid
    if (typeof messageId !== 'string') return false;
    return /^\d{17,20}$/.test(messageId);
}

/**
 * Ensure a game's configuration for the specified LFP/LFT type is present and structurally valid.
 * @param {string} gameType - 'lfp' or 'lft' (case-insensitive) identifying which configuration set to check.
 * @param {string} game - Key of the game to validate within the selected configuration.
 * @returns {ValidationResult} ValidationResult containing any configuration errors or warnings. 
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
    if (!validateChannelId(gameConfig.reviewChannel)) {
        result.addError(`Invalid review channel ID for game '${game}'`);
    }

    if (!validateChannelId(gameConfig.publicChannel)) {
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
 * Validate form-like request content against the game's configured fields.
 * 
 * @param {Object} content - Key/value map of submitted field values (string values expected).
 * @param {string} gameType - Game configuration type (e.g., "LFP" or "LFT").
 * @param {string} game - Game key identifying which game configuration to use.
 * @returns {ValidationResult} ValidationResult containing any errors (missing or overlong required fields, unknown game config) and warnings (unexpected fields).
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
    if (!Array.isArray(gameConfig.fields)) {
        result.addError(`gameConfig.fields must be an array`);
        return result;
    }
    
    for (const field of gameConfig.fields) {
        if (field.required) {
            const val = content[field.id];
            const isMissing = val === null || val === undefined;
            const isEmpty = !isMissing && (
                typeof val === 'string' ? val.trim() === '' :
                typeof val === 'object' ? (Array.isArray(val) ? val.length === 0 : false) :
                String(val).trim() === ''
            );
            
            if (isMissing || isEmpty) {
                result.addError(`Required field '${field.label || field.id}' is missing or empty`);
            }
        }
    }

    // Check field lengths
    for (const field of gameConfig.fields) {
        const val = content[field.id];
        if (val !== null && val !== undefined && field.maxLength) {
            const length = typeof val === 'string' ? val.length :
                          Array.isArray(val) ? val.length :
                          String(val).length;
            
            if (length > field.maxLength) {
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
 * Validate a message's content and embeds against Discord size and embed limits.
 *
 * Checks content length, total embed count, per-embed field limits, and an approximate overall message size.
 * @param {string} content - Message content to validate (defaults to empty string).
 * @param {Array} embeds - Array of embed-like objects to validate; each embed is expected to have a `data` object with title, description, footer, and fields.
 * @returns {ValidationResult} ValidationResult containing errors for any hard limit violations (e.g., content > 2000 chars, more than 10 embeds, per-embed limit breaches) and warnings for non-fatal issues (e.g., large total message size that may be truncated or embed-level warnings).
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
        const embed = embeds[i];
        
        // Guard against invalid embed objects
        if (!embed || typeof embed !== 'object' || !embed.data) {
            result.addError(`Embed ${i + 1}: Invalid embed object (missing or malformed)`);
            continue;
        }
        
        const embedResult = validateEmbedLimits(embed);
        if (!embedResult.isValid) {
            result.addError(`Embed ${i + 1}: ${embedResult.errors.join(', ')}`);
        }
        if (embedResult.hasWarnings()) {
            result.addWarning(`Embed ${i + 1}: ${embedResult.warnings.join(', ')}`);
        }
    }

    // Check total message size (approximate)
    const totalSize = content.length + embeds.reduce((total, embed) => {
        // Short-circuit for malformed embeds
        if (!embed || typeof embed !== 'object' || !embed.data) {
            return total; // Treat malformed embed as size 0
        }
        
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
 * Validate a Discord embed's fields and size against Discord's limits.
 *
 * Checks the embed's title, description, footer text, author name, field count,
 * and each field's name and value for violations of Discord constraints:
 * title ≤ 256, description ≤ 4096, footer text ≤ 2048, author name ≤ 256,
 * max 25 fields, field name ≤ 256, field value ≤ 1024.
 * @param {EmbedBuilder} embed - EmbedBuilder whose `data` will be validated.
 * @returns {ValidationResult} ValidationResult containing errors for each violated embed limit; empty if the embed conforms to all limits.
 */
function validateEmbedLimits(embed) {
    const result = new ValidationResult();

    // Early return guard for missing embed or data
    if (!embed || !embed.data) {
        return result;
    }

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
 * Verify that a channel exists in the specified guild and that the bot has the required permissions there.
 *
 * @param {Object} guild - Discord Guild object to check against.
 * @param {string} channelId - ID of the channel to validate.
 * @param {Array<string>} [requiredPermissions=['ViewChannel','SendMessages']] - Permissions the bot must have in the channel.
 * @returns {ValidationResult} ValidationResult containing errors for missing guild, invalid or missing channel, missing bot member, or any lacking permissions; valid if no issues were found.
 */
async function validateChannelAccess(guild, channelId, requiredPermissions = ['ViewChannel', 'SendMessages']) {
    const result = new ValidationResult();

    if (!guild) {
        result.addError('Guild is required');
        return result;
    }

    if (!validateChannelId(channelId)) {
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
 * Check whether a user ID corresponds to a member of the given guild.
 *
 * @param {Object} guild - Discord guild object to search for the member.
 * @param {string} userId - Discord user ID to validate and look up.
 * @returns {ValidationResult} Validation result containing errors when:
 *  - the guild is not provided,
 *  - the userId is invalid,
 *  - the user is not found in the guild,
 *  - or an error occurred while fetching the member (error message included).
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
 * Validate system configuration and report missing, invalid, or inconsistent settings.
 *
 * Performs checks for required IDs, numeric constraints, and related date relationships;
 * adds errors for missing or invalid critical configuration values and warnings for non-fatal inconsistencies.
 * @returns {ValidationResult} Validation result containing any errors and warnings found.
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
 * Remove potentially dangerous markup and common Markdown/Discord formatting from a user-provided string.
 * @param {string} input - The string to clean; if not a string or empty, an empty string is returned.
 * @returns {string} The cleaned string with HTML angle brackets, code blocks, inline code, and common Markdown/Discord formatting removed.
 */
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    return input
        .replace(/@everyone/gi, '@\u200beveryone') // Neutralize @everyone mentions
        .replace(/@here/gi, '@\u200bhere') // Neutralize @here mentions
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
 * Validate request content against the game's configuration and return sanitized string fields when validation passes.
 * @param {Object} content - The request payload to validate and sanitize.
 * @param {string} gameType - The submission type, e.g., "LFP" (looking for players) or "LFT" (looking for team).
 * @param {string} game - The game key used to resolve the game's configuration.
 * @returns {{content: Object|null, validationResult: ValidationResult}} An object containing `content` (sanitized copy of the input when valid, otherwise `null`) and the `validationResult` describing errors or warnings. */
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
    validateChannelId,
    validateStrictSnowflake,
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
