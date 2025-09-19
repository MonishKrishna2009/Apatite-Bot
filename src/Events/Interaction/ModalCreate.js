const Event = require("../../Structure/Handlers/BaseEvent");
const { Events, MessageFlags } = require("discord.js");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

class ModalCreate extends Event {
  constructor(client) {
    super(client, {
      name: Events.InteractionCreate,
    });
  }

  async execute(interaction) {
    const { client } = this;
    if (!interaction.isModalSubmit()) return;

    let modal = client.modals.get(interaction.customId);

    // 🔎 If no exact match, try regex match
    if (!modal) {
      modal = [...client.modals.values()].find((m) => {
        if (m.id instanceof RegExp) return m.id.test(interaction.customId);
        return false;
      });
    }

    if (!modal) return;

    try {
      await modal.execute(interaction, client);
    } catch (error) {
      logger.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "⚠️ An error occurred while processing this modal.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "⚠️ An error occurred while processing this modal.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

}

module.exports = ModalCreate;