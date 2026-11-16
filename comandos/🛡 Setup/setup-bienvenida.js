const setupSchema = require(`${process.cwd()}/modelos/setups.js`);

module.exports = {
    name: "setup-bienvenida",
    aliases: ["bienvenida-setup"],
    desc: "Configura o desactiva el mensaje de bienvenida",
    permisos: ["Administrator"],
    run: async (client, message, args) => {
        if ((args[0] || "").toLowerCase() === "off") {
            await setupSchema.findOneAndUpdate(
                {guildID: message.guild.id},
                {$set: {"bienvenida.canal": ""}},
                {upsert: true}
            );
            return message.reply("✅ **Mensajes de bienvenida desactivados.**");
        }

        const channelArg = args.shift();
        const channelId = channelArg?.match(/^<#(\d+)>$/)?.[1] || channelArg;
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) {
            return message.reply("❌ **Uso:** `setup-bienvenida #canal [mensaje]` o `setup-bienvenida off`");
        }
        const texto = args.join(" ").slice(0, 1500)
            || "¡Bienvenido/a {user} a **{server}**!";
        await setupSchema.findOneAndUpdate(
            {guildID: message.guild.id},
            {$set: {bienvenida: {canal: channel.id, mensaje: texto}}},
            {upsert: true}
        );
        return message.reply(`✅ **Bienvenida configurada en ${channel}.** Puedes usar \`{user}\`, \`{server}\` y \`{memberCount}\` en el mensaje.`);
    }
}
