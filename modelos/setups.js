const mongoose = require('mongoose');

const setupSchema = new mongoose.Schema({
    guildID: String,
    reaccion_roles: Array,
    sistema_tickets: {type: Object, default: {canal: "", mensaje: ""}},
    sugerencias: {type: String, default: ""},
    niveles: {type: Object, default: {canal: "", mensaje: ""}},
    bienvenida: {type: Object, default: {canal: "", mensaje: "¡Bienvenido/a {user} a **{server}**!"}},
    logs: {type: String, default: ""},
    iaSocial: {
        enabled: {type: Boolean, default: false},
        channelID: {type: String, default: ""},
        lastIcebreakerDate: {type: String, default: ""}
    },
})

const model = mongoose.model("Configuraciones", setupSchema);

module.exports = model;

/*
╔═════════════════════════════════════════════════════╗
║    || - || Desarrollado por dewstouh#1088 || - ||   ║
║    ----------| discord.gg/MBPsvcphGf |----------    ║
╚═════════════════════════════════════════════════════╝
*/
