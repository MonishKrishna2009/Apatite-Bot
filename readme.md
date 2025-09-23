# Apatite Bot
⚡ The all-in-one open-source Discord bot for esports, tournaments, and community management.

> [!IMPORTANT]
> This project is work-in-progress. Features may change frequently until v1.0 is released.
> Here is the [development roadmap](./GitAssets/docs/Development-roadmap.md) for this project!

A feature-rich **Discord bot** built with [discord.js v14](https://discord.js.org) and MongoDB, designed for **ticketing, player/team matchmaking (LFP/LFT)**, and advanced moderation tools.

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

- 👥 **LFP / LFT System**
  - **Multi-game Support**: Valorant, CS2, League of Legends (easily extensible)
  - **JSON Configuration**: Games and fields defined in config files, no code changes needed
  - **Dynamic Modals**: Modal fields generated automatically from JSON configuration
  - **Staff Review System**: Approvals/declines with comprehensive logging
  - **Auto-cleanup**: Automatic expiration and archiving of old requests
  - **User Controls**: Create, edit, cancel, resend requests
  - **Game-Specific Channels**: Separate review and public channels for each game
  - **Comprehensive Notifications**: Detailed DM notifications for all actions
  - [Read More →](./GitAssets/docs/Lfp-Lft%20System.md)

- 🎫 **Ticket System**
  - Create, close, reopen, and manage support tickets
  - Appeals, transcripts, and moderation workflow
  - [Read More →](./GitAssets/Indev.md)

- 🛡 **Moderation Tools**
  - Staff-only review handling
  - Role-based permissions
  - Action logging system
  - [Read More →](./GitAssets/Indev.md)

- 📜 **Logger**
  - Logs channel, message, member, and role events
  - Detailed audit trail
  - [Read More →](./GitAssets/Indev.md)

- ⚙️ **Configurable Structure**
  - Organized handlers for commands, events, and components
  - Easy-to-manage config files
  - [Read More →](./GitAssets/Indev.md)

> [!TIP]
> Each system has its own dedicated `.md` file inside `/docs`. Start there if you’re exploring a specific feature.
---

## 📂 Project Structure 

```yaml
src/
├── Commands/ # Slash Commands
├── Components/ # Buttons, Modals, Review Handlers
├── Events/ # Client & Interaction event listeners
├── Structure/ # Core bot structure (Clients, Configs, Functions, Handlers, Schemas)
```
> [!NOTE]
> Full explanation of folders: [Read More →](./GitAssets/Indev.md)

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

#LFP LFT Stuff
LF_ACTION_LOG_CHANNEL_ID= "1419819282329763890"
LF_MOD_ROLE_ID = "1416665731340177458"
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

## 📑 Documentation 
- [Ticket System](./GitAssets/Indev.md)
- [Lfp/Lft System](./GitAssets/Lfp-Lft%20System.md)
- [Moderation](./GitAssets/Indev.md)
- [Logger](./GitAssets/Indev.md)
- [Structure](./GitAssets/Indev.md)
- [Handler](./GitAssets/Indev.md)
- [Config](./GitAssets/Indev.md)

---

## 🛠 Tech Stack 
- [discord.js V14](https://discord.js.org)
- [MongoDB](https://www.mongodb.com)

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
