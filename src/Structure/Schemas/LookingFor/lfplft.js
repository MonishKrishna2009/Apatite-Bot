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
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    type: { type: String, enum: ["LFP", "LFT"], required: true },
    game: { type: String, required: true },
    content: { type: Object, required: true }, // Store form details
    status: { 
        type: String, 
        enum: ["pending", "approved", "declined", "archived", "expired", "cancelled", "deleted"], 
        default: "pending" 
    },
    reviewedBy: { type: String, default: null },
    messageId: { type: String, default: null }, // Review channel message
    publicMessageId: { type: String, default: null }, // Public channel message
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // When request will expire
    archivedAt: { type: Date, default: null }, // When request was archived
    deletedAt: { type: Date, default: null } // When request was soft deleted
});

// Update updatedAt on save
LFRequestSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = model("LFRequest", LFRequestSchema);
