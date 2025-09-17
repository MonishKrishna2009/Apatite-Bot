> [!IMPORTANT]
> This project is currently incomplete and work-in-progress

# Apatite Bot  

Apatite Bot is a powerful and modular Discord bot built with Node.js and Discord.js v14. It provides advanced logging, ticketing, and utility features to help manage your Discord server efficiently.  

## 🚀 Project Overview  

Apatite Bot is designed to simplify server management with its event-driven logging system, ticketing functionality, and customizable configurations. Whether you're managing a small community or a large server, Apatite Bot ensures transparency and organization.  

## ✨ Features  

### Logging System  
- Tracks server events:  
    - Channel create/update/delete  
    - Role create/update/delete  
    - Member join/leave/role changes  
    - Voice state changes  
    - Message delete/bulk delete  
- Configurable logging channels for server, member, voice, message, and ticket logs.  
- Standardized embed styling for clear and professional logs.  

### Ticketing System  
- Create, close, delete, and reopen tickets with interactive buttons.  
- Generates transcripts for closed tickets.  
- MongoDB integration for ticket persistence.  

### Utilities  
- `LogManager` utility for creating standardized embeds and handling audit logs.  
- Modular event and component handler structure for scalability.  

## 🛠️ Installation  

1. Clone the repository:  
     ```bash  
     git clone https://github.com/MonishKrishna2009/Apatite-Bot.git
     cd apatite-bot  
     ```  

2. Install dependencies:  
     ```bash  
     bun install
     ```  

3. Set up the configuration file:  
     - Rename `.env.example` to `.env`.  
     - Fill in the required fields (see [Configuration](#gear-configuration)).  

4. Start the bot:  
     ```bash  
     bun .  
     ```  

## ⚙️ Configuration  

The `.env` file contains all the necessary settings for the bot. Here's an example:  

```bash
# Discord Stuff
TOKEN = ""
CLIENT_ID = ""
CLIENT_SECRET = ""

GUILD_ID = ""

# Database Stuff
MONGO_URI = "" 

# Logging Stuff
LOG_WEBHOOK = ""
SERVER_LOG_CHANNEL_ID = ""
MEMBER_LOG_CHANNEL_ID = ""
VOICE_LOG_CHANNEL_ID = ""
MESSAGE_LOG_CHANNEL_ID = ""
WARN_LOG_CHANNEL_ID = ""


#Ticket Stuff
TICKET_LOG_CHANNEL_ID = ""
TICKET_DASH_CHANNEL_ID = ""
TICKET_SUPPORT_ROLE_ID = ""
TICKET_TRANSCRIPT_CHANEL_ID = ""
TICKET_CATEGORY = ""
```

You also need to fill your necessary details in the config.js file inside Structure/Configs folder (I have included the space you probably need to fill)

```javascript
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
```

## ▶️ Usage  

1. Start the bot:  
     ```bash  
     bun . 
     ```  

2. Try the following: 
     - Create a ticket panel by running the command (Make sure to edit the context to your needs!)
     - Create a ticket by clicking the "Create Ticket" button.
     - Try out the Logging systems etc.. 

# WORK IN PROGRESS DOCUMENTATION PLEASE DONT REFER AT THIS POINT.

## 🤝 Contributing  

Contributions are welcome! Fork the repository, make your changes, and submit a pull request.  

## 📄 License  

[![Custom: MIT License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
