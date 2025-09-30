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

const Event = require("../../Structure/Handlers/BaseEvent.js");
const { Logger } = require("../../Structure/Functions/index.js");
const { Events, AuditLogEvent } = require("discord.js");
const logger = new Logger();

class StickerUpdateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildStickersUpdate,
        });
    }

    async execute(oldStickers, newStickers) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for sticker update log');
                return;
            }
            
            // Skip if no guild - try newStickers first, then fallback to oldStickers
            const guild = newStickers.first()?.guild || oldStickers.first()?.guild;
            if (!guild) return;

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed, auditEntry) => {
                if (auditEntry?.executor) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `Sticker Updated • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Check for added stickers
            const addedStickers = newStickers.filter(sticker => !oldStickers.has(sticker.id));
            if (addedStickers.size > 0) {
                // Get audit entry for sticker creation
                const auditEntry = await logManager.getAuditLogEntry(guild, AuditLogEvent.StickerCreate);
                
                let description = `>>> **Added Stickers**: ${addedStickers.size}\n`;
                
                // Show first few stickers
                const stickerList = addedStickers.first(3).map(sticker => 
                    `\`${sticker.name}\` (${sticker.format})`
                ).join('\n');
                
                description += stickerList;
                
                if (addedStickers.size > 3) {
                    description += `\n...and ${addedStickers.size - 3} more`;
                }

                const embed = logManager.createLogEmbed(
                    "STICKER_UPDATE",
                    0x57F287,
                    "**Server stickers added**",
                    description
                );

                setExecutorFooter(embed, auditEntry);
                await logManager.sendPrivacyLog("serverLog", embed);
            }

            // Check for removed stickers
            const removedStickers = oldStickers.filter(sticker => !newStickers.has(sticker.id));
            if (removedStickers.size > 0) {
                // Get audit entry for sticker deletion
                const auditEntry = await logManager.getAuditLogEntry(guild, AuditLogEvent.StickerDelete);
                
                let description = `>>> **Removed Stickers**: ${removedStickers.size}\n`;
                
                // Show first few sticker names
                const stickerNames = removedStickers.first(3).map(sticker => 
                    `\`${sticker.name}\``
                ).join(', ');
                
                description += stickerNames;
                
                if (removedStickers.size > 3) {
                    description += `, and ${removedStickers.size - 3} more`;
                }

                const embed = logManager.createLogEmbed(
                    "STICKER_UPDATE",
                    0xED4245,
                    "**Server stickers removed**",
                    description
                );

                setExecutorFooter(embed, auditEntry);
                await logManager.sendPrivacyLog("serverLog", embed);
            }

            // Check for updated stickers (name or description changes)
            const updatedStickers = newStickers.filter(sticker => {
                const oldSticker = oldStickers.get(sticker.id);
                return oldSticker && (oldSticker.name !== sticker.name || oldSticker.description !== sticker.description);
            });

            if (updatedStickers.size > 0) {
                // Get audit entry for sticker update
                const auditEntry = await logManager.getAuditLogEntry(guild, AuditLogEvent.StickerUpdate);
                
                let description = `>>> **Updated Stickers**: ${updatedStickers.size}\n`;
                
                // Show first few sticker updates
                const stickerUpdates = updatedStickers.first(3).map(sticker => {
                    const oldSticker = oldStickers.get(sticker.id);
                    let updateInfo = `\`${sticker.name}\``;
                    
                    if (oldSticker.name !== sticker.name) {
                        updateInfo += ` (Name: \`${oldSticker.name}\` → \`${sticker.name}\`)`;
                    }
                    
                    if (oldSticker.description !== sticker.description) {
                        updateInfo += ` (Description updated)`;
                    }
                    
                    return updateInfo;
                }).join('\n');
                
                description += stickerUpdates;
                
                if (updatedStickers.size > 3) {
                    description += `\n...and ${updatedStickers.size - 3} more`;
                }

                const embed = logManager.createLogEmbed(
                    "STICKER_UPDATE",
                    0x4287f5,
                    "**Server stickers updated**",
                    description
                );

                setExecutorFooter(embed, auditEntry);
                await logManager.sendPrivacyLog("serverLog", embed);
            }

        } catch (error) {
            logger.error("Error in StickerUpdateLogs:", error);
        }
    }
}

module.exports = StickerUpdateLogs;
