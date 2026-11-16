const assert = require('assert');
const EventEmitter = require('events');
const https = require('https');
const gemini = require('../utils/gemini.js');
const memory = require('../utils/ia-memory.js');
const {getMentionQuestion, routeMentionToGemini} = require('../utils/ia-mention.js');
const persona = require('../utils/persona.js');
const {runDailyIcebreakers, ICEBREAKERS} = require('../utils/ia-social.js');

async function testRateLimits() {
    gemini.resetRateLimits();
    const now = 100000;
    assert.strictEqual(gemini.checkRateLimit("guild-1", "user-1", now).allowed, true);
    assert.strictEqual(gemini.checkRateLimit("guild-1", "user-1", now + 1).allowed, false);
    assert.strictEqual(gemini.checkRateLimit("guild-1", "user-1", now + 30000).allowed, true);
    gemini.resetRateLimits();
    assert.strictEqual(gemini.checkRateLimit("guild-1", "user-1", now).allowed, true);
    assert.strictEqual(gemini.checkRateLimit("guild-2", "user-1", now + 1).allowed, false);

    gemini.resetRateLimits();
    for (let index = 0; index < gemini.GUILD_REQUEST_LIMIT; index++) {
        assert.strictEqual(gemini.checkRateLimit("guild-1", `user-${index}`, now).allowed, true);
    }
    const limited = gemini.checkRateLimit("guild-1", "another-user", now);
    assert.strictEqual(limited.allowed, false);
    assert.strictEqual(limited.scope, "server");
    gemini.resetRateLimits();
}

async function testMentionTrigger() {
    const makeMessage = (content, overrides = {}) => ({
        content,
        guild: {id: "guild-mention"},
        channel: {id: "channel-mention"},
        author: {id: "user-mention", bot: false},
        mentions: {users: new Map([["bot-id", {id: "bot-id"}]])},
        ...overrides
    });

    assert.strictEqual(
        getMentionQuestion(makeMessage("<@bot-id>, ¿qué puedes hacer?"), "bot-id", "!"),
        "¿qué puedes hacer?"
    );
    assert.strictEqual(getMentionQuestion(makeMessage("<@bot-id>"), "bot-id", "!"), null);
    assert.strictEqual(getMentionQuestion(makeMessage("<@bot-id> ..."), "bot-id", "!"), null);
    assert.strictEqual(getMentionQuestion(makeMessage("<@bot-id> <@12345678901234567>"), "bot-id", "!"), null);
    assert.strictEqual(
        getMentionQuestion(makeMessage("<@bot-id> prompt", {mentions: {users: new Map()}}), "bot-id", "!"),
        null
    );
    assert.strictEqual(
        getMentionQuestion(makeMessage("!ia <@bot-id> prompt"), "bot-id", "!"),
        null
    );
    assert.strictEqual(
        getMentionQuestion(makeMessage("<@bot-id> prompt", {author: {id: "bot-id", bot: true}}), "bot-id", "!"),
        null
    );
    assert.strictEqual(getMentionQuestion(makeMessage("<@bot-id> prompt", {guild: null}), "bot-id", "!"), null);
    assert.strictEqual(getMentionQuestion(makeMessage("<@bot-id> prompt", {channel: null}), "bot-id", "!"), null);

    let routed;
    const command = {
        async run(client, message, args, prefix) { routed = {client, message, args, prefix}; }
    };
    const client = {user: {id: "bot-id"}};
    const question = makeMessage("<@bot-id> ¿cómo estás?");
    assert.strictEqual(await routeMentionToGemini(client, question, "!", command), true);
    assert.deepStrictEqual(routed, {client, message: question, args: ["¿cómo estás?"], prefix: "!"});
    assert.strictEqual(await routeMentionToGemini(client, makeMessage("<@bot-id>"), "!", command), false);
}

