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
 * Checks if a user has exceeded the max active requests.
 * @param {Object} interaction - Discord interaction
 * @param {String} type - Request type ("LFP" or "LFT")
 * @param {Object} config - Config with MaxActiveRequest
 * @returns {Boolean} true if limit reached, false otherwise
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
 * Atomic check and reserve a request slot to prevent race conditions
 * Uses MongoDB's findOneAndUpdate with upsert for true atomicity
 * @param {Object} interaction - Discord interaction
 * @param {String} type - Request type ("LFP" or "LFT")
 * @param {Object} config - Config with MaxActiveRequest
 * @returns {Boolean} true if slot reserved, false if limit reached
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
 * Release a reserved slot after successful request creation or on failure
 * @param {Object} interaction - Discord interaction
 * @param {String} type - Request type ("LFP" or "LFT")
 * @returns {Boolean} true if slot released successfully
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
 * Clean up expired reservations (should be called periodically)
 * @param {String} guildId - Optional guild ID to limit cleanup scope
 * @returns {Number} Number of expired reservations cleaned up
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