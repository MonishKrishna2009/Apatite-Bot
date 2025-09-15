const Command = require("../../Structure/Handlers/BaseCommand");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ComponentType,
} = require("discord.js");

const config = require("../../Structure/Configs/config");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

const { renderRequestEmbed } = require("../../Structure/Functions/renderRequestEmbed");

class RequestsCommand extends Command {
  constructor(client) {
    super(client, {
      data: new SlashCommandBuilder()
        .setName("requests")
        .setDescription("Manage your LFP/LFT entries.")
        .addSubcommand((sub) =>
          sub.setName("my").setDescription("List your requests (with pagination)")
        )
        .addSubcommand((sub) =>
          sub
            .setName("cancel")
            .setDescription("Cancel one of your requests")
            .addStringOption((opt) =>
              opt
                .setName("request_id")
                .setDescription("ID of the request to cancel")
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("resend")
            .setDescription(
              "Resend an archived/expired request to the review channel"
            )
            .addStringOption((opt) =>
              opt
                .setName("request_id")
                .setDescription("ID of the request to resend")
                .setRequired(true)
            )
        )
        .setDMPermission(false),
      options: { devOnly: false },
    });
  }

  makeRequestPreview(req) {
    const createdAt = Math.floor(new Date(req.createdAt).getTime() / 1000);
    const primary =
      req.content?.teamName ||
      req.content?.riotID ||
      req.content?.lookingFor ||
      Object.values(req.content || {})[0] ||
      "No preview";

    return `• **${req.type}** | ${req.game} | ${req.status.toUpperCase()} | <t:${createdAt}:R>\n  ↳ ${primary}\n  ID: \`${req._id}\``;
  }

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    try {
      // -------------------- "MY" (with pagination) --------------------
      if (sub === "my") {
        const reqs = await LFRequest.find({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
        }).sort({ createdAt: -1 });

        if (!reqs.length) {
          const noReq = new EmbedBuilder()
            .setTitle("📭 No Requests Found")
            .setDescription("You don't have any requests in this server.")
            .setColor(Colors.Yellow)
            .setTimestamp();

          return interaction.reply({ embeds: [noReq], flags: MessageFlags.Ephemeral });
        }

        const perPage = 5;
        let page = 0;
        const totalPages = Math.ceil(reqs.length / perPage);

        const buildEmbed = (page) => {
          const slice = reqs.slice(page * perPage, (page + 1) * perPage);
          const counts = reqs.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {});

          return new EmbedBuilder()
            .setTitle("📋 Your Requests")
            .setDescription(slice.map(r => this.makeRequestPreview(r)).join("\n\n"))
            .setFooter({ text: `Page ${page + 1} of ${totalPages} | Total: ${reqs.length} | Pending: ${counts.pending || 0} • Approved: ${counts.approved || 0} • Declined: ${counts.declined || 0} • Archived: ${counts.archived || 0} • Expired: ${counts.expired || 0}` })
            .setColor(Colors.Blue)
            .setTimestamp();
        };

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId("next").setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(totalPages <= 1)
        );

        const msg = await interaction.reply({
          embeds: [buildEmbed(page)],
          components: [row],
          flags: MessageFlags.Ephemeral,
          withResponse: true,
        });

        const collector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60_000,
        });

        collector.on("collect", async (btnInt) => {
          if (btnInt.user.id !== interaction.user.id)
            return btnInt.reply({ content: "This is not your menu.", flags: MessageFlags.Ephemeral });

          if (btnInt.customId === "prev" && page > 0) page--;
          if (btnInt.customId === "next" && page < totalPages - 1) page++;

          const newRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId("next").setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1)
          );

          await btnInt.update({ embeds: [buildEmbed(page)], components: [newRow] });
        });

        collector.on("end", async () => {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId("next").setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(true)
          );
          await msg.edit({ components: [disabledRow] }).catch(() => null);
        });

        return;
      }

      // -------------------- "CANCEL" --------------------
      if (sub === "cancel") {
        const id = interaction.options.getString("request_id");
        const req = await LFRequest.findById(id);

        if (!req || req.guildId !== interaction.guild.id) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Request Not Found")
                .setDescription("No request found with that ID in this server.")
                .setColor(Colors.Red),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (req.userId !== interaction.user.id) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Not Allowed")
                .setDescription("You can only cancel your own requests.")
                .setColor(Colors.Red),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!["pending", "approved"].includes(req.status)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⚠️ Cannot Cancel")
                .setDescription("Only requests with status `pending` or `approved` can be cancelled.")
                .setColor(Colors.Yellow),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const triedDeletes = [];

        // delete review msg
        if (req.messageId) {
          try {
            const ch = await client.channels.fetch(config.valoReviewChannelId);
            const msg = await ch.messages.fetch(req.messageId).catch(() => null);
            if (msg) await msg.delete();
            triedDeletes.push("review message");
          } catch { }
        }

        // delete public msg
        if (req.publicMessageId) {
          try {
            const ch = await client.channels.fetch(config.valolfpLftChannelId);
            const msg = await ch.messages.fetch(req.publicMessageId).catch(() => null);
            if (msg) await msg.delete();
            triedDeletes.push("public message");
          } catch { }
        }

        req.status = "archived";
        await req.save();

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Request Cancelled")
              .setDescription(`Your request \`${req._id}\` has been cancelled.${triedDeletes.length ? ` Removed: ${triedDeletes.join(", ")}` : ""}`)
              .setColor(Colors.Green),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // -------------------- "RESEND" --------------------
      if (sub === "resend") {
        const id = interaction.options.getString("request_id");
        const req = await LFRequest.findById(id);

        if (!req || req.guildId !== interaction.guild.id) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle("❌ Request Not Found").setColor(Colors.Red)],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (req.userId !== interaction.user.id) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle("❌ Not Allowed").setColor(Colors.Red).setDescription("You can only resend your own requests.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!["archived", "expired"].includes(req.status)) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle("⚠️ Cannot Resend").setColor(Colors.Yellow).setDescription("Only archived or expired requests can be resent.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        req.status = "pending";
        req.reviewedBy = null;
        req.messageId = null;
        req.publicMessageId = null;
        await req.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Request Resent")
              .setDescription(`Your request \`${req._id}\` has been resent for review.`)
              .setColor(Colors.Green),
          ],
          flags: MessageFlags.Ephemeral,
        });

        try {
          const author = await client.users.fetch(req.userId);
          const reviewCh = await client.channels.fetch(config.valoReviewChannelId);
          const reviewEmbed = renderRequestEmbed(req, author);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`lfreview_${req._id}_approve`).setLabel("✅ Approve").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`lfreview_${req._id}_decline`).setLabel("❌ Decline").setStyle(ButtonStyle.Danger)
          );

          const msg = await reviewCh.send({ embeds: [reviewEmbed], components: [row] });
          req.messageId = msg.id;
          await req.save();
        } catch (err) {
          logger.warn(`Failed to send resent request ${req._id}: ${err.message}`);
        }

        return;
      }
    } catch (err) {
      logger.error(`RequestsCommand error: ${err.stack}`);
      return interaction.reply({ content: "An error occurred, please try again later.", flags: MessageFlags.Ephemeral });
    }
  }
}

module.exports = RequestsCommand;