async function testMessageCreateIntegration() {
    const Module = require('module');
    const originalLoad = Module._load;
    const eventPath = require.resolve('../eventos/guild/messageCreate.js');
    const ensured = [];
    Module._load = function(request, parent, isMain) {
        if (request.endsWith('/config/config.json')) return {ownerIDS: []};
        if (request.endsWith('/modelos/servidor.js')) {
            return {findOne: async filter => ({guildID: filter.guildID, prefijo: "!"})};
        }
        if (request.endsWith('/utils/funciones.js')) {
            return {asegurar_todo: async (...args) => { ensured.push(args); }};
        }
        return originalLoad.call(this, request, parent, isMain);
    };
    delete require.cache[eventPath];
    try {
        const messageCreate = require(eventPath);
        const calls = [];
        const iaCommand = {
            async run(client, message, args, prefix) { calls.push({message, args, prefix}); }
        };
        const client = {
            user: {id: "bot-id"},
            commands: {
                get(name) { return name === "ia" ? iaCommand : null; },
                find() { return null; }
            }
        };
        const message = {
            content: "<@bot-id> ¿puedes ayudarme?",
            guild: {id: "guild-event", members: {me: {permissions: {has: () => true}}}},
            channel: {id: "channel-event"},
            author: {id: "user-event", bot: false},
            mentions: {users: new Map([["bot-id", {id: "bot-id"}]])}
        };
        await messageCreate(client, message);
        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0], {message, args: ["¿puedes ayudarme?"], prefix: "!"});

        calls.length = 0;
        await messageCreate(client, {...message, content: "¿alguien puede ayudarme?", mentions: {users: new Map()}});
        assert.strictEqual(calls.length, 0);

        await messageCreate(client, {...message, author: {id: "another-bot", bot: true}});
        await messageCreate(client, {...message, guild: null});
        assert.strictEqual(calls.length, 0);
        assert.strictEqual(ensured.length, 2);

        await messageCreate(client, {...message, content: "!ia <@bot-id> pregunta"});
        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].args, ["<@bot-id>", "pregunta"]);
    } finally {
        Module._load = originalLoad;
        delete require.cache[eventPath];
    }
}

function testPersona() {
    assert.strictEqual(persona.relationshipLevel(null), 0);
    assert.strictEqual(persona.relationshipLevel({
        trustSignals: ["comida:pizza"],
        preferences: ["comida: pizza"]
    }), 1);
    assert.deepStrictEqual(persona.extractRelationshipSignal("Me gusta mucho la pizza"), {
        signal: "comida:pizza",
        preference: "comida: pizza"
    });
    assert.deepStrictEqual(persona.extractRelationshipSignal("Mi comida favorita es sushi"), {
        signal: "comida:sushi",
        preference: "comida: sushi"
    });
    assert.deepStrictEqual(persona.extractRelationshipSignal("Confío en ti"), {signal: "confianza-explicita"});
    assert.strictEqual(persona.extractRelationshipSignal("Me gusta que me escuchen"), null);
    assert.strictEqual(persona.extractRelationshipSignal("No me gusta la pizza"), null);
    assert.deepStrictEqual(persona.extractRelationshipSignal("Me encanta el café"), {
        signal: "comida:cafe",
        preference: "comida: cafe"
    });

    const first = persona.buildSystemInstruction({question: "Estoy triste y necesito ayuda"});
    assert(first.includes("Eres Brasa"));
    assert(first.includes("deja el sarcasmo por un momento"));
    assert(!first.includes("Guts"));
    const trust = persona.buildSystemInstruction({
        record: {preferences: ["comida: pizza", "música: jazz"], trustSignals: ["confianza-explicita"]},
        question: "¿Qué opinas?"
    });
    assert(trust.includes("amistad cercana"));
    assert(trust.includes("comida: pizza"));
    assert(trust.includes("música: jazz"));
}

