const ValoCooldown = require("../Schemas/LookingFor/valolfplft");

async function checkValoCooldown(userId, guildId, type, cooldownMs) {
    const now = Date.now();

    let cd = await ValoCooldown.findOne({ userId, guildId });
    if (!cd) {
        cd = await ValoCooldown.create({ userId, guildId });
    }

    let lastUsed;
    if (type === "lfp") lastUsed = cd.lfpLastUsed;
    if (type === "lft") lastUsed = cd.lftLastUsed;

    if (lastUsed && now - lastUsed.getTime() < cooldownMs) {
        const timeLeft = Math.ceil((cooldownMs - (now - lastUsed.getTime())) / 1000 / 60);
        return { onCooldown: true, timeLeft };
    }

    // Update only the relevant field
    if (type === "lfp") cd.lfpLastUsed = now;
    if (type === "lft") cd.lftLastUsed = now;

    await cd.save();

    return { onCooldown: false };
}

module.exports = checkValoCooldown;