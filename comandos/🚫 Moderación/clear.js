const Discord = require('discord.js');

module.exports = {
    name: "clear",
    aliases: ["purge", "limpiar"],
    desc: "Elimina entre 1 y 99 mensajes recientes",
    permisos: ["ManageMessages"],
    permisos_bot: ["ManageMessages"],
    run: async (client, message, args) => {
        const cantidad = Number(args[0]);
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
            return message.reply("❌ **Indica una cantidad entre 1 y 99.**");
        }

        const eliminados = await message.channel.bulkDelete(cantidad, true);
        const respuesta = await message.channel.send({
            embeds: [new Discord.EmbedBuilder()
                .setColor(client.color)
                .setDescription(`✅ Se eliminaron ${eliminados.size} mensajes. Los mensajes con más de 14 días no se pueden borrar en bloque.`)]
        });
        setTimeout(() => respuesta.delete().catch(() => {}), 5000);
    }
}
