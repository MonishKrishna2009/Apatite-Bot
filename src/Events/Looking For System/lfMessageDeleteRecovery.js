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

const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require("discord.js");
const logger = new Logger();

const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft.js");
const config = require("../../Structure/Configs/config.js");
const { getGameChannels } = require("../../Structure/Functions/LFSystem/lfActionLogger");
const { renderRequestEmbed } = require("../../Structure/Functions/renderRequestEmbed");
const { STATUS } = require("../../Structure/Functions/LFSystem/lfHelpers");
const { validateChannelAccess } = require("../../Structure/Functions/LFSystem/lfValidation");

class LFMessageDeleteRecovery extends Event {
    constructor(client) {
        super(client, {
            name: Events.MessageDelete,
        });
    }

    async execute(message) {
        const { client } = this;

        // Check if LFP/LFT system is enabled
        if (!client.config.lfpLftSystem) return;

        // Ignore if no guild
        if (!message.guild) return;

 

        try {
            // Add a small delay to prevent immediate recovery when messages are intentionally deleted
            setTimeout(async () => {
                try {
                    // Check if the deleted message was a review message (pending requests)
                    const reviewRequest = await LFRequest.findOne({
                        messageId: message.id,
                        guildId: message.guild.id,
                        status: STATUS.PENDING
                    });

                    if (reviewRequest) {
                        logger.info(`Review message deleted for pending request ${reviewRequest._id}, attempting recovery...`);
                        await this.recoverReviewMessage(message, reviewRequest);
                        return;
                    }

                    // Check if the deleted message was a public message (approved requests)
                    const publicRequest = await LFRequest.findOne({
                        publicMessageId: message.id,
                        guildId: message.guild.id,
                        status: STATUS.APPROVED
                    });

                    if (publicRequest) {
                        logger.info(`Public message deleted for approved request ${publicRequest._id}, attempting recovery...`);
                        await this.recoverPublicMessage(message, publicRequest);
                        return;
                    }

                    // Also check for any request with this publicMessageId regardless of status
                    const anyPublicRequest = await LFRequest.findOne({
                        publicMessageId: message.id,
                        guildId: message.guild.id
                    });

                    if (anyPublicRequest && anyPublicRequest.status !== STATUS.APPROVED) {
                        logger.warn(`Found request ${anyPublicRequest._id} with publicMessageId ${message.id} but status is ${anyPublicRequest.status} (not approved)`);
                    }

                    // Additional debugging: Check if there are any requests with this message ID regardless of status
                    const anyRequest = await LFRequest.findOne({
                        $or: [
                            { messageId: message.id },
                            { publicMessageId: message.id }
                        ],
                        guildId: message.guild.id
                    });

                    if (anyRequest) {
                        logger.warn(`Found request ${anyRequest._id} with message ID ${message.id} but status is ${anyRequest.status} (not pending/approved)`);
                    } else {
                        logger.info(`No LF request found for deleted message ${message.id}`);
                    }
                } catch (error) {
                    logger.error(`Error in LF message delete recovery (delayed): ${error.message}`);
                    logger.error(`Stack trace: ${error.stack}`);
                }
            }, 2000); // 2 second delay

        } catch (error) {
            logger.error(`Error in LF message delete recovery: ${error.message}`);
            logger.error(`Stack trace: ${error.stack}`);
        }
    }

