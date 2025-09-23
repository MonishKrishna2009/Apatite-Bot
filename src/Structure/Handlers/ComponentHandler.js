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
const { Logger } = require("../Functions/index");
const logger = new Logger();

class ComponentHandler {
  constructor() {}

  async loadComponents(client, update) {
    const componentPath = fs.readdirSync(
      path.join(__dirname, "../../Components")
    );

    await client.buttons.clear();
    await client.modals.clear();
    await client.autoComplete.clear();
    let buttonCount = 0;
    let modalCount = 0;
    let autoCompleteCount = 0;

    componentPath.forEach((dir) => {
      const componentFolder = fs
        .readdirSync(path.join(__dirname, `../../Components/${dir}`))
        .filter((file) => file.endsWith(".js"));

      componentFolder.forEach(async (file) => {
        const componentFile = require(`../../Components/${dir}/${file}`);
        const component = new componentFile(client);
        switch (dir) {
          case "Buttons":
            client.buttons.set(component.id, component);
            buttonCount++;
            break;
          case "Modals":
            client.modals.set(component.id, component);
            modalCount++;
            break;
          case "AutoComplete":
            client.autoComplete.set(component.id, component);
            autoCompleteCount++;
            break;
        }
      });
    });

    logger.info(`${buttonCount} Buttons has been loaded.`);
    logger.info(`${modalCount} Modals has been loaded.`);
    logger.info(`${autoCompleteCount} AutoComplete has been loaded.`);
  }
}

module.exports = { ComponentHandler };