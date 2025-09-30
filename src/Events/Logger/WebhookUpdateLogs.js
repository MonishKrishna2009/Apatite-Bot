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

class WebhookUpdateLogs extends Event {
    constructor(client) {
        super(client, {
            name: Events.WebhooksUpdate,
        });
    }

    async execute(channel) {
        const { client } = this;
        const logManager = client.logManager;
        
        // Check if logging is enabled - compatible with both boolean and object configs
        if (!(client.config.logging?.enabled ?? client.config.logging)) return;
        
        try {
            // Skip if logManager is not available
            if (!logManager) {
                logger.warn('LogManager not available for webhook update log');
                return;
            }
            
            // Skip if no guild (shouldn't happen but safety check)
            if (!channel.guild) return;

            // Get who updated the webhook from audit logs
            const auditEntry = await logManager.getAuditLogEntry(channel.guild, AuditLogEvent.WebhookUpdate, channel.id);

            // Helper: build footer with executor if exists
            const setExecutorFooter = (embed) => {
                if (auditEntry) {
                    embed.setFooter({
                        text: `${auditEntry.executor.tag} • ${new Date().toLocaleTimeString()}`,
                        iconURL: auditEntry.executor.displayAvatarURL()
                    });
                } else {
                    embed.setFooter({
                        text: `Webhook Updated • ${new Date().toLocaleTimeString()}`
                    });
                }
                return embed;
            };

            // Create webhook update log embed
            let description = `>>> **Channel**: ${channel.name} (\`${channel.id}\`)\n` +
                `**Channel Type**: ${channel.type}\n`;

            // Try to fetch webhooks to get more details
            try {
                const webhooks = await channel.fetchWebhooks();
                if (webhooks.size > 0) {
                    description += `**Webhooks**: ${webhooks.size} webhook(s)\n`;
                    
                    // List webhook names (first 3 to avoid embed limits)
                    const webhookNames = Array.from(webhooks.values())
                        .slice(0, 3)
                        .map(webhook => webhook.name || 'Unnamed')
                        .join(', ');
                    
                    description += `**Webhook Names**: ${webhookNames}`;
                    if (webhooks.size > 3) {
                        description += ` (+${webhooks.size - 3} more)`;
                    }
                    description += `\n`;
                } else {
                    description += `**Webhooks**: No webhooks found\n`;
                }
            } catch (error) {
                logger.warn(`Could not fetch webhooks for channel ${channel.id}:`, error.message);
                description += `**Webhooks**: Unable to fetch webhook details\n`;
            }

            description += `**Updated**: <t:${Math.floor(Date.now() / 1000)}:R>`;

            const embed = logManager.createLogEmbed(
                "WEBHOOK_UPDATE",
                0x4287f5,
                "**Webhook updated**",
                description
            );

            setExecutorFooter(embed);
            await logManager.sendPrivacyLog("serverLog", embed);
        } catch (error) {
            logger.error("Error in WebhookUpdateLogs:", error);
        }
    }
}

module.exports = WebhookUpdateLogs;
