const mongoose = require('mongoose');

const exchangeSchema = new mongoose.Schema({
    question: {type: String, required: true},
    answer: {type: String, required: true},
}, {_id: false});

const memorySchema = new mongoose.Schema({
    guildID: {type: String, required: true},
    userID: {type: String, required: true},
    enabled: {type: Boolean, default: false},
    exchanges: {type: [exchangeSchema], default: []},
    preferences: {type: [String], default: []},
    trustSignals: {type: [String], default: []},
});

memorySchema.index({guildID: 1, userID: 1}, {unique: true});

module.exports = mongoose.model("IAMemory", memorySchema);
