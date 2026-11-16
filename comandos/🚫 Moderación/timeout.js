const Discord = require('discord.js');

module.exports = {
    name: "timeout",
    aliases: ["silenciar"],
    desc: "Aplica un timeout de hasta 28 días a un miembro",
    permisos: ["ModerateMembers"],
    permisos_bot: ["ModerateMembers"],
    run: async (client, message, args, prefix) => {
        const target = message.mentions.members.first()
            || await message.guild.members.fetch(args[0]).catch(() => null);
        const minutos = Number(args[1]);
        if (!target || !Number.isInteger(minutos) || minutos < 1 || minutos > 40320) {
            return message.reply(`❌ **Uso:** \`${prefix}timeout @miembro <minutos 1-40320> [razón]\``);
        }
        if (target.id === message.author.id || target.id === client.user.id || target.id === message.guild.ownerId) {
            return message.reply("❌ **No puedes aplicar timeout a ese miembro.**");
        }
        if (target.roles.highest.comparePositionTo(message.member.roles.highest) >= 0
            && message.author.id !== message.guild.ownerId) {
            return message.reply("❌ **No puedes aplicar timeout a un miembro con un rol igual o superior al tuyo.**");
        }
        if (!target.moderatable) {
            return message.reply("❌ **No puedo aplicar timeout a ese miembro. Revisa la jerarquía de roles y mis permisos.**");
        }

        const razon = args.slice(2).join(" ").slice(0, 512) || "Sin razón especificada";
        try {
            await target.timeout(minutos * 60 * 1000, razon);
        } catch (error) {
            console.error(`No se pudo aplicar timeout a ${target.id}:`, error);
            return message.reply("❌ **No se pudo aplicar el timeout. Verifica los permisos y la jerarquía de roles del bot.**");
        }
        return message.reply({
            embeds: [new Discord.EmbedBuilder()
                .setColor(client.color)
                .setTitle(`Timeout aplicado a ${target.user.tag}`)
                .addFields(
                    {name: "Duración", value: `${minutos} minutos`, inline: true},
                    {name: "Razón", value: razon, inline: true}
                )
                .setTimestamp()]
        });
    }
}
