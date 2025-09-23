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

import { ClusterManager, ReClusterManager } from "discord-hybrid-sharding";
import { Token } from "./src/Structure/Configs/config";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to run license compliance check
async function runLicenseComplianceCheck() {
  return new Promise((resolve, reject) => {
    console.log("🔍 Running license compliance check before startup...\n");
    
    const complianceScript = path.join(__dirname, "scripts", "license-compliance-check.js");
    const child = spawn("bun", ["run", complianceScript], {
      stdio: "inherit",
      cwd: __dirname
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log("\n✅ License compliance check passed! Starting bot...\n");
        resolve(true);
      } else {
        console.log("\n❌ License compliance check failed!");
        console.log("🚫 Bot startup blocked due to license compliance issues.");
        console.log("📋 Please fix the compliance issues before starting the bot.");
        console.log("💡 Run 'bun run license-check' to see detailed issues.\n");
        reject(new Error("License compliance check failed"));
      }
    });

    child.on("error", (error) => {
      console.error("❌ Error running compliance check:", error.message);
      reject(error);
    });
  });
}

// GPL v3.0 License Notice - Required for programs with terminal interaction
console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                           APATITE BOT                                        ║
║                                                                              ║
║  Copyright (C) 2025 Monish Krishna                                           ║
║                                                                              ║
║  This program comes with ABSOLUTELY NO WARRANTY; for details type 'show w'.  ║
║  This is free software, and you are welcome to redistribute it               ║
║  under certain conditions; type 'show c' for details.                        ║
║                                                                              ║
║  This program is free software: you can redistribute it and/or modify        ║
║  it under the terms of the GNU General Public License as published by        ║
║  the Free Software Foundation, either version 3 of the License, or           ║
║  (at your option) any later version.                                         ║
║                                                                              ║
║  For more information, visit: https://www.gnu.org/licenses/gpl-3.0.html      ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

// Run license compliance check before starting the bot
runLicenseComplianceCheck()
  .then(() => {
    // Compliance check passed, start the bot
    const manager = new ClusterManager("./src/Structure/Configs/botConfig.js", {
      token: Token,
      totalShards: "auto",
      shardsPerClusters: 2,
      totalClusters: "auto",
      mode: "process",
    });

    manager.on("clusterCreate", (cluster) =>
      console.log(`Cluster launched : ${cluster.id}`)
    );
    manager.on("clusterDestroy", (cluster) =>
      console.log(`Cluster destroyed : ${cluster.id}`)
    );
    manager.spawn();
  })
  .catch((error) => {
    console.error("🚫 Bot startup aborted:", error.message);
    process.exit(1);
  });