const {sendLog, logEmbed} = require(`${process.cwd()}/utils/logging.js`);

module.exports = async (client, oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    const content = `Canal: <#${newMessage.channel.id}>\nAutor: ${newMessage.author.tag}\n\nAntes:\n${oldMessage.content || "(sin contenido de texto)"}\n\nDespués:\n${newMessage.content || "(sin contenido de texto)"}`;
    await sendLog(newMessage.guild, logEmbed(client, "Mensaje editado", content));
}
