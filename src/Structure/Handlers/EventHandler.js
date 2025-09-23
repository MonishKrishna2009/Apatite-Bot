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

const fs = require("fs");
const path = require("path");
const AsciiTable = require("ascii-table");
const { Logger } = require("../Functions/index");
const logger = new Logger();

class EventHandler {
  constructor() {}

  async loadEvents(client, gg) {
    const EventsTable = new AsciiTable()
      .setHeading(
        "⠀⠀⠀⠀",
        "⠀⠀⠀⠀⠀⠀⠀⠀Events⠀⠀⠀⠀⠀⠀⠀⠀",
        "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀File⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
        "⠀⠀Status⠀⠀"
      )
      .setBorder("┋", "═", "●", "●")
      .setAlign(3, AsciiTable.CENTER);
    const eventPath = fs.readdirSync(path.join(__dirname, "../../Events"));

    await client.events.clear();
    let eventCount = 0;

    eventPath.forEach((dir) => {
      const eventFolder = fs
        .readdirSync(path.join(__dirname, `../../Events/${dir}`))
        .filter((file) => file.endsWith(".js"));

      eventFolder.forEach(async (file) => {
        const eventFile = require(`../../Events/${dir}/${file}`);

        const event = new eventFile(client);
        eventCount++;
        EventsTable.addRow(
          eventCount.toString() + ".",
          event.name,
          file,
          "» 🌱 «"
        );
        const execute = (...args) => event.execute(...args, client);
        client.events.set(file, {
          execute: execute,
          name: event.name,
        });

        if (event.ONCE) {
          client.once(event.name, execute);
        } else {
          client.on(event.name, execute);
        }
      });
    });
    console.log(EventsTable.toString());
    logger.success(`</> • ${eventCount} Events has been loaded.`);
  }
}

module.exports = { EventHandler };