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

/**
 * Rate Limiter for LF System
 * Prevents spam and abuse of request creation
 */
class RateLimiter {
    constructor() {
        this.requests = new Map(); // userId -> { count, resetTime }
        this.cleanupInterval = null;
        this.config = null; // Will be set when config is available
        this.startCleanup();
    }

    /**
     * Check if user is rate limited
     * @param {string} userId - User ID to check
     * @param {number} maxRequests - Maximum requests per window
     * @param {number} windowMs - Time window in milliseconds
     * @returns {Object} - { isLimited: boolean, remaining: number, resetTime: number }
     */
    checkRateLimit(userId, maxRequests = 3, windowMs = 300000) { // 3 requests per 5 minutes by default
        const now = Date.now();
        const userData = this.requests.get(userId);

        // If no previous requests or window has expired
        if (!userData || now > userData.resetTime) {
            this.requests.set(userId, {
                count: 1,
                resetTime: now + windowMs
            });
            return {
                isLimited: false,
                remaining: maxRequests - 1,
                resetTime: now + windowMs
            };
        }

        // Check if user has exceeded limit
        if (userData.count >= maxRequests) {
            return {
                isLimited: true,
                remaining: 0,
                resetTime: userData.resetTime
            };
        }

        // Increment count
        userData.count++;
        this.requests.set(userId, userData);

        return {
            isLimited: false,
            remaining: maxRequests - userData.count,
            resetTime: userData.resetTime
        };
    }

    /**
     * Set configuration for rate limits
     * @param {Object} config - Configuration object with rateLimits
     */
    setConfig(config) {
        this.config = config;
    }

    /**
     * Check rate limit for specific operation
     * @param {string} userId - User ID
     * @param {string} operation - Operation type (create, edit, etc.)
     * @returns {Object} - Rate limit result
     */
    checkOperationRateLimit(userId, operation = 'create') {
        const operationKey = `${userId}:${operation}`;
        
        // Get rate limit config for operation, fallback to default if not found
        const rateLimitConfig = this.config?.rateLimits?.[operation] || this.config?.rateLimits?.default || {
            maxRequests: 5,
            windowMs: 300000
        };
        
        return this.checkRateLimit(operationKey, rateLimitConfig.maxRequests, rateLimitConfig.windowMs);
    }

    /**
     * Get rate limit info for user
     * @param {string} userId - User ID
     * @param {string} operation - Operation type
     * @returns {Object} - Rate limit info
     */
    getRateLimitInfo(userId, operation = 'create') {
        const operationKey = `${userId}:${operation}`;
        const userData = this.requests.get(operationKey);
        
        if (!userData) {
            return {
                count: 0,
                remaining: this.getMaxRequests(operation),
                resetTime: null,
                isLimited: false
            };
        }

        const now = Date.now();
        const maxRequests = this.getMaxRequests(operation);
        
        if (now > userData.resetTime) {
            return {
                count: 0,
                remaining: maxRequests,
                resetTime: null,
                isLimited: false
            };
        }

        return {
            count: userData.count,
            remaining: Math.max(0, maxRequests - userData.count),
            resetTime: userData.resetTime,
            isLimited: userData.count >= maxRequests
        };
    }

    /**
     * Get maximum requests for operation
     * @param {string} operation - Operation type
     * @returns {number} - Maximum requests
     */
    getMaxRequests(operation) {
        // Get rate limit config for operation, fallback to default if not found
        const rateLimitConfig = this.config?.rateLimits?.[operation] || this.config?.rateLimits?.default || {
            maxRequests: 5,
            windowMs: 300000
        };
        
        return rateLimitConfig.maxRequests;
    }

    /**
     * Start cleanup interval to remove expired entries
     */
    startCleanup() {
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, data] of this.requests.entries()) {
                if (now > data.resetTime) {
                    this.requests.delete(key);
                }
            }
        }, 300000); // 5 minutes
    }

    /**
     * Stop cleanup interval
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Clear all rate limit data
     */
    clear() {
        this.requests.clear();
    }

    /**
     * Clear rate limit data for specific user
     * @param {string} userId - User ID to clear
     */
    clearUser(userId) {
        for (const key of this.requests.keys()) {
            if (key.startsWith(`${userId}:`)) {
                this.requests.delete(key);
            }
        }
    }

    /**
     * Get current rate limit statistics
     * @returns {Object} - Statistics
     */
    getStats() {
        return {
            totalUsers: this.requests.size,
            memoryUsage: process.memoryUsage().heapUsed,
            uptime: process.uptime()
        };
    }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

module.exports = {
    RateLimiter,
    rateLimiter
};
