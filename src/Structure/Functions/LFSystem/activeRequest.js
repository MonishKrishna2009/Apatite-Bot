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
const { Logger } = require("../Logger");
const logger = new Logger();

/**
 * Determine whether the user has reached the maximum number of active requests of the given type.
 * @param {Object} interaction - The Discord interaction containing user and guild context.
 * @param {String} type - Request type, e.g., "LFP" or "LFT".
 * @param {Object} config - Configuration object containing `MaxActiveRequest`.
 * @returns {Boolean} `true` if the user has reached or exceeded the configured maximum active requests for the type, `false` otherwise.
 */
async function checkActiveRequests(interaction, type, config) {
    const { user, guild } = interaction;

    try {
        const activeRequest = await LFRequest.countDocuments({
            userId: user.id,
            guildId: guild.id,
            type: type.toUpperCase(),
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
    } catch (error) {
        logger.error(`Error checking active requests for user ${user.id}: ${error.message}`);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle("❌ Error")
            .setColor(Colors.Red)
            .setDescription("An error occurred while checking your active requests. Please try again.")
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return true; // Assume limit reached on error to prevent creation
    }
}

/**
 * Reserve an available request slot atomically to prevent a user from exceeding the per-guild request limit.
 *
 * If the per-user limit would be exceeded, the reservation is rolled back and an ephemeral reply is sent to the interaction.
 * On error the function sends an ephemeral error reply and returns `false`.
 *
 * @param {Object} interaction - The Discord interaction containing `user` and `guild`.
 * @param {string} type - Request type, e.g., "LFP" or "LFT".
 * @param {Object} config - Configuration object.
 * @param {number} config.MaxActiveRequest - Maximum allowed active requests per user for the given type.
 * @returns {boolean} `true` if a slot was successfully reserved, `false` if the limit was reached or an error occurred.
 */
async function reserveRequestSlot(interaction, type, config) {
    const { user, guild } = interaction;

    try {
        // Use atomic findOneAndUpdate with upsert to check and increment atomically
        // This creates a reservation counter document if it doesn't exist
        const reservationKey = `${user.id}_${guild.id}_${type.toUpperCase()}`;
        
        const result = await LFRequest.db.collection('request_reservations').findOneAndUpdate(
            { _id: reservationKey },
            { 
                $inc: { count: 1 },
                $setOnInsert: { 
                    userId: user.id,
                    guildId: guild.id,
                    type: type.toUpperCase(),
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minute reservation
                }
            },
            { 
                upsert: true, 
                returnDocument: 'after' 
            }
        );

        // Check if this would exceed the limit
        if (result.count > config.MaxActiveRequest) {
            // Rollback the increment
            await LFRequest.db.collection('request_reservations').findOneAndUpdate(
                { _id: reservationKey },
                { $inc: { count: -1 } }
            );

            const limitEmbed = new EmbedBuilder()
                .setTitle("⚠️ Request Limit Reached")
                .setColor(Colors.Red)
                .setDescription(
                    `You already have the maximum allowed **${config.MaxActiveRequest} active ${type} requests**.\n\n` +
                    `Please cancel or wait for existing requests to expire before creating new ones.`
                )
                .setTimestamp();

            await interaction.reply({ embeds: [limitEmbed], flags: MessageFlags.Ephemeral });
            return false; // limit reached
        }

        return true; // slot reserved successfully
    } catch (error) {
        logger.error(`Error reserving request slot for user ${user.id}: ${error.message}`);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle("❌ Error")
            .setColor(Colors.Red)
            .setDescription("An error occurred while reserving your request slot. Please try again.")
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return false; // Assume limit reached on error
    }
}

/**
 * Release a previously reserved request slot for the invoking user in the interaction's guild.
 * @param {Object} interaction - Discord interaction containing the user and guild.
 * @param {string} type - Request type, either "LFP" or "LFT".
 * @returns {boolean} `true` if the reservation was released or cleaned up successfully, `false` otherwise.
 */
async function releaseReservation(interaction, type) {
    const { user, guild } = interaction;

    try {
        const reservationKey = `${user.id}_${guild.id}_${type.toUpperCase()}`;
        
        // Decrement the reservation counter
        const result = await LFRequest.db.collection('request_reservations').findOneAndUpdate(
            { _id: reservationKey },
            { $inc: { count: -1 } }
        );

        // If count reaches 0 or below, remove the document
        if (result && result.count <= 1) {
            await LFRequest.db.collection('request_reservations').deleteOne({ _id: reservationKey });
        }

        return true;
    } catch (error) {
        logger.error(`Error releasing reservation for user ${user.id}: ${error.message}`);
        return false;
    }
}

/**
 * Remove reservation records whose expiration time is before now, optionally scoped to a specific guild.
 * @param {string|null} guildId - Optional guild ID to limit cleanup to that guild.
 * @returns {number} The number of deleted reservation documents.
 */
async function cleanupExpiredReservations(guildId = null) {
    try {
        const query = {
            expiresAt: { $lt: new Date() }
        };

        if (guildId) {
            query.guildId = guildId;
        }

        const result = await LFRequest.db.collection('request_reservations').deleteMany(query);
        return result.deletedCount;
    } catch (error) {
        logger.error(`Error cleaning up expired reservations: ${error.message}`);
        return 0;
    }
}

module.exports = { 
    checkActiveRequests, 
    reserveRequestSlot, 
    releaseReservation,
    cleanupExpiredReservations 
};