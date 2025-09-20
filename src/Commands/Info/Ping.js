const Command = require("../../Structure/Handlers/BaseCommand");
const { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } = require("discord.js");

class Ping extends Command {
  constructor(client) {
    super(client, {
      data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's ping!")
        .setDMPermission(false),
      options: {
        devOnly: false,
      },
    });
  }
  async execute(interaction, client) {
    await interaction.reply({content: `> 🏓 Pong! Calculating ping...`, flags: MessageFlags.Ephemeral});
    const msg = await interaction.fetchReply();
    const ping = Math.floor(
      msg.createdTimestamp - interaction.createdTimestamp
    );
    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle("📡 Bot Ping")
      .setDescription(
        `**${client.user.username}'s current ping:** \`${ping}ms\`\n\n` +
        `> **Discord Gateway Ping:** \`${client.ws.ping}ms\`\n` +
        `> **Bot Uptime:** <t:${Math.floor(client.readyTimestamp / 1000)}:R>`
      )
      .setFooter({ text: "Ping command executed", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    interaction.editReply({ embeds: [embed], content: "",});
  }
}

module.exports = Ping;