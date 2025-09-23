/*
 * Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.
 *
 * Copyright (C) 2025 Monish Krishna
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const Command = require("../../Structure/Handlers/BaseCommand");
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
class Userinfo extends Command {
    constructor(client) {
        super(client, {
            data: new SlashCommandBuilder()
                .setName("userinfo")
                .setDescription("See info about yourself or others 💁")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("Select a user")
                        .setRequired(true))
                .setDMPermission(false),
            options: {
                devOnly: false,
            },
        });
    }

    async execute(interaction, client) {
        const member = interaction.options.getMember("user");
        const user = interaction.options.getUser("user");
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };

        let rolemap = member.roles.cache.sort((a, b) => b.position - a.position).map(r => r).join(" ");
        if (rolemap.length > 1024) rolemap = "`The user has too many roles to display all of them!`";
        if (!rolemap) rolemap = "`The user doesn't have any roles!`";

        let status = {
            online: 'Online',
            idle: 'Idle',
            dnd: 'Do Not Disturb',
            offline: 'Offline/Invisible'
        };

        let status2 = {
            true: 'Bot',
            false: 'Not a Bot'
        };

        const exampleEmbed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: `${user.displayAvatarURL()}` })
            .setThumbnail(user.displayAvatarURL())
            .setColor('#ea7777')
            .addFields(
                { name: '📛 Name', value: "`" + `${user.username}` + "`", inline: true },
                { name: '🆔 ID', value: "`" + `${user.id}` + "`", inline: true },
                { name: '✍️ Nickname', value: "`" + `${member.nickname || "No Nickname"}` + "`", inline: true },
                { name: '🤖 Bot', value: "`" + `${status2[user.bot]}` + "`", inline: true },
                { name: '➕ Account Created', value: `<t:` + `${Math.floor(user.createdTimestamp / 1000)}` + `:R>`, inline: true },
                { name: '😄 Joined', value: `<t:` + `${Math.floor(member.joinedTimestamp / 1000)}` + `:R>`, inline: true },
                { name: '🟢 Status', value: "`" + `${status[member.presence?.status || "offline"]}` + "`", inline: true },
                { name: '⬆️ Server Boosting Since', value: "`" + `${member.premiumSince?.toLocaleDateString("en-US", options) || "Not Boosting"}` + "`", inline: true },
                { name: '🔇 Last Timeout', value: "`" + `${member.communicationDisabledUntil?.toLocaleDateString("en-US", options) || "Never Timed Out"}` + "`", inline: true },
                { name: '🎧 Voice Channel', value: `${member.voice?.channel || "`Currently not in a Voice Channel`"}`, inline: true },
                { name: '🤵 Roles', value: rolemap, inline: true },
                { name: '📜 Permissions', value: "`" + `${member.permissions.toArray()}` + "`", inline: false },
            )
            .setTimestamp();

        interaction.reply({ embeds: [exampleEmbed], flags:MessageFlags.Ephemeral });
    }
}

module.exports = Userinfo;
