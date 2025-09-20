const Event = require("../../Structure/Handlers/BaseEvent");
const { Events, MessageFlags } = require("discord.js");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

class ButtonCreate extends Event {
  constructor(client) {
    super(client, {
      name: Events.InteractionCreate,
    });
  }

  async execute(interaction) {
    const { client } = this;
    if (!interaction.isButton()) return;

    let button = client.buttons.get(interaction.customId);

    // If not found, try regex/prefix match
    if (!button) {
      for (const comp of client.buttons.values()) {
        // Regex match
        if (comp.id instanceof RegExp && comp.id.test(interaction.customId)) {
          button = comp;
          break;
        }

        // Prefix match
        if (typeof comp.id === "string" && interaction.customId.startsWith(comp.id)) {
          button = comp;
          break;
        }
      }
    }

    if (!button) return; // No matching component found

    try {
      await button.execute(interaction, client);
    } catch (error) {
      logger.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "⚠️ An error occurred while running this button.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "⚠️ An error occurred while running this button.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
}

module.exports = ButtonCreate;