async function testDailyIcebreakers() {
    const records = [
        {guildID: "guild-enabled", iaSocial: {enabled: true, channelID: "ai-channel", lastIcebreakerDate: ""}},
        {guildID: "guild-disabled", iaSocial: {enabled: false, channelID: "disabled-channel", lastIcebreakerDate: ""}}
    ];
    const setupModel = {
        async find(filter) {
            return records.filter(record => record.iaSocial.enabled === filter["iaSocial.enabled"]);
        },
        async findOneAndUpdate(filter, update) {
            const record = records.find(item => item.guildID === filter.guildID
                && item.iaSocial.enabled === filter["iaSocial.enabled"]
                && item.iaSocial.channelID === filter["iaSocial.channelID"]
                && item.iaSocial.lastIcebreakerDate !== filter["iaSocial.lastIcebreakerDate"].$ne);
            if (!record) return null;
            record.iaSocial.lastIcebreakerDate = update.$set["iaSocial.lastIcebreakerDate"];
            return record;
        }
    };
    const sent = [];
    const guild = {
        members: {me: {id: "bot"}},
        channels: {cache: new Map([["ai-channel", {
            permissionsFor() { return {has: permission => permission === "SendMessages"}; },
            async send(payload) { sent.push(payload); }
        }]])}
    };
    const client = {guilds: {cache: new Map([["guild-enabled", guild]])}};
    const dayOne = new Date("2026-11-16T08:00:00Z");
    const dayTwo = new Date("2026-11-17T08:00:00Z");

    assert.strictEqual(await runDailyIcebreakers(client, setupModel, dayOne), 1);
    assert.strictEqual(await runDailyIcebreakers(client, setupModel, dayOne), 0);
    assert.strictEqual(sent.length, 1);
    assert(sent[0].content.length < 200);
    assert(ICEBREAKERS.includes(sent[0].content));
    assert.deepStrictEqual(sent[0].allowedMentions, {parse: []});
    assert.strictEqual(await runDailyIcebreakers(client, setupModel, dayTwo), 1);
    assert.strictEqual(sent.length, 2);
}

async function testGeminiRequest() {
    const originalRequest = https.request;
    const requests = [];
    let responseText = "Respuesta de prueba";
    let hangRequest = false;
    https.request = (url, options, callback) => {
        const request = new EventEmitter();
        request.write = body => { request.body = body; };
        request.end = () => {
            if (hangRequest) return;
            const response = new EventEmitter();
            response.statusCode = 200;
            response.setEncoding = () => {};
            requests.push({url, options, request});
            process.nextTick(() => {
                callback(response);
                response.emit("data", JSON.stringify({
                    candidates: [{content: {parts: [{text: responseText}]}}]
                }));
                response.emit("end");
            });
        };
        request.destroy = error => request.emit("error", error);
        return request;
    };

    try {
        const answer = await gemini.generateAnswer("pregunta explícita", {
            apiKey: "test-key",
            model: "test-model",
            timeoutMs: 1200,
            systemInstruction: "Eres Brasa."
        });
        assert.strictEqual(answer, "Respuesta de prueba");
        assert.strictEqual(requests.length, 1);
        assert.strictEqual(requests[0].url.pathname, "/v1beta/models/test-model:generateContent");
        assert.strictEqual(requests[0].options.headers["x-goog-api-key"], "test-key");
        assert.strictEqual(requests[0].url.search, "");
        const body = JSON.parse(requests[0].request.body);
        assert.deepStrictEqual(body.contents, [{role: "user", parts: [{text: "pregunta explícita"}]}]);
        assert.strictEqual(body.generationConfig.maxOutputTokens, 512);
        assert.deepStrictEqual(body.systemInstruction, {parts: [{text: "Eres Brasa."}]});

        const history = Array.from({length: 7}, (_, index) => ({
            question: `Q${index}`,
            answer: `A${index}`
        }));
        await gemini.generateAnswer("Q actual", {
            apiKey: "test-key",
            model: "test-model",
            history,
            systemInstruction: "Persona propia"
        });
        const historyBody = JSON.parse(requests[1].request.body);
        assert.strictEqual(historyBody.contents.length, 11);
        assert.deepStrictEqual(historyBody.contents[0], {role: "user", parts: [{text: "Q2"}]});
        assert.deepStrictEqual(historyBody.contents[9], {role: "model", parts: [{text: "A6"}]});
        assert.deepStrictEqual(historyBody.contents[10], {role: "user", parts: [{text: "Q actual"}]});
        assert.deepStrictEqual(historyBody.systemInstruction, {parts: [{text: "Persona propia"}]});

            const longHistory = Array.from({length: 5}, () => ({
                question: "¿".repeat(1000),
                answer: "😀".repeat(1800)
            }));
            await gemini.generateAnswer("Pregunta actual", {
                apiKey: "test-key",
                model: "test-model",
                history: longHistory
            });
            const boundedHistory = JSON.parse(requests[2].request.body).contents.slice(0, -1);
            assert(boundedHistory.reduce((total, turn) => total + Array.from(turn.parts[0].text).length, 0) <= 5000);
            assert.strictEqual(boundedHistory.length, 4);

        responseText = `${"😀".repeat(2000)}`;
        const boundedAnswer = await gemini.generateAnswer("pregunta explícita", {
            apiKey: "test-key",
            model: "test-model",
            timeoutMs: 1200
        });
        assert.strictEqual(Array.from(boundedAnswer).length, 1800);
        assert(!boundedAnswer.includes("\uFFFD"));

        await assert.rejects(
            gemini.generateAnswer("pregunta", {apiKey: "", model: "test-model"}),
            error => error.message === "MISSING_API_KEY"
        );
        await assert.rejects(
            gemini.generateAnswer("x".repeat(1001), {apiKey: "test-key", model: "test-model"}),
            error => error.message === "INVALID_QUESTION"
        );

        hangRequest = true;
        await assert.rejects(
            gemini.generateAnswer("pregunta explícita", {
                apiKey: "test-key",
                model: "test-model",
                timeoutMs: 5
            }),
            error => error.message === "REQUEST_TIMEOUT"
        );
    } finally {
        https.request = originalRequest;
    }
}

