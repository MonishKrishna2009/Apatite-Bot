# Apatite Bot
⚡ The all-in-one open-source Discord bot for esports, tournaments, and community management.

> [!IMPORTANT]
> This project is actively maintained and production-ready. The LFP/LFT system is fully implemented and stable.
> Here is the [development roadmap](./GitAssets/docs/Development-roadmap.md) for this project!

A feature-rich **Discord bot** built with [discord.js v14](https://discord.js.org) and MongoDB, designed for **ticketing, player/team matchmaking (LFP/LFT)**, comprehensive logging, and advanced moderation tools. Perfect for gaming communities, esports servers, and competitive Discord servers.

---

## 📚 Table of Contents
- [✨ Features](#-features)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
     - [Prerequisites](#prerequisites)
     - [Installation](#installation)
     - [Setup](#setup)
- [📑 Documentation](#-documentation)
- [🛠 Tech Stack](#-tech-stack)
- [✨ Star History](#-star-history)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)


## ✨ Features 

> [!CAUTION]
> Most of the documentation for this project has been generated with the help of AI, as I don’t have much time to write it all manually. The docs have been reviewed for errors, but if you spot any issues, please open an issue or submit a pull request with a fix.

- 👥 **LFP / LFT System** ✅
  - **Multi-game Support**: Valorant, CS2, League of Legends (easily extensible)
  - **JSON Configuration**: Games and fields defined in config files, no code changes needed
  - **Dynamic Modals**: Modal fields generated automatically from JSON configuration
  - **Staff Review System**: Comprehensive approvals/declines with advanced staff tools
  - **Auto-cleanup**: Enhanced cleanup with multiple types and dry run mode
  - **User Controls**: Create, edit, cancel, resend requests with validation
  - **Game-Specific Channels**: Separate review and public channels for each game
  - **Comprehensive Notifications**: Detailed DM notifications for all actions
  - **Security & Validation**: Input sanitization, rate limiting, cross-guild protection
  - **Performance**: Database indexes, timeout handling, error recovery
  - **Message Recovery**: Automatic recovery of accidentally deleted messages
  - **Enhanced Staff Tools**: Complete `/lfstaff` command suite with analytics
  - [Read More →](./GitAssets/docs/Lfp-Lft%20System.md)

- 🎫 **Ticket System** ✅
  - **Multi-Type Support**: Appeal, Claim Prize, General Inquiry, Production Inquiry
  - **Automated Creation**: Button-based ticket creation with type selection
  - **Staff Management**: Close, reopen, delete, and transcript generation
  - **Transcript System**: Automatic conversation logging and archiving
  - **Permission Control**: Role-based access and ownership validation
  - **Dashboard Setup**: Easy server setup with `/ticket-setup` command
  - [Read More →](./GitAssets/docs/Ticket-System.md)

- 🛡 **Moderation Tools** ✅
  - **Message Management**: Bulk message deletion with `/purge` command
  - **Role-Based Permissions**: Comprehensive permission validation
  - **Staff Commands**: Developer-only commands for bot management
  - **Action Logging**: Complete audit trail for all moderation actions
  - [Read More →](./GitAssets/docs/Moderation-System.md)

- 📜 **Comprehensive Logging System** ✅
  - **Server Events**: Channel create/delete/update, role create/delete/update
  - **Member Events**: Join/leave, role changes, nickname updates
  - **Message Events**: Create, edit, delete, bulk delete with content preservation
  - **Voice Events**: Voice state changes and channel activity
  - **Audit Trail**: Integration with Discord audit logs for executor tracking
  - **Beautiful Formatting**: Professional embed formatting with timestamps
  - [Read More →](./GitAssets/docs/Logging-System.md)

- ⚙️ **Advanced Architecture** ✅
  - **Modular Design**: Organized handlers for commands, events, and components
  - **Error Handling**: Comprehensive error management and recovery
  - **Database Integration**: MongoDB with optimized schemas and indexes
  - **Configuration Management**: Environment-based configuration system
  - **License Compliance**: GPL v3.0 compliance with automated checking
  - [Read More →](./GitAssets/docs/Architecture-Guide.md)

> [!TIP]
> Each system has its own dedicated `.md` file inside `/docs`. Start there if you’re exploring a specific feature.
---

## 📂 Project Structure 

```yaml
src/
├── Commands/           # Slash Commands
│   ├── Admin/          # Administrative commands (Ticket Setup)
│   ├── Dev/            # Developer commands (Reload)
│   ├── Info/           # Information commands (Ping, ServerInfo, UserInfo)
│   ├── LookingForSystem/ # LFP/LFT commands
│   └── Moderation/    # Moderation commands (Purge)
├── Components/         # Interactive Components
│   ├── Buttons/        # Button handlers (Ticket, LF Review)
│   └── Modals/         # Modal handlers (LFP/LFT Creation/Edit)
├── Events/             # Event Listeners
│   ├── Client/         # Bot client events (Ready)
│   ├── Interaction/    # Interaction events (AutoComplete, ButtonCreate)
│   ├── Logger/         # Comprehensive logging events
│   └── Looking For System/ # LF-specific events
└── Structure/          # Core Architecture
    ├── Client/         # Bot client configuration
    ├── Configs/        # Configuration files and JSON configs
    ├── Functions/      # Utility functions and LF system helpers
    ├── Handlers/       # Base handlers for commands, events, components
    └── Schemas/        # MongoDB schemas
```
> [!NOTE]
> Detailed architecture explanation: [Read More →](./GitAssets/docs/Architecture-Guide.md)

---

## 🚀 Getting Started 

### Prerequisites 
- A Discord Bot - [Tutorial](./GitAssets/docs/Discord-bot-creation.md)
- Installation of Bun - [Tutorial](https://bun.com/docs/installation)
- MongoDB Database - [Tutorial](./GitAssets/docs/MongoDB.md)
- Git - [Tutorial](https://github.com/git-guides/install-git)

> [!CAUTION]
> Ensure **MongoDB** is running before starting the bot, otherwise commands may fail.

### Installation 
```bash
git clone https://github.com/MonishKrishna2009/Apatite-Bot.git
cd apatite-bot
bun install
```
### Setup 

1. Copy `.env.example` → `.env` and configure:
```env
# Discord Stuff
TOKEN = ""
CLIENT_ID = ""
CLIENT_SECRET = ""

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

#LFP LFT Stuff
LF_ACTION_LOG_CHANNEL_ID = ""
LF_MOD_ROLE_ID = ""
```

2. Fill your dev user/dev guild details in `config.js`
```js
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
```
3. Run
```bash
bun .
```
> [!WARNING]
> Never commit your `.env` file. It contains sensitive tokens.

---

## 🛡️ **System Status & Recent Enhancements**

### **LFP/LFT System - Production Ready** ✅
The LFP/LFT system has undergone a comprehensive audit and enhancement process, achieving **19/20 critical logical errors fixed (95%)**:

#### **🔒 Security & Validation**
- Input sanitization and XSS protection
- Rate limiting with operation-specific limits  
- Cross-guild protection mechanisms
- Comprehensive permission and channel validation
- Status transition validation with enforced rules

#### **⚡ Performance & Reliability**
- 7 strategic database indexes for optimal performance
- Comprehensive timeout handling for all operations
- Error recovery with fallback mechanisms
- Race condition prevention with atomic operations
- Message recovery system for accidental deletions

#### **🛠️ Enhanced Staff Tools**
- Complete `/lfstaff` command suite with advanced features
- Multiple cleanup types (expire, archive, delete, full) with dry run mode
- Detailed statistics and analytics
- User request management and granular filtering
- Batch operations for efficient processing

**The system is now robust, secure, and highly reliable for production use!**

---

## 📑 Documentation 
- [🎫 Ticket System](./GitAssets/docs/Ticket-System.md) - Complete ticket management system
- [👥 LFP/LFT System](./GitAssets/docs/Lfp-Lft%20System.md) - Player/team matchmaking system
- [🛡️ Moderation System](./GitAssets/docs/Moderation-System.md) - Moderation tools and commands
- [📜 Logging System](./GitAssets/docs/Logging-System.md) - Comprehensive event logging
- [⚙️ Architecture Guide](./GitAssets/docs/Architecture-Guide.md) - Project structure and design
- [🛠️ Discord Bot Setup](./GitAssets/docs/Discord-bot-creation.md) - Bot creation tutorial
- [🌍 MongoDB Setup](./GitAssets/docs/MongoDB.md) - Database installation guide
- [📋 License Enforcement](./GitAssets/docs/License-Enforcement.md) - GPL v3.0 compliance guide
- [🗺️ Development Roadmap](./GitAssets/docs/Development-roadmap.md) - Project roadmap and status

---

## 🛠 Tech Stack 
- **[discord.js v14](https://discord.js.org)** - Modern Discord API wrapper with full TypeScript support
- **[MongoDB](https://www.mongodb.com)** - NoSQL database with optimized schemas and indexes
- **[Bun](https://bun.sh)** - Fast JavaScript runtime and package manager
- **[Mongoose](https://mongoosejs.com)** - MongoDB object modeling for Node.js
- **[dotenv](https://github.com/motdotla/dotenv)** - Environment variable management
- **[discord-hybrid-sharding](https://github.com/meister03/discord-hybrid-sharding)** - Advanced sharding support
- **[discord-html-transcripts](https://github.com/ItzDerock/discord-html-transcripts)** - Ticket transcript generation

---

## ✨ Star History

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=MonishKrishna2009/Apatite-Bot&type=Date&theme=dark" />
  <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=MonishKrishna2009/Apatite-Bot&type=Date" />
  <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=MonishKrishna2009/Apatite-Bot&type=Date" />
</picture>

---

## 🤝 Contributing 
Contributions are welcome! Please open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** (GPL-3.0-or-later).

### 🔓 What this means:

- ✅ **Free to use** - You can use this software for any purpose
- ✅ **Free to modify** - You can change the code to suit your needs  
- ✅ **Free to distribute** - You can share copies with others
- ✅ **Source code available** - Full source code is provided
- ⚠️ **Copyleft** - Any derivative works must also be GPL v3.0 licensed

### 📋 Requirements for users:

- **Attribution** - You must include the original copyright notice
- **License preservation** - You must include the GPL v3.0 license text
- **Source code** - If you distribute the software, you must provide source code
- **No additional restrictions** - You cannot add proprietary restrictions

### 🔗 Legal Resources:

- [GPL v3.0 License Text](https://www.gnu.org/licenses/gpl-3.0.html)
- [GPL v3.0 FAQ](https://www.gnu.org/licenses/gpl-faq.html)
- [Free Software Foundation](https://www.fsf.org/)

### ⚖️ Compliance:

This project includes automated license compliance checking to ensure all source files contain proper GPL v3.0 headers and that the project meets all legal requirements. [(REFER THIS)](./GitAssets/docs/License-Enforcement.md)

---
