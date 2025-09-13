const { SlashCommandBuilder, EmbedBuilder, Colors, MessageFlags } = require("discord.js");
const Command = require("../../Structure/Handlers/BaseCommand");
const { Logger } = require("../../Structure/Functions/index");
const logger = new Logger();
const moment = require("moment");


class ServerInfo extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("serverinfo")
                .setDescription("Get information about the server."),
            options: {
                devOnly: false,
            },
        });
    }
        async execute(interaction, client) {
            const { guild } = interaction;
    
            try {
                // Fetch the guild owner
                const owner = await guild.fetchOwner();
    
                // Calculate boost level and max bitrate
                const boosts = guild.premiumSubscriptionCount;
                let boostLevel = "None";
                let maxBitrate = 96000;
                if (boosts >= 2) {
                    boostLevel = "1";
                    maxBitrate = 128000;
                }
                if (boosts >= 15) {
                    boostLevel = "2";
                    maxBitrate = 256000;
                }
                if (boosts >= 30) {
                    boostLevel = "3 / ∞";
                    maxBitrate = 384000;
                }
    
                // Create the embed
                const embed = new EmbedBuilder()
                    .setTitle(`Server Info: ${guild.name}`)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .setColor(Colors.Blurple)
                    .addFields(
                        { name: "Owner", value: `${owner.user.tag} (${owner.user.id})`, inline: true },
                        { name: "Created On", value: moment(guild.createdAt).format("DD/MM/YYYY"), inline: true },
                        { name: "Member Count", value: `${guild.memberCount}`, inline: true },
                        { name: "Boost Level", value: boostLevel, inline: true },
                        { name: "Boosts", value: `${boosts}`, inline: true },
                        { name: "Max Bitrate", value: `${maxBitrate} kbps`, inline: true },
                        { name: "Text Channels", value: `${guild.channels.cache.filter(c => c.type === 0).size}`, inline: true },
                        { name: "Voice Channels", value: `${guild.channels.cache.filter(c => c.type === 2).size}`, inline: true },
                        { name: "Roles", value: `${guild.roles.cache.size}`, inline: true }
                    )
                    .setFooter({ text: `Server ID: ${guild.id}` });
    
                // Reply with the embed
                await interaction.reply({ embeds: [embed], flags:MessageFlags.Ephemeral });
            } catch (error) {
                logger.error("Error fetching server info:", error);
                await interaction.reply({ content: "An error occurred while fetching server info.", flags:MessageFlags.Ephemeral });
            
            }
    
        }
    }

module.exports = ServerInfo;