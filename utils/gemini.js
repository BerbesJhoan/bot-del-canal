const https = require('https');

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_HISTORY_CHARS = 5000;
const USER_COOLDOWN_MS = 30 * 1000;
const GUILD_WINDOW_MS = 60 * 1000;
const GUILD_REQUEST_LIMIT = 10;

const userRequests = new Map();
const guildRequests = new Map();
let lastPruneAt = 0;

function checkRateLimit(guildId, userId, now = Date.now()) {
    if (now - lastPruneAt >= USER_COOLDOWN_MS) {
        for (const [key, timestamp] of userRequests) {
            if (now - timestamp >= USER_COOLDOWN_MS) userRequests.delete(key);
        }
        for (const [key, window] of guildRequests) {
            if (now - window.startedAt >= GUILD_WINDOW_MS) guildRequests.delete(key);
        }
        lastPruneAt = now;
    }

    const lastRequest = userRequests.get(userId);
    if (lastRequest !== undefined && now - lastRequest < USER_COOLDOWN_MS) {
        return {allowed: false, retryAfterMs: USER_COOLDOWN_MS - (now - lastRequest)};
    }

    const guildWindow = guildRequests.get(guildId);
    if (guildWindow && guildWindow.count >= GUILD_REQUEST_LIMIT) {
        return {allowed: false, retryAfterMs: GUILD_WINDOW_MS - (now - guildWindow.startedAt), scope: "server"};
    }

    userRequests.set(userId, now);
    if (guildWindow) guildWindow.count++;
    else guildRequests.set(guildId, {startedAt: now, count: 1});
    return {allowed: true};
}

function resetRateLimits() {
    userRequests.clear();
    guildRequests.clear();
    lastPruneAt = 0;
}

function generateAnswer(question, {
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
    timeoutMs = 15000,
    history = [],
    systemInstruction,
} = {}) {
    if (typeof apiKey !== "string" || !apiKey.trim()) return Promise.reject(new Error("MISSING_API_KEY"));
    if (typeof model !== "string" || !/^[a-zA-Z0-9._-]+$/.test(model)) {
        return Promise.reject(new Error("INVALID_MODEL"));
    }
    if (typeof question !== "string" || !question.trim() || question.length > 1000) {
        return Promise.reject(new Error("INVALID_QUESTION"));
    }

    const url = new URL(`${API_BASE_URL}${model}:generateContent`);
    const previousTurns = Array.isArray(history) ? history.slice(-5) : [];
    const boundedTurns = [];
    let remainingContext = MAX_HISTORY_CHARS;
    for (let index = previousTurns.length - 1; index >= 0 && remainingContext > 1; index--) {
        const exchange = previousTurns[index];
        if (typeof exchange.question !== "string" || typeof exchange.answer !== "string") continue;
        const question = Array.from(exchange.question).slice(0, 1000).join("");
        const answer = Array.from(exchange.answer).slice(0, 1800).join("");
        const questionBudget = Math.min(question.length, Math.ceil(remainingContext / 2));
        const boundedQuestion = Array.from(question).slice(0, questionBudget).join("");
        const answerBudget = Math.max(0, Math.min(answer.length, remainingContext - boundedQuestion.length));
        const boundedAnswer = Array.from(answer).slice(0, answerBudget).join("");
        if (!boundedQuestion || !boundedAnswer) continue;
        boundedTurns.unshift({question: boundedQuestion, answer: boundedAnswer});
        remainingContext -= boundedQuestion.length + boundedAnswer.length;
    }
    const contents = [];
    for (const exchange of boundedTurns) {
        contents.push({role: "user", parts: [{text: exchange.question}]});
        contents.push({role: "model", parts: [{text: exchange.answer}]});
    }
    contents.push({role: "user", parts: [{text: question}]});
    const body = JSON.stringify({
        contents,
        generationConfig: {maxOutputTokens: 512, temperature: 0.7},
        ...(typeof systemInstruction === "string" && systemInstruction
            ? {systemInstruction: {parts: [{text: systemInstruction.slice(0, 5000)}]}}
            : {})
    });

    return new Promise((resolve, reject) => {
        let timer;
        const request = https.request(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(body),
                'x-goog-api-key': apiKey
            }
        }, response => {
            let responseBody = '';
            let receivedBytes = 0;
            response.setEncoding('utf8');
            response.on('data', chunk => {
                receivedBytes += Buffer.byteLength(chunk);
                if (receivedBytes > MAX_RESPONSE_BYTES) {
                    request.destroy(new Error("RESPONSE_TOO_LARGE"));
                    return;
                }
                responseBody += chunk;
            });
            response.on('error', error => {
                clearTimeout(timer);
                reject(error);
            });
            response.on('end', () => {
                clearTimeout(timer);
                let result;
                try {
                    result = JSON.parse(responseBody);
                } catch {
                    return reject(new Error("INVALID_API_RESPONSE"));
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    const error = new Error("PROVIDER_REQUEST_FAILED");
                    error.statusCode = response.statusCode;
                    return reject(error);
                }

                const answer = result.candidates?.[0]?.content?.parts
                    ?.map(part => part.text || "")
                    .join("")
                    .trim();
                if (!answer) return reject(new Error("EMPTY_API_RESPONSE"));
                resolve(Array.from(answer).slice(0, 1800).join(""));
            });
        });

        timer = setTimeout(() => request.destroy(new Error("REQUEST_TIMEOUT")), timeoutMs);
        request.on('error', error => {
            clearTimeout(timer);
            reject(error);
        });
        request.write(body);
        request.end();
    });
}

module.exports = {
    checkRateLimit,
    generateAnswer,
    resetRateLimits,
    DEFAULT_MODEL,
    USER_COOLDOWN_MS,
    GUILD_WINDOW_MS,
    GUILD_REQUEST_LIMIT
};
