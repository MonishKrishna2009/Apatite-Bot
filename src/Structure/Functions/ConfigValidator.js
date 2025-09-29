/*
 * Apatite Bot - Configuration validation utilities
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

/**
 * Validates retention period configuration to ensure logical ordering
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If retention periods are misconfigured
 */
function validateRetentionPeriods(config) {
    // Validate RequestExpiryDays < RequestArchiveDays
    if (config.RequestExpiryDays >= config.RequestArchiveDays) {
        throw new Error(
            `Invalid retention configuration: RequestExpiryDays (${config.RequestExpiryDays}) must be less than RequestArchiveDays (${config.RequestArchiveDays}). ` +
            `Requests must expire before they can be archived.`
        );
    }
    
    // Validate RequestArchiveDays < RequestDeleteDays
    if (config.RequestArchiveDays >= config.RequestDeleteDays) {
        throw new Error(
            `Invalid retention configuration: RequestArchiveDays (${config.RequestArchiveDays}) must be less than RequestDeleteDays (${config.RequestDeleteDays}). ` +
            `Requests must be archived before they can be permanently deleted.`
        );
    }
}

/**
 * Validates rate limiting configuration
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If rate limits are misconfigured
 */
function validateRateLimits(config) {
    const rateLimits = config.rateLimits;
    
    for (const [action, limit] of Object.entries(rateLimits)) {
        // Validate maxRequests is a positive integer
        if (!Number.isInteger(limit.maxRequests) || limit.maxRequests <= 0) {
            throw new Error(
                `Invalid rate limit configuration for '${action}': maxRequests must be a positive integer, got ${limit.maxRequests}`
            );
        }
        
        // Validate windowMs is a positive integer
        if (!Number.isInteger(limit.windowMs) || limit.windowMs <= 0) {
            throw new Error(
                `Invalid rate limit configuration for '${action}': windowMs must be a positive integer, got ${limit.windowMs}`
            );
        }
        
        // Warn about unreasonably small windows
        if (limit.windowMs < 1000) {
            console.warn(
                `Warning: Rate limit window for '${action}' is very small (${limit.windowMs}ms). ` +
                `Consider using at least 1000ms to avoid potential issues.`
            );
        }
    }
}

/**
 * Validates all configuration settings
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If any configuration is invalid
 */
function validateConfig(config) {
    validateRetentionPeriods(config);
    validateRateLimits(config);
    // Add more validation functions here as needed
}

module.exports = {
    validateRetentionPeriods,
    validateRateLimits,
    validateConfig
};
