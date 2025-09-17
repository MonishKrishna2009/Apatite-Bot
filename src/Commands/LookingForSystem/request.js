const Command = require("../../Structure/Handlers/BaseCommand");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Colors,
  ComponentType,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
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
          sub.setName("list").setDescription("List your LFP/LFT requests")
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
            .setDescription("Resend an archived/expired request to the review channel")
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
      // -------------------- "LIST" --------------------
      if (sub === "list") {
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

          return interaction.reply({
            embeds: [noReq],
            flags: MessageFlags.Ephemeral,
          });
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
            .setFooter({
              text: `Page ${page + 1} of ${totalPages} | Total: ${reqs.length} | Pending: ${counts.pending || 0} • Approved: ${counts.approved || 0} • Declined: ${counts.declined || 0} • Archived: ${counts.archived || 0} • Expired: ${counts.expired || 0}`,
            })
            .setColor(Colors.Blue)
            .setTimestamp();
        };

        const buildMenu = (page) => {
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("page_select")
              .setPlaceholder("Jump to page...")
              .addOptions(
                [...Array(totalPages)].map((_, i) => ({
                  label: `Page ${i + 1}`,
                  value: i.toString(),
                  default: i === page,
                }))
              )
          );
        };

        const msg = await interaction.reply({
          embeds: [buildEmbed(page)],
          components: [buildMenu(page)],
          flags: MessageFlags.Ephemeral
        });

        const collector = msg.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 60_000,
        });

        collector.on("collect", async (int) => {
          if (int.user.id !== interaction.user.id) {
            return int.reply({
              content: "This is not your menu.",
              flags: MessageFlags.Ephemeral,
            });
          }

          page = parseInt(int.values[0]);

          await int.update({
            embeds: [buildEmbed(page)],
            components: [buildMenu(page)],
          });
        });

        collector.on("end", async () => {
          await msg.edit({ components: [] }).catch(() => null);
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

        // Try deleting review message
        if (req.messageId) {
          try {
            const ch = await client.channels.fetch(config.valoReviewChannelId);
            const m = await ch.messages.fetch(req.messageId).catch(() => null);
            if (m) await m.delete();
            triedDeletes.push("review message");
          } catch { }
        }

        // Try deleting public message
        if (req.publicMessageId) {
          try {
            const ch = await client.channels.fetch(config.valolfpLftChannelId);
            const m = await ch.messages.fetch(req.publicMessageId).catch(() => null);
            if (m) await m.delete();
            triedDeletes.push("public message");
          } catch { }
        }

        // 🚨 Delete from DB instead of archiving
        await LFRequest.deleteOne({ _id: req._id });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Request Cancelled & Removed")
              .setDescription(
                `Your request \`${req._id}\` has been cancelled and removed from the system.${triedDeletes.length ? ` Deleted: ${triedDeletes.join(", ")}` : ""
                }`
              )
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
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Not Allowed")
                .setColor(Colors.Red)
                .setDescription("You can only resend your own requests."),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!["archived", "expired"].includes(req.status)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("⚠️ Cannot Resend")
                .setColor(Colors.Yellow)
                .setDescription("Only archived or expired requests can be resent."),
            ],
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
            new ButtonBuilder()
              .setCustomId(`lfreview_${req._id}_approve`)
              .setLabel("✅ Approve")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`lfreview_${req._id}_decline`)
              .setLabel("❌ Decline")
              .setStyle(ButtonStyle.Danger)
          );

          const m = await reviewCh.send({ embeds: [reviewEmbed], components: [row] });
          req.messageId = m.id;
          await req.save();
        } catch (err) {
          logger.warn(`Failed to send resent request ${req._id}: ${err.message}`);
        }

        return;
      }
    } catch (err) {
      logger.error(`RequestsCommand error: ${err.stack}`);
      return interaction.reply({
        content: "An error occurred, please try again later.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = RequestsCommand;
