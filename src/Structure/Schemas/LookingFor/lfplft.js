const { Schema, model } = require("mongoose");

const LFRequestSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    type: { type: String, enum: ["LFP", "LFT"], required: true },
    game: { type: String,required: true },
    content: { type: Object, required: true }, // Store form details
    status: { type: String, enum: ["pending", "approved", "declined", "archived", "expired"], default: "pending" },
    reviewedBy: { type: String, default: null },
    messageId: { type: String, default: null }, // Review channel message
    createdAt: { type: Date, default: Date.now }
});

module.exports = model("LFRequest", LFRequestSchema);
