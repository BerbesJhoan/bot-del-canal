const gemini = require(`${process.cwd()}/utils/gemini.js`);
const memoryModel = require(`${process.cwd()}/modelos/memoria-ia.js`);
const memory = require(`${process.cwd()}/utils/ia-memory.js`);
const persona = require(`${process.cwd()}/utils/persona.js`);

const MAX_QUESTION_LENGTH = 1000;
const FREE_TIER_NOTICE = "En el nivel gratuito, Google puede usar el contenido enviado a Gemini para mejorar sus productos.";
const RETENTION_NOTICE = "La memoria se conserva en MongoDB hasta que la borres manualmente.";

function safeReply(message, content) {
    return message.reply({content, allowedMentions: {parse: []}});
}

async function handleMemory(message, args, prefix) {
    const action = (args[1] || "").toLowerCase();
    const scope = {guildId: message.guild.id, userId: message.author.id};

    if (action === "activar") {
        await memory.enableMemory(memoryModel, scope.guildId, scope.userId);
        return safeReply(message,
            `✅ **Memoria activada para ti en este servidor.** Guardaré en MongoDB tus preguntas a \`${prefix}ia\` y las respuestas exitosas, y las enviaré como contexto a Gemini en futuras consultas. No leeré mensajes del canal. ${FREE_TIER_NOTICE} ${RETENTION_NOTICE} Usa \`${prefix}ia memoria ver\` para recibirla por DM, \`${prefix}ia memoria desactivar\` para dejar de guardar y usarla, o \`${prefix}ia memoria borrar\` para eliminarla.`
        );
    }

    if (action === "ver") {
        const saved = await memory.findMemory(memoryModel, scope.guildId, scope.userId);
        if (!saved || !saved.exchanges.length) {
            return safeReply(message, "No hay intercambios guardados para ti en este servidor.");
        }
        const chunks = memory.splitMemoryForDM(saved);
        try {
            for (let index = 0; index < chunks.length; index++) {
                await message.author.send({
                    content: `${index === 0 ? "**Tu memoria de IA para este servidor (solo visible en este DM):**\n\n" : ""}${chunks[index]}`,
                    allowedMentions: {parse: []}
                });
            }
        } catch (error) {
            console.error(`No se pudo enviar la memoria por DM a ${message.author.id}:`, error.message);
            return safeReply(message, "No pude enviarte un DM. Activa los mensajes directos de este servidor e inténtalo de nuevo; tu memoria no se publicó aquí.");
        }
        return safeReply(message, "Te envié por DM la memoria guardada de este servidor.");
    }

    if (action === "borrar") {
        await memory.deleteMemory(memoryModel, scope.guildId, scope.userId);
        return safeReply(message, "✅ Borré tu memoria de este servidor y desactivé su uso.");
    }

    if (action === "desactivar") {
        const saved = await memory.findMemory(memoryModel, scope.guildId, scope.userId);
        if (!saved) return safeReply(message, "La memoria ya estaba desactivada; no había datos guardados.");
        await memory.disableMemory(memoryModel, scope.guildId, scope.userId);
        return safeReply(message, `✅ Memoria desactivada: dejaré de incluirla en Gemini y de guardar nuevos intercambios. Los datos existentes permanecen en MongoDB hasta que uses \`${prefix}ia memoria borrar\`.`);
    }

    return safeReply(message, `**Memoria opcional**\n\`${prefix}ia memoria activar\` — guardar tus consultas/respuestas y usarlas como contexto.\n\`${prefix}ia memoria ver\` — recibir la memoria por DM.\n\`${prefix}ia memoria desactivar\` — dejar de usarla y guardar, conservando los datos.\n\`${prefix}ia memoria borrar\` — eliminar los datos y desactivar.\n${FREE_TIER_NOTICE} ${RETENTION_NOTICE}`);
}

