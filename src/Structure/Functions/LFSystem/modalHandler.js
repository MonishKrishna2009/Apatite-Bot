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

const { 
    ModalBuilder, 
    ActionRowBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require("discord.js");
const fs = require("fs");
const path = require("path");

/**
 * Modal Handler for LFP/LFT System
 * Dynamically generates modals based on JSON configuration files
 */
class ModalHandler {
    constructor() {
        this.lfpConfig = this.loadConfig("lfp.json");
        this.lftConfig = this.loadConfig("lft.json");
    }

    /**
     * Load configuration from JSON file
     * @param {string} filename - Name of the config file
     * @returns {Object} - Configuration object
     */
    loadConfig(filename) {
        try {
            const configPath = path.join(__dirname, "..", "..", "Configs", "LFConfig", filename);
            const configData = fs.readFileSync(configPath, "utf8");
            return JSON.parse(configData);
        } catch (error) {
            console.error(`Failed to load config ${filename}:`, error.message);
            return {};
        }
    }

    /**
     * Get available games for a request type
     * @param {string} requestType - "lfp" or "lft"
     * @returns {Array} - Array of game choices for Discord slash command
     */
    getGameChoices(requestType) {
        const config = requestType === "lfp" ? this.lfpConfig : this.lftConfig;
        return Object.keys(config).map(gameKey => ({
            name: config[gameKey].displayName,
            value: gameKey
        }));
    }

    /**
     * Get game configuration
     * @param {string} requestType - "lfp" or "lft"
     * @param {string} game - Game key (e.g., "valorant")
     * @returns {Object|null} - Game configuration or null if not found
     */
    getGameConfig(requestType, game) {
        const config = requestType === "lfp" ? this.lfpConfig : this.lftConfig;
        return config[game] || null;
    }

    /**
     * Create a modal for creating new requests
     * @param {string} requestType - "lfp" or "lft"
     * @param {string} game - Game key
     * @returns {ModalBuilder|null} - Generated modal or null if game not found
     */
    createCreateModal(requestType, game) {
        const gameConfig = this.getGameConfig(requestType, game);
        if (!gameConfig) {
            console.error(`Game config not found for ${requestType}/${game}`);
            return null;
        }

        const modal = new ModalBuilder()
            .setCustomId(`${requestType}_create_${game}`)
            .setTitle(`${requestType.toUpperCase()} - ${gameConfig.displayName}`);

        // Add fields based on configuration
        gameConfig.fields.forEach(field => {
            const textInput = new TextInputBuilder()
                .setCustomId(field.id)
                .setLabel(field.label)
                .setPlaceholder(field.placeholder)
                .setStyle(this.getTextInputStyle(field.style))
                .setRequired(field.required);

            // Add maxLength if specified
            if (field.maxLength) {
                textInput.setMaxLength(field.maxLength);
            }

            modal.addComponents(
                new ActionRowBuilder().addComponents(textInput)
            );
        });

        return modal;
    }

    /**
     * Create a modal for editing existing requests
     * @param {string} requestType - "lfp" or "lft"
     * @param {Object} request - Existing request object
     * @returns {ModalBuilder|null} - Generated modal or null if game not found
     */
    createEditModal(requestType, request) {
        const gameConfig = this.getGameConfig(requestType, request.game.toLowerCase());
        if (!gameConfig) {
            console.error(`Game config not found for ${requestType}/${request.game}`);
            return null;
        }

        const modal = new ModalBuilder()
            .setCustomId(`${requestType}_edit_${request._id}`)
            .setTitle(`Edit ${requestType.toUpperCase()} Request - ${gameConfig.displayName}`);

        // Pre-fill existing values
        const content = request.content || {};

        // Add fields based on configuration
        gameConfig.fields.forEach(field => {
            const textInput = new TextInputBuilder()
                .setCustomId(field.id)
                .setLabel(field.label)
                .setPlaceholder(field.placeholder)
                .setStyle(this.getTextInputStyle(field.style))
                .setRequired(field.required)
                .setValue(content[field.id] || "");

            // Add maxLength if specified
            if (field.maxLength) {
                textInput.setMaxLength(field.maxLength);
            }

            modal.addComponents(
                new ActionRowBuilder().addComponents(textInput)
            );
        });

        return modal;
    }

    /**
     * Convert style string to Discord.js TextInputStyle
     * @param {string} style - Style string from config ("SHORT" or "PARAGRAPH")
     * @returns {TextInputStyle} - Discord.js TextInputStyle
     */
    getTextInputStyle(style) {
        switch (style.toUpperCase()) {
            case "SHORT":
                return TextInputStyle.Short;
            case "PARAGRAPH":
                return TextInputStyle.Paragraph;
            default:
                console.warn(`Unknown text input style: ${style}, defaulting to Short`);
                return TextInputStyle.Short;
        }
    }

    /**
     * Extract content from modal submission
     * @param {Object} interaction - Discord interaction object
     * @param {string} requestType - "lfp" or "lft"
     * @param {string} game - Game key
     * @returns {Object} - Extracted content object
     */
    extractContent(interaction, requestType, game) {
        const gameConfig = this.getGameConfig(requestType, game);
        if (!gameConfig) {
            console.error(`Game config not found for ${requestType}/${game}`);
            return {};
        }

        const content = {};
        gameConfig.fields.forEach(field => {
            try {
                content[field.id] = interaction.fields.getTextInputValue(field.id);
            } catch (error) {
                console.warn(`Failed to get field ${field.id}:`, error.message);
                content[field.id] = "";
            }
        });

        return content;
    }

    /**
     * Generate embed description from content
     * @param {Object} content - Content object
     * @param {string} requestType - "lfp" or "lft"
     * @param {string} game - Game key
     * @returns {string} - Formatted embed description
     */
    generateEmbedDescription(content, requestType, game) {
        const gameConfig = this.getGameConfig(requestType, game);
        if (!gameConfig) {
            return "Content not available";
        }

        let description = "";
        gameConfig.fields.forEach(field => {
            const value = content[field.id] || "N/A";
            description += `**${field.label}:** ${value}\n`;
        });

        return description;
    }

    /**
     * Reload configurations (useful for hot-reloading)
     */
    reloadConfigs() {
        this.lfpConfig = this.loadConfig("lfp.json");
        this.lftConfig = this.loadConfig("lft.json");
        console.log("Modal configurations reloaded");
    }

    /**
     * Get all available games for both request types
     * @returns {Object} - Object with lfp and lft game lists
     */
    getAllGames() {
        return {
            lfp: Object.keys(this.lfpConfig),
            lft: Object.keys(this.lftConfig)
        };
    }

    /**
     * Validate game configuration
     * @param {string} requestType - "lfp" or "lft"
     * @param {string} game - Game key
     * @returns {boolean} - True if configuration is valid
     */
    validateGameConfig(requestType, game) {
        const gameConfig = this.getGameConfig(requestType, game);
        if (!gameConfig) return false;

        // Check required properties
        const requiredProps = ["displayName", "fields"];
        for (const prop of requiredProps) {
            if (!gameConfig[prop]) {
                console.error(`Missing required property '${prop}' in ${requestType}/${game} config`);
                return false;
            }
        }

        // Validate fields
        if (!Array.isArray(gameConfig.fields) || gameConfig.fields.length === 0) {
            console.error(`Invalid fields array in ${requestType}/${game} config`);
            return false;
        }

        // Validate each field
        for (const field of gameConfig.fields) {
            const requiredFieldProps = ["id", "label", "style"];
            for (const prop of requiredFieldProps) {
                if (!field[prop]) {
                    console.error(`Missing required field property '${prop}' in ${requestType}/${game} config`);
                    return false;
                }
            }
        }

        return true;
    }
}

// Create singleton instance
const modalHandler = new ModalHandler();

module.exports = modalHandler;
