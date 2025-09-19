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
  - Submit requests for **Looking For Players (LFP)** or **Looking For Team (LFT)**
  - Staff review system with approvals/declines
  - Automatic posting to public channels
  - User controls: create, list, cancel, resend
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
VALO_LFP_LFT_CHANNEL_ID = ""
VALO_LF_REVIEW_CHANNEL_ID = ""
VALO_LF_MOD_ROLE_ID = ""
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

## 📜 License 
This project is licensed under the **Apache-2.0** License. See [LICENSE](LICENSE) for details.
