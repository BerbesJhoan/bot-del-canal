const {sendLog, logEmbed} = require(`${process.cwd()}/utils/logging.js`);

module.exports = async (client, message) => {
    if (!message.guild || message.author?.bot || !message.content) return;
    const content = `Canal: <#${message.channel.id}>\nAutor: ${message.author.tag}\n\n${message.content}`;
    await sendLog(message.guild, logEmbed(client, "Mensaje eliminado", content));
}
