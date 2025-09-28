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

const { Schema, model } = require("mongoose");

const LFRequestSchema = new Schema({
    userId: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{17,20}$/.test(v); // Discord user ID format
            },
            message: 'Invalid user ID format'
        }
    },
    guildId: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{17,20}$/.test(v); // Discord guild ID format
            },
            message: 'Invalid guild ID format'
        }
    },
    type: { 
        type: String, 
        enum: ["LFP", "LFT"], 
        required: true,
        uppercase: true
    },
    game: { 
        type: String, 
        required: true,
        lowercase: true,
        trim: true
    },
    content: { 
        type: Object, 
        required: true,
        validate: {
            validator: function(v) {
                return v && typeof v === 'object' && Object.keys(v).length > 0;
            },
            message: 'Content cannot be empty'
        }
    },
    status: { 
        type: String, 
        enum: ["pending", "approved", "declined", "archived", "expired", "cancelled", "deleted"], 
        default: "pending",
        lowercase: true
    },
    reviewedBy: { 
        type: String, 
        default: null,
        validate: {
            validator: function(v) {
                return !v || /^\d{17,20}$/.test(v); // Discord user ID format or null
            },
            message: 'Invalid reviewer ID format'
        }
    },
    messageId: { 
        type: String, 
        default: null,
        validate: {
            validator: function(v) {
                return !v || /^\d{17,20}$/.test(v); // Discord message ID format or null
            },
            message: 'Invalid message ID format'
        }
    },
    publicMessageId: { 
        type: String, 
        default: null,
        validate: {
            validator: function(v) {
                return !v || /^\d{17,20}$/.test(v); // Discord message ID format or null
            },
            message: 'Invalid public message ID format'
        }
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        immutable: true
    },
    updatedAt: { 
        type: Date, 
        default: Date.now
    },
    expiresAt: { 
        type: Date, 
        required: true,
        validate: {
            validator: function(v) {
                const createdTimestamp = this.createdAt || this.get('createdAt') || Date.now();
                return v > createdTimestamp; // Expiry must be after creation
            },
            message: 'Expiry date must be after creation date'
        }
    },
    archivedAt: { 
        type: Date, 
        default: null,
        validate: {
            validator: function(v) {
                const createdTimestamp = this.createdAt || this.get('createdAt') || Date.now();
                return !v || v > createdTimestamp; // Archive date must be after creation
            },
            message: 'Archive date must be after creation date'
        }
    },
    deletedAt: { 
        type: Date, 
        default: null,
        validate: {
            validator: function(v) {
                const createdTimestamp = this.createdAt || this.get('createdAt') || Date.now();
                return !v || v > createdTimestamp; // Delete date must be after creation
            },
            message: 'Delete date must be after creation date'
        }
    }
});

// Update updatedAt on save
LFRequestSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Add indexes for better query performance
LFRequestSchema.index({ userId: 1, guildId: 1, type: 1, status: 1 }); // For user request queries
LFRequestSchema.index({ guildId: 1, game: 1, type: 1, status: 1 }); // For game-specific queries
LFRequestSchema.index({ guildId: 1, status: 1, expiresAt: 1 }); // For expiry cleanup
LFRequestSchema.index({ guildId: 1, status: 1, createdAt: 1 }); // For archive cleanup
LFRequestSchema.index({ messageId: 1 }); // For message recovery
LFRequestSchema.index({ publicMessageId: 1 }); // For message recovery
LFRequestSchema.index({ expiresAt: 1 }); // For global cleanup operations

// Add compound unique index to prevent duplicate pending requests
LFRequestSchema.index(
    { userId: 1, guildId: 1, type: 1, game: 1, status: 1 }, 
    { 
        unique: true, 
        partialFilterExpression: { status: "pending" },
        name: "unique_pending_request_per_user_game"
    }
);

module.exports = model("LFRequest", LFRequestSchema);
