const mongoose = require('mongoose');
const config = require('../../config/config.json');
const setupSchema = require('../../modelos/setups.js');
const {startDailyIcebreakers} = require('../../utils/ia-social.js');
module.exports = client => {
    //Nos conectamos a la base de datos

    let palo = 53;

    mongoose.connect(config.mongodb, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
        startDailyIcebreakers(client, setupSchema);
        console.log(`
╔═════════════════════════════════════════════════════╗
║                                                     ║
║       Conectado a la base de datos de MONGODB!      ║
║                                                     ║
╚═════════════════════════════════════════════════════╝`.blue)
    }).catch((err) => {
        console.log(`☁ ERROR AL CONECTAR A LA BASE DE DATOS DE MONGODB`.red);
        console.log(err)
    })

    console.log(`╔═════════════════════════════════════════════════════╗`.green)
    console.log(`║ `.green + " ".repeat(-1 + palo - 1) + " ║".green)
    console.log(`║ `.green + `      Conectado como ${client.user.tag}`.green + " ".repeat(-1 + palo - 1 - `      Conectado como ${client.user.tag}`.length) + " ║".green)
    console.log(`║ `.green + " ".repeat(-1 + palo - 1) + " ║".green)
    console.log(`╚═════════════════════════════════════════════════════╝`.green)
}

/*
╔═════════════════════════════════════════════════════╗
║    || - || Desarrollado por dewstouh#1088 || - ||   ║
║    ----------| discord.gg/MBPsvcphGf |----------    ║
╚═════════════════════════════════════════════════════╝
*/
