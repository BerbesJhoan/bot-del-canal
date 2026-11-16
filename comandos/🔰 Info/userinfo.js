const Discord = require('discord.js');

module.exports = {
    name: "userinfo",
    aliases: ["userinfor", "usuario"],
    desc: "Muestra información de un miembro del servidor",
    run: async (client, message, args) => {
        const mentioned = message.mentions.users.first();
        const lookedUp = !mentioned && args[0]
            ? await client.users.fetch(args[0]).catch(() => null)
            : null;
        const user = mentioned || lookedUp || message.author;
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        const embed = new Discord.EmbedBuilder()
            .setColor(client.color)
            .setAuthor({name: user.tag, iconURL: user.displayAvatarURL()})
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                {name: "ID", value: user.id, inline: true},
                {name: "Cuenta creada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true},
                {name: "Se unió al servidor", value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "No disponible", inline: true}
            )
            .setTimestamp();

        const banner = user.bannerURL({size: 512});
        if (banner) embed.setImage(banner);
        return message.reply({embeds: [embed]});
    }
}
