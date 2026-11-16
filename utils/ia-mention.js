function getMentionQuestion(message, botId, prefix) {
    if (!message.guild || !message.channel || message.author?.bot) return null;
    if (!message.content || (prefix && message.content.startsWith(prefix))) return null;
    if (!message.mentions?.users?.has(botId)) return null;

    const escapedBotId = botId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionPattern = new RegExp(`<@!?${escapedBotId}>`, 'g');
    const question = message.content
        .replace(mentionPattern, " ")
        .replace(/<@!?\d{17,20}>|<@&\d{17,20}>|<#\d{17,20}>/g, " ")
        .replace(/^[\s,.:;!?¡—-]+/, "")
        .trim();

    if (!/[\p{L}\p{N}]/u.test(question)) return null;
    return question;
}

async function routeMentionToGemini(client, message, prefix, command) {
    const question = getMentionQuestion(message, client.user.id, prefix);
    if (!question || !command || typeof command.run !== "function") return false;
    await command.run(client, message, [question], prefix);
    return true;
}

module.exports = {getMentionQuestion, routeMentionToGemini};