    async recoverReviewMessage(deletedMessage, request) {
        try {
            // Get game-specific channels with error handling
            let channels;
            try {
                channels = getGameChannels(config, request.game);
            } catch (error) {
                logger.warn(`Failed to get game channels for request ${request._id} (game: ${request.game}): ${error.message}`);
                return;
            }
            
            // Check if channels were properly resolved
            if (!channels || !channels.reviewChannelId) {
                logger.warn(`Game configuration missing for request ${request._id} (game: ${request.game}) - cannot determine review channel`);
                return;
            }
            
            // Verify we're in the correct review channel
            if (deletedMessage.channel.id !== channels.reviewChannelId) {
                logger.warn(`Review message deleted from wrong channel for request ${request._id}`);
                return;
            }

            // Validate channel access before attempting recovery
            const channelValidation = await validateChannelAccess(deletedMessage.guild, channels.reviewChannelId);
            if (!channelValidation.isValid) {
                logger.error(`Cannot recover review message for request ${request._id}: ${channelValidation.errors.join(', ')}`);
                return;
            }

            // Get the user who created the request
            const user = await this.client.users.fetch(request.userId).catch(() => null);
            if (!user) {
                logger.warn(`Could not fetch user ${request.userId} for request ${request._id}`);
                return;
            }

            // Create the review embed
            const reviewEmbed = renderRequestEmbed(request, user);
            
            // Add review buttons
            const reviewRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`lfreview_${request._id}_approve`)
                    .setLabel("✅ Approve")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`lfreview_${request._id}_decline`)
                    .setLabel("❌ Decline")
                    .setStyle(ButtonStyle.Danger)
            );

            // Repost the message
            const reviewChannel = deletedMessage.guild.channels.cache.get(channels.reviewChannelId);
            if (!reviewChannel) {
                logger.error(`Review channel not found: ${channels.reviewChannelId}`);
                return;
            }

            const recoveredMessage = await reviewChannel.send({
                embeds: [reviewEmbed],
                components: [reviewRow]
            });

            // Update the request with the new message ID
            request.messageId = recoveredMessage.id;
            await request.save();

            // Log the recovery action
            const recoveryEmbed = new EmbedBuilder()
                .setTitle("🔄 LF Message Recovery")
                .setColor(Colors.Orange)
                .setDescription(
                    `>>> **Action**: Review message recovered\n` +
                    `**Request ID**: \`${request._id}\`\n` +
                    `**Type**: ${request.type}\n` +
                    `**Game**: ${request.game}\n` +
                    `**Status**: ${request.status}\n` +
                    `**User**: <@${request.userId}>\n` +
                    `**Old Message ID**: \`${deletedMessage.id}\`\n` +
                    `**New Message ID**: \`${recoveredMessage.id}\`\n` +
                    `**Channel**: <#${channels.reviewChannelId}>`
                )
                .setTimestamp()
                .setFooter({ text: `Request ID: ${request._id}` });

            // Send recovery notification to LF action log if configured
            if (config.lfActionLogChannelId) {
                const logChannel = deletedMessage.guild.channels.cache.get(config.lfActionLogChannelId);
                if (logChannel) {
                    await logChannel.send({ embeds: [recoveryEmbed] });
                }
            }

            logger.info(`Successfully recovered review message for request ${request._id}`);

        } catch (error) {
            logger.error(`Failed to recover review message for request ${request._id}: ${error.message}`);
        }
    }

    async recoverPublicMessage(deletedMessage, request) {
        try {
            // Get game-specific channels with error handling
            let channels;
            try {
                channels = getGameChannels(config, request.game);
            } catch (error) {
                logger.warn(`Failed to get game channels for request ${request._id} (game: ${request.game}): ${error.message}`);
                return;
            }
            
            // Check if channels were properly resolved
            if (!channels || !channels.publicChannelId) {
                logger.warn(`Game configuration missing for request ${request._id} (game: ${request.game}) - cannot determine public channel`);
                return;
            }
            
            // Verify we're in the correct public channel
            if (deletedMessage.channel.id !== channels.publicChannelId) {
                logger.warn(`Public message deleted from wrong channel for request ${request._id}`);
                return;
            }

            // Validate channel access before attempting recovery
            const channelValidation = await validateChannelAccess(deletedMessage.guild, channels.publicChannelId);
            if (!channelValidation.isValid) {
                logger.error(`Cannot recover public message for request ${request._id}: ${channelValidation.errors.join(', ')}`);
                return;
            }

            // Get the user who created the request
            const user = await this.client.users.fetch(request.userId).catch(() => null);
            if (!user) {
                logger.warn(`Could not fetch user ${request.userId} for request ${request._id}`);
                return;
            }

            // Create the public embed
            const publicEmbed = renderRequestEmbed(request, user);
            
            // Add DM button
            const publicRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(request.type === "LFP" ? "DM Team" : "DM Player")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/users/${request.userId}`)
            );

            // Repost the message
            const publicChannel = deletedMessage.guild.channels.cache.get(channels.publicChannelId);
            if (!publicChannel) {
                logger.error(`Public channel not found: ${channels.publicChannelId}`);
                return;
            }

            const recoveredMessage = await publicChannel.send({
                embeds: [publicEmbed],
                components: [publicRow]
            });

            // Update the request with the new message ID
            request.publicMessageId = recoveredMessage.id;
            await request.save();

            // Log the recovery action
            const recoveryEmbed = new EmbedBuilder()
                .setTitle("🔄 LF Message Recovery")
                .setColor(Colors.Orange)
                .setDescription(
                    `>>> **Action**: Public message recovered\n` +
                    `**Request ID**: \`${request._id}\`\n` +
                    `**Type**: ${request.type}\n` +
                    `**Game**: ${request.game}\n` +
                    `**Status**: ${request.status}\n` +
                    `**User**: <@${request.userId}>\n` +
                    `**Old Message ID**: \`${deletedMessage.id}\`\n` +
                    `**New Message ID**: \`${recoveredMessage.id}\`\n` +
                    `**Channel**: <#${channels.publicChannelId}>`
                )
                .setTimestamp()
                .setFooter({ text: `Request ID: ${request._id}` });

            // Send recovery notification to LF action log if configured
            if (config.lfActionLogChannelId) {
                const logChannel = deletedMessage.guild.channels.cache.get(config.lfActionLogChannelId);
                if (logChannel) {
                    await logChannel.send({ embeds: [recoveryEmbed] });
                }
            }

            // DM the user about the recovery
            try {
                const userNotification = new EmbedBuilder()
                    .setTitle("🔄 Message Recovered")
                    .setColor(Colors.Orange)
                    .setDescription(
                        `>>> **Request ID**: \`${request._id}\`\n` +
                        `**Type**: ${request.type}\n` +
                        `**Game**: ${request.game}\n` +
                        `**Action**: Your ${request.type} request message has been automatically recovered\n` +
                        `**Channel**: <#${channels.publicChannelId}>\n\n` +
                        `*This happened because your message was accidentally deleted. The bot automatically reposted it to keep your request active.*`
                    )
                    .setTimestamp()
                    .setFooter({ text: `Request ID: ${request._id}` });

                await user.send({ embeds: [userNotification] });
            } catch (error) {
                logger.warn(`Could not DM user ${request.userId} about message recovery: ${error.message}`);
            }

            logger.info(`Successfully recovered public message for request ${request._id}`);

        } catch (error) {
            logger.error(`Failed to recover public message for request ${request._id}: ${error.message}`);
        }
    }
}

module.exports = LFMessageDeleteRecovery;
