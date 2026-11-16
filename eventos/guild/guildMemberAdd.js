const Discord = require('discord.js');
const setupSchema = require(`${process.cwd()}/modelos/setups.js`);

module.exports = async (client, member) => {
    try {
        const setup = await setupSchema.findOne({guildID: member.guild.id});
        const config = setup?.bienvenida;
        const channel = config?.canal ? member.guild.channels.cache.get(config.canal) : null;
        if (!channel?.isTextBased()) return;

        const texto = (config.mensaje || "¡Bienvenido/a {user} a **{server}**!")
            .replace(/\{user\}/g, `<@${member.id}>`)
            .replace(/\{server\}/g, member.guild.name)
            .replace(/\{memberCount\}/g, `${member.guild.memberCount}`);
        const embed = new Discord.EmbedBuilder()
            .setColor(client.color)
            .setDescription(texto.slice(0, 4000))
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        await channel.send({embeds: [embed], allowedMentions: {users: [member.id]}});
    } catch (error) {
        console.error(`No se pudo enviar la bienvenida para ${member.id}:`, error);
    }
}