function createMemoryModel() {
    const records = new Map();
    const keyOf = ({guildID, userID}) => `${guildID}:${userID}`;
    return {
        records,
        async findOne(filter) {
            return records.get(keyOf(filter)) || null;
        },
        async findOneAndUpdate(filter, update) {
            const key = keyOf(filter);
            const record = records.get(key) || {
                guildID: filter.guildID,
                userID: filter.userID,
                enabled: false,
                exchanges: [],
                preferences: [],
                trustSignals: []
            };
            if (update.$set) Object.assign(record, update.$set);
            records.set(key, record);
            return record;
        },
        async updateOne(filter, update) {
            const record = records.get(keyOf(filter));
            if (!record || record.enabled !== filter.enabled) return {modifiedCount: 0, nModified: 0};
            if (update.$push) {
                const additions = update.$push.exchanges.$each;
                record.exchanges.push(...additions);
                record.exchanges = record.exchanges.slice(update.$push.exchanges.$slice);
            }
            if (update.$addToSet) {
                for (const [field, value] of Object.entries(update.$addToSet)) {
                    if (!record[field].includes(value)) record[field].push(value);
                }
            }
            return {modifiedCount: 1, nModified: 1};
        },
        async deleteOne(filter) {
            const deletedCount = records.delete(keyOf(filter)) ? 1 : 0;
            return {deletedCount};
        }
    };
}

async function testMemoryStore() {
    const model = createMemoryModel();
    assert.strictEqual(await memory.findMemory(model, "guild-a", "user-a"), null);
    await memory.appendExchange(model, "guild-a", "user-a", "ignored", "ignored");
    assert.strictEqual(model.records.size, 0);

    await memory.enableMemory(model, "guild-a", "user-a");
    for (let index = 0; index < 7; index++) {
        await memory.appendExchange(model, "guild-a", "user-a", `Q${index}`, `A${index}`);
    }
    assert.deepStrictEqual(memory.getHistory(await memory.findMemory(model, "guild-a", "user-a")), [
        {question: "Q2", answer: "A2"},
        {question: "Q3", answer: "A3"},
        {question: "Q4", answer: "A4"},
        {question: "Q5", answer: "A5"},
        {question: "Q6", answer: "A6"}
    ]);
    assert.strictEqual((await memory.findMemory(model, "guild-b", "user-a")), null);
    await memory.enableMemory(model, "guild-b", "user-a");
    assert.deepStrictEqual(memory.getHistory(await memory.findMemory(model, "guild-b", "user-a")), []);
    assert.strictEqual(await memory.findMemory(model, "guild-a", "user-b"), null);
    await memory.appendRelationshipSignal(model, "guild-a", "user-a", {
        signal: "comida:pizza",
        preference: "comida: pizza"
    });
    assert.deepStrictEqual((await memory.findMemory(model, "guild-a", "user-a")).preferences, ["comida: pizza"]);
    assert.deepStrictEqual((await memory.findMemory(model, "guild-b", "user-a")).preferences, []);

    await memory.disableMemory(model, "guild-a", "user-a");
    const disabled = await memory.findMemory(model, "guild-a", "user-a");
    assert.strictEqual(disabled.enabled, false);
    assert.strictEqual(disabled.exchanges.length, 5);
    assert.deepStrictEqual(memory.getHistory(disabled), []);
    await memory.appendExchange(model, "guild-a", "user-a", "not saved", "not saved");
    assert.strictEqual((await memory.findMemory(model, "guild-a", "user-a")).exchanges.length, 5);

    const chunks = memory.splitMemoryForDM({
        enabled: true,
        exchanges: [{question: "Q".repeat(1000), answer: "A".repeat(1800)}]
    });
    assert(chunks.length > 1);
    assert(chunks.every(chunk => Array.from(chunk).length <= 1800));
    await memory.deleteMemory(model, "guild-a", "user-a");
    assert.strictEqual(await memory.findMemory(model, "guild-a", "user-a"), null);
}

