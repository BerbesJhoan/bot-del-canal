const {sendLog, logEmbed} = require(`${process.cwd()}/utils/logging.js`);

module.exports = async (client, channel) => {
    if (!channel.guild) return;
    await sendLog(channel.guild, logEmbed(client, "Canal eliminado", `${channel.name} (${channel.id})`));
}
