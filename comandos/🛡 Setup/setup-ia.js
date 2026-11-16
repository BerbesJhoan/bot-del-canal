const Discord = require('discord.js');
const setupSchema = require(`${process.cwd()}/modelos/setups.js`);

module.exports = {
    name: "setup-ia",
    aliases: ["ia-setup"],
    desc: "Configura o desactiva el canal de conversación e inicio diario de Brasa",
    permisos: ["Administrator"],
    run: async (client, message, args, prefix) => {
        if ((args[0] || "").toLowerCase() === "off") {
            await setupSchema.findOneAndUpdate(
                {guildID: message.guild.id},
                {$set: {"iaSocial.enabled": false, "iaSocial.channelID": ""}},
                {upsert: true}
            );
            return message.reply("✅ **Brasa dejará de iniciar conversaciones en este servidor.** El resto de funciones de `ia` sigue disponible.");
        }

        const channelArg = args[0];
        const channelId = channelArg?.match(/^<#(\d+)>$/)?.[1] || channelArg;
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) {
            return message.reply(`❌ **Uso:** \`${prefix}setup-ia #canal\` o \`${prefix}setup-ia off\``);
        }
        const botMember = message.guild.members.me;
        if (!botMember || !channel.permissionsFor(botMember)?.has(Discord.PermissionFlagsBits.SendMessages)) {
            return message.reply("❌ **Necesito permiso para enviar mensajes en ese canal.**");
        }

        await setupSchema.findOneAndUpdate(
            {guildID: message.guild.id},
            {$set: {"iaSocial.enabled": true, "iaSocial.channelID": channel.id}},
            {upsert: true}
        );
        return message.reply(`✅ **Canal social de Brasa configurado en ${channel}.** Publicará como máximo un saludo o tema breve por día UTC, sin mencionar miembros ni leer el historial. Usa \`setup-ia off\` para detenerlo.`);
    }
};
