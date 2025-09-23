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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const config = require("../../Structure/Configs/config");
const LFRequest = require("../../Structure/Schemas/LookingFor/lfplft");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();

const { renderRequestEmbed } = require("../../Structure/Functions/renderRequestEmbed");
const { 
  STATUS, 
  isValidRequestId, 
  canUserPerformAction, 
  createErrorEmbed, 
  createSuccessEmbed,
  createWarningEmbed,
  getRequestPreview,
  softDeleteRequest
} = require("../../Structure/Functions/lfHelpers");
const { logLFAction, getGameChannels } = require("../../Structure/Functions/lfActionLogger");

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
        .addSubcommand((sub) =>
          sub
            .setName("delete")
            .setDescription("Delete a request (soft delete)")
            .addStringOption((opt) =>
              opt
                .setName("request_id")
                .setDescription("ID of the request to delete")
                .setRequired(true)
            )
        )
        .setDMPermission(false),
      options: { devOnly: false },
    });
  }


  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    const id = interaction.options.getString("request_id");
    // ✅ Validate ID before DB call
    if (sub !== "list") {
      if (!isValidRequestId(id)) {
        return interaction.reply({
          embeds: [createErrorEmbed("Invalid Request ID", "That doesn't look like a valid request ID. Please use an ID from `/requests list`.")],
          flags: MessageFlags.Ephemeral,
        });
      }
    }


    try {
      // -------------------- "LIST" --------------------
      if (sub === "list") {
        const reqs = await LFRequest.find({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
        }).sort({ createdAt: -1 });

        if (!reqs.length) {
          return interaction.reply({
            embeds: [createWarningEmbed("No Requests Found", "You don't have any requests in this server.")],
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
            .setDescription(slice.map(r => getRequestPreview(r)).join("\n\n"))
            .setFooter({
              text: `Page ${page + 1} of ${totalPages} | Total: ${reqs.length} | Pending: ${counts.pending || 0} • Approved: ${counts.approved || 0} • Declined: ${counts.declined || 0} • Archived: ${counts.archived || 0} • Expired: ${counts.expired || 0} • Cancelled: ${counts.cancelled || 0} • Deleted: ${counts.deleted || 0}`,
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
            embeds: [createErrorEmbed("Request Not Found", "No request found with that ID in this server.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        // Check permissions
        const permissionCheck = canUserPerformAction(req, interaction.user.id, "cancel");
        if (!permissionCheck.allowed) {
          return interaction.reply({
            embeds: [createErrorEmbed("Cannot Cancel", permissionCheck.reason, req.status)],
            flags: MessageFlags.Ephemeral,
          });
        }

        const triedDeletes = [];

        // Get game-specific channels
        const channels = getGameChannels(config, req.game);

        // Try deleting review message
        if (req.messageId) {
          try {
            const ch = await client.channels.fetch(channels.reviewChannelId);
            const m = await ch.messages.fetch(req.messageId).catch(() => null);
            if (m) await m.delete();
            triedDeletes.push("review message");
          } catch { }
        }

        // Try deleting public message
        if (req.publicMessageId) {
          try {
            const ch = await client.channels.fetch(channels.publicChannelId);
            const m = await ch.messages.fetch(req.publicMessageId).catch(() => null);
            if (m) await m.delete();
            triedDeletes.push("public message");
          } catch { }
        }

        // Mark as cancelled
        req.status = STATUS.CANCELLED;
        req.messageId = null;
        req.publicMessageId = null;
        await req.save();

        // Log the action
        await logLFAction(client, config, 'cancel', req, interaction.user);

        // 📩 DM Notification
        try {
          const cancelDmEmbed = new EmbedBuilder()
            .setTitle("🚫 Request Cancelled")
            .setColor(Colors.Orange)
            .setDescription(
              `>>> **Game:** ${req.game}\n` +
              `**Type:** ${req.type}\n` +
              `**Request ID:** \`${req._id}\`\n` +
              `**Status:** Cancelled\n` +
              `**Action:** Your request has been cancelled\n` +
              `**Messages Deleted:** ${triedDeletes.length ? triedDeletes.join(", ") : "None"}`
            )
            .setFooter({ text: `Request ID: ${req._id}` })
            .setTimestamp();
          
          await interaction.user.send({ embeds: [cancelDmEmbed] });
        } catch (error) {
          logger.warn(`Could not DM user ${interaction.user.tag} (${interaction.user.id}) about their request cancellation.`);
        }

        return interaction.reply({
          embeds: [createSuccessEmbed("Request Cancelled", `Your request \`${req._id}\` has been cancelled.${triedDeletes.length ? ` Deleted: ${triedDeletes.join(", ")}` : ""}`, STATUS.CANCELLED)],
          flags: MessageFlags.Ephemeral,
        });
      }



      // -------------------- "RESEND" --------------------
      if (sub === "resend") {
        const id = interaction.options.getString("request_id");
        const req = await LFRequest.findById(id);

        if (!req || req.guildId !== interaction.guild.id) {
          return interaction.reply({
            embeds: [createErrorEmbed("Request Not Found", "No request found with that ID in this server.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        // Check permissions
        const permissionCheck = canUserPerformAction(req, interaction.user.id, "resend");
        if (!permissionCheck.allowed) {
          return interaction.reply({
            embeds: [createErrorEmbed("Cannot Resend", permissionCheck.reason, req.status)],
            flags: MessageFlags.Ephemeral,
          });
        }

        req.status = STATUS.PENDING;
        req.reviewedBy = null;
        req.messageId = null;
        req.publicMessageId = null;
        await req.save();

        await interaction.reply({
          embeds: [createSuccessEmbed("Request Resent", `Your request \`${req._id}\` has been resent for review.`, STATUS.PENDING)],
          flags: MessageFlags.Ephemeral,
        });

        try {
          const author = await client.users.fetch(req.userId);
          const channels = getGameChannels(config, req.game);
          const reviewCh = await client.channels.fetch(channels.reviewChannelId);
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

          // Log the action
          await logLFAction(client, config, 'resend', req, interaction.user);

          // 📩 DM Notification
          try {
            const resendDmEmbed = new EmbedBuilder()
              .setTitle("🔄 Request Resent")
              .setColor(Colors.Purple)
              .setDescription(
                `>>> **Game:** ${req.game}\n` +
                `**Type:** ${req.type}\n` +
                `**Request ID:** \`${req._id}\`\n` +
                `**Status:** Pending Review\n` +
                `**Action:** Your request has been resent for review\n` +
                `**Review Channel:** <#${channels.reviewChannelId}>`
              )
              .setFooter({ text: `Request ID: ${req._id}` })
              .setTimestamp();
            
            await interaction.user.send({ embeds: [resendDmEmbed] });
          } catch (error) {
            logger.warn(`Could not DM user ${interaction.user.tag} (${interaction.user.id}) about their request resend.`);
          }
        } catch (err) {
          logger.warn(`Failed to send resent request ${req._id}: ${err.message}`);
        }

        return;
      }

      // -------------------- "DELETE" --------------------
      if (sub === "delete") {
        const id = interaction.options.getString("request_id");
        const req = await LFRequest.findById(id);

        if (!req || req.guildId !== interaction.guild.id) {
          return interaction.reply({
            embeds: [createErrorEmbed("Request Not Found", "No request found with that ID in this server.")],
            flags: MessageFlags.Ephemeral,
          });
        }

        // Check permissions
        const permissionCheck = canUserPerformAction(req, interaction.user.id, "delete");
        if (!permissionCheck.allowed) {
          return interaction.reply({
            embeds: [createErrorEmbed("Cannot Delete", permissionCheck.reason, req.status)],
            flags: MessageFlags.Ephemeral,
          });
        }

        // Soft delete the request
        const result = await softDeleteRequest(id, interaction.guild.id);
        
        if (!result.success) {
          return interaction.reply({
            embeds: [createErrorEmbed("Delete Failed", result.error)],
            flags: MessageFlags.Ephemeral,
          });
        }

        // Log the action
        await logLFAction(client, config, 'delete', result.request, interaction.user);

        // 📩 DM Notification
        try {
          const deleteDmEmbed = new EmbedBuilder()
            .setTitle("🗑️ Request Deleted")
            .setColor(Colors.DarkRed)
            .setDescription(
              `>>> **Game:** ${result.request.game}\n` +
              `**Type:** ${result.request.type}\n` +
              `**Request ID:** \`${id}\`\n` +
              `**Status:** Deleted\n` +
              `**Action:** Your request has been permanently deleted\n` +
              `**Note:** This action cannot be undone`
            )
            .setFooter({ text: `Request ID: ${id}` })
            .setTimestamp();
          
          await interaction.user.send({ embeds: [deleteDmEmbed] });
        } catch (error) {
          logger.warn(`Could not DM user ${interaction.user.tag} (${interaction.user.id}) about their request deletion.`);
        }

        return interaction.reply({
          embeds: [createSuccessEmbed("Request Deleted", `Your request \`${id}\` has been deleted.`, STATUS.DELETED)],
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      logger.error(`RequestsCommand error: ${err.stack}`);
      return interaction.reply({
        embeds: [createErrorEmbed("Error", "An error occurred, please try again later.")],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = RequestsCommand;
