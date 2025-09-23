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

const { WebhookClient } = require("discord.js");
const { inspect } = require("util");
const { Logger } = require("../Functions/index");
const logger = new Logger();
const config = require("../Configs/config");

async function ClientErrorHandler(client) {
  if (!config.logWebhook || config.logWebhook.length === 0) {
    logger.warn("No log webhook configured for ClientErrorHandler");
    return;
  }
  const webhook = new WebhookClient({
    url: config.logWebhook,
  });
  client.on("error", (err) => {
    logger.custom(`${err}`);
    return webhook.send({
      content: `⛔ **Discord API Error** \`\`\`${inspect(err, {
        depth: 0,
      }).slice(0, 1990)}\`\`\``,
    });
  });
}async function ErrorHandler() {
  if (!config.logWebhook || config.logWebhook.length === 0) {
    logger.warn("No log webhook configured for ErrorHandler");
    return;
  }
  const webhook = new WebhookClient({
    url: config.logWebhook,
  });
  logger.success("Error Handler has been loaded");

  process.on("unhandledRejection", (reason, promise) => {
    logger.custom(`${reason}`);

    webhook.send({
      content: `## ‼️ Unhandled Rejection/Catch`,
    });
    webhook.send({
      content: `**Reason** \`\`\`${inspect(reason, { depth: 0 }).slice(
        0,
        1990
      )}\`\`\``,
    });
    return webhook.send({
      content: `**Promise** \`\`\`${inspect(promise, { depth: 0 }).slice(
        0,
        1990
      )}\`\`\``,
    });
  });

  process.on("uncaughtException", (err, origin) => {
    logger.custom(`${err}`);

    webhook.send({
      content: `## ‼️ Uncaught Exception/Catch`,
    });
    webhook.send({
      content: `**Error** \`\`\`${inspect(err, { depth: 0 }).slice(
        0,
        1990
      )}\`\`\``,
    });
    return webhook.send({
      content: `**Origin** \`\`\`${inspect(origin, { depth: 0 }).slice(
        0,
        1990
      )}\`\`\``,
    });
  });

  process.on("uncaughtExceptionMonitor", (err, origin) => {
    logger.custom(`${err}`);

    webhook.send({
      content: `## ‼️ Uncaught Exception Monitor`,
    });
    webhook.send({
      content: `**Error** \`\`\`${inspect(err, { depth: 0 }).slice(
        0,
        1990
      )}\`\`\``,
    });
    return webhook.send({
      content: `**Origin** \`\`\`${inspect(origin, { depth: 0 }).slice(
        0,
        1990
      )}\`\`\``,
    });
  });

  process.on("warning", (warn) => {
    logger.custom(`${warn}`);

    webhook.send({
      content: `## ⚠️ Uncaught Exception Monitor Warning`,
    });
    return webhook.send({
      content: `**Warn** \`\`\`${inspect(warn, { depth: 0 }).slice(
        0,
        1990
      )}\`\`\``,
    });
  });
}
module.exports = { ErrorHandler, ClientErrorHandler };