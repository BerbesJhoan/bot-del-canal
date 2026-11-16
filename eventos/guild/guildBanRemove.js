const {sendLog, logEmbed} = require(`${process.cwd()}/utils/logging.js`);

module.exports = async (client, ban) => {
    await sendLog(ban.guild, logEmbed(client, "Baneo eliminado", `${ban.user.tag} (${ban.user.id})`));
}
