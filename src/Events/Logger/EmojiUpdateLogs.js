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

class EmojiUpdateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.GuildEmojisUpdate,
        });
    }

    async execute(guild, newEmojis) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for emoji update log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!guild) return;

            // Initialize emoji snapshots if not exists
            client._emojiSnapshots = client._emojiSnapshots || {};
            
            // Get old emojis from snapshot, fallback to newEmojis if no snapshot exists
            const oldEmojis = client._emojiSnapshots[guild.id] || newEmojis.clone();

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed, auditEntry) => {
                if (auditEntry) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `Emoji Updated • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Check for added emojis
            const addedEmojis = newEmojis.filter(emoji => !oldEmojis.has(emoji.id));
            if (addedEmojis.size > 0) {
                // Get audit entry for emoji creation
                const auditEntry = await logManager.getAuditLogEntry(guild, AuditLogEvent.EmojiCreate);
                
                let description = `>>> **Added Emojis**: ${addedEmojis.size}\n`;
                
                // Show first few emojis
                const emojiList = addedEmojis.first(3).map(emoji => 
                    `${emoji.animated ? '<a:' : '<:'}${emoji.name}:${emoji.id}> \`${emoji.name}\``
                ).join('\n');
                
                description += emojiList;
                
                if (addedEmojis.size > 3) {
                    description += `\n...and ${addedEmojis.size - 3} more`;
                }

                const embed = logManager.createLogEmbed(
                    "EMOJI_UPDATE",
                    0x57F287,
                    "**Server emojis added**",
                    description
                );

                setExecutorFooter(embed, auditEntry);
                await logManager.sendPrivacyLog("serverLog", embed);
                return;
            }

            // Check for removed emojis
            const removedEmojis = oldEmojis.filter(emoji => !newEmojis.has(emoji.id));
            if (removedEmojis.size > 0) {
                // Get audit entry for emoji deletion
                const auditEntry = await logManager.getAuditLogEntry(guild, AuditLogEvent.EmojiDelete);
                
                let description = `>>> **Removed Emojis**: ${removedEmojis.size}\n`;
                
                // Show first few emoji names
                const emojiNames = removedEmojis.first(3).map(emoji => 
                    `\`${emoji.name}\``
                ).join(', ');
                
                description += emojiNames;
                
                if (removedEmojis.size > 3) {
                    description += `, and ${removedEmojis.size - 3} more`;
                }

                const embed = logManager.createLogEmbed(
                    "EMOJI_UPDATE",
                    0xED4245,
                    "**Server emojis removed**",
                    description
                );

                setExecutorFooter(embed, auditEntry);
                await logManager.sendPrivacyLog("serverLog", embed);
                return;
            }

            // Check for updated emojis (name changes)
            const updatedEmojis = newEmojis.filter(emoji => {
                const oldEmoji = oldEmojis.get(emoji.id);
                return oldEmoji && oldEmoji.name !== emoji.name;
            });

            if (updatedEmojis.size > 0) {
                // Get audit entry for emoji update
                const auditEntry = await logManager.getAuditLogEntry(guild, AuditLogEvent.EmojiUpdate);
                
                let description = `>>> **Updated Emojis**: ${updatedEmojis.size}\n`;
                
                // Show first few emoji updates
                const emojiUpdates = updatedEmojis.first(3).map(emoji => {
                    const oldEmoji = oldEmojis.get(emoji.id);
                    return `${emoji.animated ? '<a:' : '<:'}${emoji.name}:${emoji.id}> \`${oldEmoji.name}\` → \`${emoji.name}\``;
                }).join('\n');
                
                description += emojiUpdates;
                
                if (updatedEmojis.size > 3) {
                    description += `\n...and ${updatedEmojis.size - 3} more`;
                }

                const embed = logManager.createLogEmbed(
                    "EMOJI_UPDATE",
                    0x4287f5,
                    "**Server emojis updated**",
                    description
                );

                setExecutorFooter(embed, auditEntry);
                await logManager.sendPrivacyLog("serverLog", embed);
                return;
            }

            // Update snapshot for future comparisons
            client._emojiSnapshots[guild.id] = newEmojis.clone();

        } catch (error) {
            logger.error("Error in EmojiUpdateLogs:", error);
        }
    }
}

module.exports = EmojiUpdateLogs;
