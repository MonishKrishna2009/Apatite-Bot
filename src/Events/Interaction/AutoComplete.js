const Event = require("../../Structure/Handlers/BaseEvent");
const { Events , MessageFlags} = require("discord.js");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

class AutoComplete extends Event {
  constructor(client) {
    super(client, {
      name: Events.InteractionCreate,
    });
  }

  async execute(interaction) {
    const { client } = this;
    if (!interaction.isAutocomplete()) return;
    const autoComplete = client.autoComplete.get(interaction.commandName);
    if (!autoComplete) return;

    try {
      await autoComplete.execute(interaction, client);
    } catch (error) {
      logger.error(error);
      if (interaction.replied) {
        await interaction.editReply({
          content: "Catch an error while running this command.",
          flags: MessageFlags.EPHEMERAL,
        });
      } else {
        await interaction.reply({
          content: "Catch an error while running this command.",
          flags: MessageFlags.EPHEMERAL,
        });
      }
    }
  }
}

module.exports = AutoComplete;