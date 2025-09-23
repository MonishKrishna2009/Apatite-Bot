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

const { EmbedBuilder, Colors, MessageFlags } = require("discord.js");
const LFRequest = require("../../Schemas/LookingFor/lfplft");

/**
 * Checks if a user has exceeded the max active requests.
 * @param {Object} interaction - Discord interaction
 * @param {String} type - Request type ("LFP" or "LFT")
 * @param {Object} config - Config with MaxActiveRequest
 * @returns {Boolean} true if limit reached, false otherwise
 */

async function checkActiveRequests(interaction, type, config) {
    const { user, guild } = interaction;

    const activeRequest = await LFRequest.countDocuments({
        userId: user.id,
        guildId: guild.id,
        type,
        status: { $in: ["pending", "approved"] }
    });

    if (activeRequest >= config.MaxActiveRequest) {
        const limitEmbed = new EmbedBuilder()
            .setTitle("⚠️ Request Limit Reached")
            .setColor(Colors.Red)
            .setDescription(
                `You already have **${activeRequest} active ${type} requests**. ` +
                `The maximum allowed is **${config.MaxActiveRequest}**.\n\n` +
                `Please cancel or wait for existing requests to expire before creating new ones.`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [limitEmbed], flags: MessageFlags.Ephemeral });
        return true; // limit reached
    }

    return false; // safe to proceed
}

module.exports = { checkActiveRequests };