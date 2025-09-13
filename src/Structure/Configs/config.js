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
          id: "1040507183080685658",
        },
      ],
}