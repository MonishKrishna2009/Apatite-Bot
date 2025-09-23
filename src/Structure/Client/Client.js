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

const { Client, Collection } = require("discord.js");
const { EventHandler } = require("../Handlers/EventHandler");
const { Logger } = require("../Functions/index");
const  Config  = require("../Configs/config");
const { execSync } = require("child_process");
const path = require("path");

const logger = new Logger();

// Function to run quick license compliance check
function runQuickComplianceCheck() {
  try {
    const complianceScript = path.join(__dirname, "..", "..", "..", "scripts", "license-compliance-check.js");
    execSync(`bun run "${complianceScript}"`, { stdio: "pipe" });
    logger.info("✅ License compliance check passed");
    return true;
  } catch (error) {
    logger.error("❌ License compliance check failed - Bot startup blocked");
    logger.error("🚫 Please fix license compliance issues before starting the bot");
    process.exit(1);
  }
}

class BotClient extends Client {
  constructor(options) {
    super(options);

    this.config = Config;
    this.events = new Collection();
    this.buttons = new Collection();
    this.modals = new Collection();
    this.autoComplete = new Collection();
    this.slashCommands = new Collection();
  }
  async start() {
    // Run license compliance check before starting
    runQuickComplianceCheck();
    
    await this.registerModules();
    await this.login(this.config.botToken);
  }
  async registerModules() {
    const { loadEvents } = new EventHandler();

    try {
      await loadEvents(this);
    } catch (error) {
      logger.error(error);
    }
  }
}

module.exports = { BotClient };