module.exports = {
    name: "ia",
    aliases: ["gemini"],
    desc: "Pregunta a Gemini y administra tu memoria opcional.",
    run: async (client, message, args, prefix) => {
        if ((args[0] || "").toLowerCase() === "memoria") {
            try {
                return await handleMemory(message, args, prefix);
            } catch (error) {
                console.error(`Falló la gestión de memoria IA en el servidor ${message.guild.id}:`, error.message);
                return safeReply(message, "❌ No pude actualizar o consultar tu memoria. Inténtalo de nuevo.");
            }
        }

        const question = args.join(" ").trim();
        if (!question) {
            return safeReply(message, `❌ **Escribe una pregunta. Uso:** \`${prefix}ia <pregunta>\` o \`${prefix}ia memoria\``);
        }
        if (question.length > MAX_QUESTION_LENGTH) {
            return safeReply(message, `❌ **La pregunta no puede superar ${MAX_QUESTION_LENGTH} caracteres.**`);
        }
        if (!process.env.GEMINI_API_KEY) {
            return safeReply(message, "❌ **El comando de IA no está configurado. El administrador debe definir `GEMINI_API_KEY` en las variables de entorno.**");
        }

        let savedMemory;
        try {
            savedMemory = await memory.findMemory(memoryModel, message.guild.id, message.author.id);
        } catch (error) {
            console.error(`No se pudo leer memoria IA de ${message.author.id} en ${message.guild.id}:`, error.message);
            return safeReply(message, "❌ No pude consultar tu configuración de memoria. Inténtalo de nuevo.");
        }

        const limit = gemini.checkRateLimit(message.guild.id, message.author.id);
        if (!limit.allowed) {
            const seconds = Math.max(1, Math.ceil(limit.retryAfterMs / 1000));
            const reason = limit.scope === "server"
                ? "Este servidor alcanzó el límite temporal de solicitudes."
                : "Espera antes de hacer otra pregunta.";
            return safeReply(message, `⏳ **${reason} Inténtalo de nuevo en ${seconds} segundos.**`);
        }

        const history = memory.getHistory(savedMemory);
        const systemInstruction = persona.buildSystemInstruction({
            record: savedMemory?.enabled ? savedMemory : null,
            question
        });
        const privacyNotice = savedMemory?.enabled
            ? `🔒 **Privacidad:** enviaré tu pregunta y hasta 5 intercambios guardados de esta memoria a Google Gemini. No leeré otros mensajes del canal. ${FREE_TIER_NOTICE}`
            : `🔒 **Privacidad:** enviaré solo tu pregunta a Google Gemini; no leeré el historial del canal ni guardaré nuevos intercambios. ${savedMemory?.exchanges?.length ? "La memoria anterior permanece en MongoDB hasta que la borres." : "No hay memoria guardada."} ${FREE_TIER_NOTICE}`;
        const status = await message.reply({
            content: `${privacyNotice}\n\n⏳ Consultando a Gemini…`,
            allowedMentions: {parse: []}
        });
        try {
            const answer = await gemini.generateAnswer(question, {history, systemInstruction});
            if (savedMemory?.enabled) {
                try {
                    const stored = await memory.appendExchange(memoryModel, message.guild.id, message.author.id, question, answer);
                    if ((stored.modifiedCount ?? stored.nModified ?? stored.n ?? 0) === 0) {
                        return status.edit({
                            content: `🤖 **Respuesta de Gemini**\n${answer}\n\n⚠️ No se guardó en memoria porque estaba desactivada durante la consulta.`,
                            allowedMentions: {parse: []}
                        });
                    }
                    const relationshipSignal = persona.extractRelationshipSignal(question);
                    if (relationshipSignal) {
                        await memory.appendRelationshipSignal(
                            memoryModel,
                            message.guild.id,
                            message.author.id,
                            relationshipSignal
                        );
                    }
                } catch (error) {
                    console.error(`No se pudo guardar memoria IA de ${message.author.id} en ${message.guild.id}:`, error.message);
                    return status.edit({
                        content: `🤖 **Respuesta de Gemini**\n${answer}\n\n⚠️ No se pudo guardar este intercambio en tu memoria.`,
                        allowedMentions: {parse: []}
                    });
                }
            }
            return status.edit({
                content: `🤖 **Respuesta de Gemini**\n${answer}`,
                allowedMentions: {parse: []}
            });
        } catch (error) {
            console.error(`Falló el comando de IA en el servidor ${message.guild.id}:`, error.message);
            let reason = "Gemini no pudo procesar la pregunta. Inténtalo de nuevo más tarde.";
            if (error.message === "REQUEST_TIMEOUT") reason = "Gemini tardó demasiado en responder. Inténtalo de nuevo.";
            if (error.message === "MISSING_API_KEY") reason = "Falta configurar `GEMINI_API_KEY` en las variables de entorno.";
            if (error.message === "INVALID_MODEL") reason = "El modelo configurado en `GEMINI_MODEL` no es válido.";
            if (error.statusCode === 429) reason = "Gemini está limitando solicitudes. Inténtalo más tarde.";
            if (error.statusCode === 400 || error.statusCode === 404) reason = "El modelo o la pregunta no están disponibles. Revisa `GEMINI_MODEL` y vuelve a intentarlo.";
            return status.edit({content: `❌ **${reason}**`, allowedMentions: {parse: []}});
        }
    }
};
