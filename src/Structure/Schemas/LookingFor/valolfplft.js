const { Schema, model } = require("mongoose");

const valoCooldownSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true }, // optional, if per-server cooldowns
    lfpLastUsed: { type: Date, default: null },
    lftLastUsed: { type: Date, default: null }
});

module.exports = model("ValoLFPLFTCooldown", valoCooldownSchema);