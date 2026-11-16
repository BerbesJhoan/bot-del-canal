const Discord = require('discord.js');
const setupSchema = require(`${process.cwd()}/modelos/setups.js`);

async function sendLog(guild, embed) {
    try {
        const setup = await setupSchema.findOne({guildID: guild.id});
        const channel = setup?.logs ? guild.channels.cache.get(setup.logs) : null;
        if (!channel?.isTextBased()) return;
        await channel.send({embeds: [embed]});
    } catch (error) {
        console.error(`No se pudo registrar un evento del servidor ${guild.id}:`, error);
    }
}

function logEmbed(client, title, description) {
    return new Discord.EmbedBuilder()
        .setColor(client.color)
        .setTitle(title)
        .setDescription(description.slice(0, 4000))
        .setTimestamp();
}

module.exports = {sendLog, logEmbed};
