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
    expiresAt: { type: Date, default: null }, // When request expires
    archivedAt: { type: Date, default: null }, // When request was archived
    deletedAt: { type: Date, default: null } // When request was soft deleted
});

// Update updatedAt on save
LFRequestSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = model("LFRequest", LFRequestSchema);
