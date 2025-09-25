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

const env = require('dotenv');
env.config("");

module.exports = {
    // Configurations for the bot
    Token: process.env.TOKEN,
    DefaultPrefix: "!",
    mongoUrl: process.env.MONGO_URI,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    logWebhook: process.env.LOG_WEBHOOK,
    underDevelopment: true,
    deploySlashOnReady: true, // Set to true if you want to deploy slash commands on bot ready

    // Ticket Configurations
    ticketSystem: true,
    ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID,
    ticketDashChannelId: process.env.TICKET_DASH_CHANNEL_ID,
    ticketSupportRoleId: process.env.TICKET_SUPPORT_ROLE_ID, 
    ticketTranscriptChannelId: process.env.TICKET_TRANSCRIPT_CHANEL_ID, 
    ticketCategoryId: process.env.TICKET_CATEGORY, 

    // Logging Configurations
    logging: true,
    serverLogChannelId: process.env.SERVER_LOG_CHANNEL_ID,
    memberLogChannelId: process.env.MEMBER_LOG_CHANNEL_ID,
    voiceLogChannelId: process.env.VOICE_LOG_CHANNEL_ID,
    messageLogChannelId: process.env.MESSAGE_LOG_CHANNEL_ID,

    //LFP LFT Configurations
    lfpLftSystem: true,
    lfplftModroleId: process.env.LF_MOD_ROLE_ID,
    lfActionLogChannelId: process.env.LF_ACTION_LOG_CHANNEL_ID,
    MaxActiveRequest: 5,
    RequestExpiryDays: 7,
    RequestArchiveDays: 30,
    RequestDeleteDays: 60, // Days after which soft-deleted requests (archived, expired, cancelled) are permanently deleted
    
    // Rate Limiting Configurations
    rateLimits: {
        create: {
            maxRequests: 3,
            windowMs: 300000 // 5 minutes
        },
        edit: {
            maxRequests: 5,
            windowMs: 60000 // 1 minute
        },
        cancel: {
            maxRequests: 10,
            windowMs: 300000 // 5 minutes
        },
        default: {
            maxRequests: 5,
            windowMs: 300000 // 5 minutes
        }
    },


    // Bot admins and developers
    developers: [
        {
            name: "Monk",
            id: "1156911026164482078",
        }
    ],
    devGuilds: [
        {
          name: "Apatite",
          id: "1420309277699997738",
        },
      ],
}