const setupSchema = require(`${process.cwd()}/modelos/setups.js`);

module.exports = {
    name: "setup-logs",
    aliases: ["logs-setup"],
    desc: "Configura o desactiva el canal de registros del servidor",
    permisos: ["Administrator"],
    run: async (client, message, args) => {
        if ((args[0] || "").toLowerCase() === "off") {
            await setupSchema.findOneAndUpdate(
                {guildID: message.guild.id},
                {$set: {logs: ""}},
                {upsert: true}
            );
            return message.reply("✅ **Registro de eventos desactivado.**");
        }

        const channelArg = args[0];
        const channelId = channelArg?.match(/^<#(\d+)>$/)?.[1] || channelArg;
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) {
            return message.reply("❌ **Uso:** `setup-logs #canal` o `setup-logs off`");
        }
        await setupSchema.findOneAndUpdate(
            {guildID: message.guild.id},
            {$set: {logs: channel.id}},
            {upsert: true}
        );
        return message.reply(`✅ **Los registros de eventos se enviarán a ${channel}.**`);
    }
}
