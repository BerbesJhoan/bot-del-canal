const ICEBREAKERS = [
    "Pregunta seria del muelle: ¿qué comida defenderías en una competencia absurda? Elige con cuidado; voy a discrepar.",
    "Reto relámpago de Brasa: inventa un nombre épico para una empanada picante. El mío ya ganó, pero te escucho.",
    "Debate sin premio (qué injusticia): ¿qué canción pondrías para arreglar una radio a medianoche?",
    "Hoy acepto un desafío: recomiéndenme un pasatiempo que no implique perder contra mí.",
    "La radio de Caleta Bruma capta una pregunta: ¿qué pequeña cosa te mejora un día complicado?"
];
const activeClients = new WeakSet();
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function chooseIcebreaker(guildId, date) {
    const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
    const hash = Array.from(guildId).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, day >>> 0);
    return ICEBREAKERS[hash % ICEBREAKERS.length];
}

async function runDailyIcebreakers(client, setupModel, now = new Date(), logger = console) {
    const dateKey = utcDateKey(now);
    const configurations = await setupModel.find({"iaSocial.enabled": true});
    let sent = 0;

    for (const configuration of configurations) {
        const channelId = configuration.iaSocial?.channelID;
        if (!configuration.guildID || !channelId) continue;

        const guild = client.guilds.cache.get(configuration.guildID);
        const channel = guild?.channels.cache.get(channelId);
        const botMember = guild?.members.me;
        if (!channel || !botMember || !channel.permissionsFor(botMember)?.has("SendMessages")) {
            continue;
        }

        const claimed = await setupModel.findOneAndUpdate(
            {
                guildID: configuration.guildID,
                "iaSocial.enabled": true,
                "iaSocial.channelID": channelId,
                "iaSocial.lastIcebreakerDate": {$ne: dateKey}
            },
            {$set: {"iaSocial.lastIcebreakerDate": dateKey}},
            {new: true}
        );
        if (!claimed) continue;

        try {
            await channel.send({
                content: chooseIcebreaker(configuration.guildID, now),
                allowedMentions: {parse: []}
            });
            sent++;
        } catch (error) {
            logger.error(`No se pudo enviar el saludo de Brasa en ${configuration.guildID}:`, error.message);
        }
    }
    return sent;
}

function startDailyIcebreakers(client, setupModel) {
    if (activeClients.has(client)) return;
    activeClients.add(client);

    const run = () => runDailyIcebreakers(client, setupModel).catch(error => {
        console.error("Falló la revisión diaria de conversación de Brasa:", error.message);
    });
    run();
    const timer = setInterval(run, 30 * 60 * 1000);
    if (typeof timer.unref === "function") timer.unref();
}

module.exports = {runDailyIcebreakers, startDailyIcebreakers, utcDateKey, chooseIcebreaker, ICEBREAKERS};
