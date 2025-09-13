const { SlashCommandBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Command = require("../../Structure/Handlers/BaseCommand");
const {Logger} = require("../../Structure/Functions/index");
const logger = new Logger();

const config = require("../../Structure/Configs/config")
const setupSchema = require("../../Structure/Schemas/Setup/setup");

class SetupCommand extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("setup")
                .setDescription("Enable and configure the bot for your server.")
                .addStringOption(option =>
                    option.setName("select")
                        .setDescription("Select an option to configure.")
                        .setRequired(true)
                        .addChoices(
                            { name: 'Anti-Nuke', value: 'anuke' },
                            { name: 'Smart-Mod', value: 'smod' },
                            { name: 'Auto-Punish', value: 'apunish' },
                            { name: "Anti-Raid", value: "araid" },
                        ))
                .addBooleanOption(option =>
                    option.setName("enable")
                        .setDescription("Enable or Disable the selected option.")
                        .setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .setDMPermission(false),

            options: {
                devOnly: true,
            },
        });
    }

    async execute(interaction, client) {
        const choice = interaction.options.getString("select");
        const enable = interaction.options.getBoolean("enable");

        let setupData;
        try {
            setupData = await setupSchema.findOne({ guildId: interaction.guild.id });
            if (!setupData) {
                setupData = new setupSchema({ guildId: interaction.guild.id });
            }
        } catch (error) {
            logger.error(`Error fetching setup data: ${error}`);
            return interaction.reply({ content: "There was an error fetching the setup data. Please try again later.", flags: MessageFlags.Ephemeral });
        }

        switch (choice) {
            case 'anuke':
                setupData.anuke = true;
                break;
            case 'smod':
                setupData.smod = true;
                break;
            case 'apunish':
                setupData.apunish = true;
                break;
            case 'araid':
                setupData.araid = true;
                break;
            default:
                return interaction.reply({ content: "Invalid option selected.", flags: MessageFlags.Ephemeral });
        }

        try {
            await setupData.save();
            const embed = new EmbedBuilder()
                .setTitle("Setup Updated Successfully")
                .setDescription(`The **${choice}** feature has been **${true ? "enabled" : "disabled"}**.`)
                .setColor("Green")
                .setFooter({ text: config.footerText, iconURL: config.footerIcon })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            logger.error(`Error saving setup data: ${error}`);
            return interaction.reply({ content: "There was an error saving the setup data. Please try again later.", flags: MessageFlags.Ephemeral });
        }
        
    }
};

module.exports = SetupCommand;
        