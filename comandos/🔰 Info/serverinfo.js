const Discord = require('discord.js');

module.exports = {
    name: "serverinfo",
    aliases: ["serverinfor", "servidor"],
    desc: "Muestra información de este servidor",
    run: async (client, message) => {
        const guild = message.guild;
        const created = Math.floor(guild.createdTimestamp / 1000);
        const channels = guild.channels.cache;
        const members = guild.members.cache;
        const icon = guild.iconURL();
        const embed = new Discord.EmbedBuilder()
            .setColor(client.color)
            .setAuthor(icon ? {name: guild.name, iconURL: icon} : {name: guild.name})
            .setDescription(guild.description || "Sin descripción")
            .addFields(
                {name: "ID", value: guild.id, inline: true},
                {name: "Dueño", value: `<@${guild.ownerId}>`, inline: true},
                {name: "Creado", value: `<t:${created}:R>`, inline: true},
                {name: "Miembros", value: `${guild.memberCount}`, inline: true},
                {name: "Bots en caché", value: `${members.filter(member => member.user.bot).size}`, inline: true},
                {name: "Canales", value: `${channels.size}`, inline: true}
            )
            .setTimestamp();

        if (icon) embed.setThumbnail(icon);
        if (guild.bannerURL()) embed.setImage(guild.bannerURL({size: 1024}));
        return message.reply({embeds: [embed]});
    }
}