async function testCommandPrivacyAndOutput() {
    const helperPath = require.resolve('../utils/gemini.js');
    const commandPath = require.resolve('../comandos/🤖 IA/ia.js');
    const helper = require(helperPath);
    const Module = require('module');
    const originalLoad = Module._load;
    const memoryModel = createMemoryModel();
    Module._load = function(request, parent, isMain) {
        if (request.endsWith('/modelos/memoria-ia.js')) return memoryModel;
        return originalLoad.call(this, request, parent, isMain);
    };
    const originalGenerateAnswer = helper.generateAnswer;
    const originalApiKey = process.env.GEMINI_API_KEY;
    const questions = [];
    const contexts = [];
    const systemInstructions = [];
    helper.generateAnswer = async (question, options) => {
        questions.push(question);
        contexts.push(options);
        return "Respuesta de IA @everyone";
    };
    process.env.GEMINI_API_KEY = "test-key";
    delete require.cache[commandPath];
    const command = require(commandPath);
    const message = {
        guild: {id: "guild-command"},
        author: {
            id: "user-command",
            async send(payload) { message.dms.push(payload); return payload; }
        },
        replies: [],
        dms: [],
        async reply(payload) {
            const reply = {
                payload,
                async edit(updated) { this.edited = updated; return updated; }
            };
            this.replies.push(reply);
            return reply;
        },
    };

    try {
        helper.resetRateLimits();
        await command.run({}, message, ["¿Qué", "hora", "es?"], "!");
        assert.strictEqual(questions.length, 1);
        assert.strictEqual(questions[0], "¿Qué hora es?");
        assert(message.replies[0].payload.content.includes("Google"));
        assert.deepStrictEqual(message.replies[0].payload.allowedMentions, {parse: []});
        assert(message.replies[0].edited.content.includes("Respuesta de IA @everyone"));
        assert.deepStrictEqual(message.replies[0].edited.allowedMentions, {parse: []});
        assert.deepStrictEqual(contexts[0].history, []);
        systemInstructions.push(contexts[0].systemInstruction);
        assert(contexts[0].systemInstruction.includes("Eres Brasa"));

        await command.run({}, message, ["memoria", "activar"], "!");
        assert(message.replies[1].payload.content.includes("Google"));
        assert(message.replies[1].payload.content.includes("MongoDB"));
        assert.strictEqual((await memory.findMemory(memoryModel, "guild-command", "user-command")).enabled, true);

        gemini.resetRateLimits();
        await command.run({}, message, ["Me", "gusta", "la", "pizza"], "!");
        assert.deepStrictEqual(contexts[1].history, []);
        assert.deepStrictEqual(
            (await memory.findMemory(memoryModel, "guild-command", "user-command")).preferences,
            ["comida: pizza"]
        );
        assert(message.replies[2].payload.content.includes("hasta 5 intercambios guardados"));
        assert.strictEqual((await memory.findMemory(memoryModel, "guild-command", "user-command")).exchanges.length, 1);

        gemini.resetRateLimits();
        await command.run({}, message, ["¿Qué", "opinas?"], "!");
        assert.deepStrictEqual(contexts[2].history, [{question: "Me gusta la pizza", answer: "Respuesta de IA @everyone"}]);
        assert(contexts[2].systemInstruction.includes("comida: pizza"));
        assert(contexts[2].systemInstruction.includes("confianza inicial"));
        assert.strictEqual((await memory.findMemory(memoryModel, "guild-command", "user-command")).exchanges.length, 2);

        await command.run({}, message, ["memoria", "ver"], "!");
        assert(message.dms.length > 0);
        assert(message.dms.every(dm => dm.allowedMentions.parse.length === 0));
        assert(message.dms.every(dm => Array.from(dm.content).length <= 1880));
        assert(message.replies[4].payload.content.includes("por DM"));
        assert(message.dms.every(dm => !message.replies[4].payload.content.includes(dm.content.slice(0, 40))));
        assert(message.dms.some(dm => dm.content.includes("Me gusta la pizza")));
        assert(message.dms.some(dm => dm.content.includes("¿Qué opinas?")));

        const sendDM = message.author.send;
        message.author.send = async () => { throw new Error("DMs disabled"); };
        message.replies = [];
        const originalDMError = console.error;
        console.error = () => {};
        try {
            await command.run({}, message, ["memoria", "ver"], "!");
        } finally {
            console.error = originalDMError;
            message.author.send = sendDM;
        }
        assert(message.replies[0].payload.content.includes("no se publicó aquí"));
        assert(!message.replies[0].payload.content.includes("segunda pregunta"));

        await command.run({}, message, ["memoria", "desactivar"], "!");
        assert(message.replies[1].payload.content.includes("permanecen en MongoDB"));
        assert.strictEqual((await memory.findMemory(memoryModel, "guild-command", "user-command")).exchanges.length, 2);
        gemini.resetRateLimits();
        await command.run({}, message, ["cuarta", "pregunta"], "!");
        assert.deepStrictEqual(contexts[3].history, []);
        assert(message.replies[2].payload.content.includes("La memoria anterior permanece en MongoDB"));
        assert.strictEqual((await memory.findMemory(memoryModel, "guild-command", "user-command")).exchanges.length, 2);

        await command.run({}, message, ["memoria", "borrar"], "!");
        assert.strictEqual(await memory.findMemory(memoryModel, "guild-command", "user-command"), null);

        await command.run({}, message, ["memoria", "activar"], "!");
        helper.generateAnswer = async () => { throw new Error("PROVIDER_REQUEST_FAILED"); };
        gemini.resetRateLimits();
        message.replies = [];
        const originalFailureLog = console.error;
        console.error = () => {};
        try {
            await command.run({}, message, ["pregunta", "fallida"], "!");
        } finally {
            console.error = originalFailureLog;
        }
        assert.strictEqual(questions.length, 4);
        assert(message.replies[0].edited.content.includes("no pudo procesar"));
        assert.strictEqual((await memory.findMemory(memoryModel, "guild-command", "user-command")).exchanges.length, 0);

        gemini.resetRateLimits();
        helper.generateAnswer = async () => { throw new Error("REQUEST_TIMEOUT"); };
        message.replies = [];
        const originalError = console.error;
        console.error = () => {};
        try {
            await command.run({}, message, ["otra", "pregunta"], "!");
        } finally {
            console.error = originalError;
        }
        assert(message.replies[0].edited.content.includes("tardó demasiado"));

        gemini.resetRateLimits();
        delete process.env.GEMINI_API_KEY;
        message.replies = [];
        await command.run({}, message, ["pregunta", "sin", "clave"], "!");
        assert(message.replies[0].payload.content.includes("GEMINI_API_KEY"));
    } finally {
        helper.generateAnswer = originalGenerateAnswer;
        helper.resetRateLimits();
        if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalApiKey;
        delete require.cache[commandPath];
        Module._load = originalLoad;
    }
}

(async () => {
    await testRateLimits();
    await testMentionTrigger();
    await testMessageCreateIntegration();
    testPersona();
    await testDailyIcebreakers();
    await testGeminiRequest();
    await testMemoryStore();
    await testCommandPrivacyAndOutput();
    console.log("AI tests passed: persona and trust progression, mention routing, daily scheduler, opt-in memory, isolation, context, retention, deletion, DM privacy and mention safety.");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
