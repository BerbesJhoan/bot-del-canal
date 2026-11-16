const MAX_EXCHANGES = 5;

function scope(guildId, userId) {
    return {guildID: guildId, userID: userId};
}

async function findMemory(model, guildId, userId) {
    return model.findOne(scope(guildId, userId));
}

async function enableMemory(model, guildId, userId) {
    return model.findOneAndUpdate(
        scope(guildId, userId),
        {
            $set: {enabled: true},
            $setOnInsert: {guildID: guildId, userID: userId, exchanges: []}
        },
        {upsert: true, new: true, setDefaultsOnInsert: true}
    );
}

async function disableMemory(model, guildId, userId) {
    return model.findOneAndUpdate(
        scope(guildId, userId),
        {
            $set: {enabled: false},
            $setOnInsert: {guildID: guildId, userID: userId, exchanges: []}
        },
        {upsert: true, new: true, setDefaultsOnInsert: true}
    );
}

async function deleteMemory(model, guildId, userId) {
    return model.deleteOne(scope(guildId, userId));
}

async function appendExchange(model, guildId, userId, question, answer) {
    return model.updateOne(
        {...scope(guildId, userId), enabled: true},
        {$push: {exchanges: {$each: [{question, answer}], $slice: -MAX_EXCHANGES}}}
    );
}

async function appendRelationshipSignal(model, guildId, userId, {signal, preference}) {
    const additions = {trustSignals: signal};
    if (preference) additions.preferences = preference;
    return model.updateOne(
        {...scope(guildId, userId), enabled: true},
        {$addToSet: additions}
    );
}

function getHistory(memory) {
    if (!memory || memory.enabled !== true || !Array.isArray(memory.exchanges)) return [];
    return memory.exchanges.slice(-MAX_EXCHANGES);
}

function formatMemory(memory) {
    const exchanges = getHistory({...memory, enabled: true});
    if (!exchanges.length) return "Aún no hay intercambios guardados.";
    return exchanges.map((exchange, index) =>
        `**${index + 1}. Pregunta**\n${exchange.question}\n\n**Respuesta**\n${exchange.answer}`
    ).join("\n\n---\n\n");
}

function splitMemoryForDM(memory, maxLength = 1800) {
    const characters = Array.from(formatMemory(memory));
    const chunks = [];
    for (let index = 0; index < characters.length; index += maxLength) {
        chunks.push(characters.slice(index, index + maxLength).join(""));
    }
    return chunks;
}

module.exports = {
    MAX_EXCHANGES,
    findMemory,
    enableMemory,
    disableMemory,
    deleteMemory,
    appendExchange,
    appendRelationshipSignal,
    getHistory,
    formatMemory,
    splitMemoryForDM
};
