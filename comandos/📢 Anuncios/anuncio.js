const Discord = require('discord.js');

module.exports = {
    name: "anuncio",
    aliases: ["anuncios", "announce"],
    desc: "Publica un anuncio con título y contenido",
    permisos: ["Administrator"],
    run: async (client, message, args) => {
        const partes = args.join(" ").split("|").map(parte => parte.trim());
        const channelArg = partes.shift();
        const channelId = channelArg?.match(/^<#(\d+)>$/)?.[1] || channelArg;
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel?.isTextBased() || !partes[0] || !partes[1]) {
            return message.reply("❌ **Uso:** `anuncio #canal | título | mensaje`");
        }

        const roleCandidate = partes[0].match(/^<@&\d+>$/) || /^\d{17,20}$/.test(partes[0]);
        const roleArg = roleCandidate ? partes.shift() : "";
        const roleId = roleArg.match(/^<@&(\d+)>$/)?.[1] || roleArg;
        const role = roleId ? message.guild.roles.cache.get(roleId) : null;
        if (roleArg && !role) return message.reply("❌ **No se encontró el rol indicado.**");
        const [title, ...descriptionParts] = partes;
        const description = descriptionParts.join(" | ");
        if (!title || !description) return message.reply("❌ **Uso:** `anuncio #canal | título | mensaje` o `anuncio #canal | @rol | título | mensaje`");

        const embed = new Discord.EmbedBuilder()
            .setColor(client.color)
            .setTitle(title.slice(0, 256))
            .setDescription(description.slice(0, 4000))
            .setTimestamp();
        try {
            await channel.send({
                content: role ? `<@&${role.id}>` : undefined,
                embeds: [embed],
                allowedMentions: {roles: role ? [role.id] : []}
            });
        } catch (error) {
            console.error(`No se pudo publicar el anuncio en ${channel.id}:`, error);
            return message.reply("❌ **No se pudo enviar el anuncio. Verifica los permisos del bot en ese canal.**");
        }
        return message.reply(`✅ **Anuncio enviado a ${channel}.**`);
    }
}
