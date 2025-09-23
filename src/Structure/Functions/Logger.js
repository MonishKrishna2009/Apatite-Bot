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
const path = require("path");
const config = require("../Configs/config.js");
const webhook =
  config.logWebhook.length > 0
    ? new WebhookClient({
      url: config.logWebhook,
    })
    : undefined;

class Logger {
  constructor() {
    this.origin = this._getLogOrigin().split(/[\\/]/).pop();
  }
  _getLogOrigin() {
    let filename;

    let _pst = Error.prepareStackTrace;
    Error.prepareStackTrace = function (err, stack) {
      return stack;
    };
    try {
      let err = new Error();
      let callerfile;
      let currentfile;

      currentfile = err.stack.shift().getFileName();

      while (err.stack.length) {
        callerfile = err.stack.shift().getFileName();

        if (currentfile !== callerfile) {
          filename = callerfile;
          break;
        }
      }
    } catch (err) { }
    Error.prepareStackTrace = _pst;

    return filename;
  }

  error(content) {
    const output =
      new Date().toLocaleTimeString() +
      `  🛑  [` +
      `${this.origin.length > 25
        ? this.origin.substring(0, 17) + "..."
        : this.origin
      }` +
      `] ` +
      " ".repeat(20 - (this.origin.length > 20 ? 20 : this.origin.length)) +
      "| " +
      content;
    if (webhook) {
      webhook.send({
        content: `> \`\`\`${output}\`\`\``,
      });
    }
    console.log(output);
  }

  info(content) {
    const output =
      new Date().toLocaleTimeString() +
      `  ✉️   [` +
      `${this.origin.length > 25
        ? this.origin.substring(0, 17) + "..."
        : this.origin
      }` +
      `] ` +
      " ".repeat(20 - (this.origin.length > 20 ? 20 : this.origin.length)) +
      "| " +
      content;
    webhook.send({
      content: `> \`\`\`${output}\`\`\``,
    });
    console.log(output);
  }
  warn(content) {
    const output =
      new Date().toLocaleTimeString() +
      `  ⚠️   [` +
      `${this.origin.length > 25
        ? this.origin.substring(0, 17) + "..."
        : this.origin
      }` +
      `] ` +
      " ".repeat(20 - (this.origin.length > 20 ? 20 : this.origin.length)) +
      "| " +
      content;
    webhook.send({
      content: `> \`\`\`${output}\`\`\``,
    });
    console.log(output);
  }

  success(content) {
    const output =
      new Date().toLocaleTimeString() +
      `  ✅  [` +
      `${this.origin.length > 25
        ? this.origin.substring(0, 17) + "..."
        : this.origin
      }` +
      `] ` +
      " ".repeat(20 - (this.origin.length > 20 ? 20 : this.origin.length)) +
      "| " +
      content;
    webhook.send({
      content: `> \`\`\`${output}\`\`\``,
    });
    console.log(output);
  }
  custom(content) {
    console.log(
      new Date().toLocaleTimeString() +
      `  🛑  [` +
      `${this.origin.length > 20
        ? this.origin.substring(0, 17) + "..."
        : this.origin
      }` +
      `] ` +
      " ".repeat(20 - (this.origin.length > 20 ? 20 : this.origin.length)) +
      "| " +
      content
    );
  }
}

module.exports = { Logger };