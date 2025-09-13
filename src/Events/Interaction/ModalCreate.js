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
    const modal = client.modals.get(interaction.customId);
    if (!modal) return;

    try {
      await modal.execute(interaction, client);
    } catch (error) {
      logger.error(error);
      if (interaction.replied) {
        await interaction.editReply({
          content: "Catch an error while running this command.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "Catch an error while running this command.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
}

module.exports = ModalCreate;