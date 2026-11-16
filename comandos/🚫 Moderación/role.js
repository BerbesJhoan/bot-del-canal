const Discord = require('discord.js');

module.exports = {
    name: "role",
    aliases: ["rol"],
    desc: "Asigna o quita un rol a un miembro o grupo",
    permisos: ["ManageRoles"],
    permisos_bot: ["ManageRoles"],
    run: async (client, message, args, prefix) => {
        const modo = (args[0] || "").toLowerCase();
        const accion = (modo === "member" || modo === "miembro") ? args[3] : args[2];
        const roleArg = (modo === "member" || modo === "miembro") ? args[2] : args[1];
        const roleId = roleArg?.match(/^<@&(\d+)>$/)?.[1] || roleArg;
        const role = message.guild.roles.cache.get(roleId);
        if (!["member", "miembro", "all", "todos", "humans", "humanos", "bots"].includes(modo)
            || !["add", "remove", "agregar", "quitar"].includes((accion || "").toLowerCase())
            || !role) {
            return message.reply(`❌ **Uso:** \`${prefix}role member @miembro @rol add|remove\` o \`${prefix}role all|humans|bots @rol add|remove\``);
        }
        if (role.id === message.guild.id || role.managed || !role.editable) {
            return message.reply("❌ **No puedo administrar ese rol. Revisa la jerarquía de roles y mis permisos.**");
        }
        if (message.author.id !== message.guild.ownerId
            && role.position >= message.member.roles.highest.position) {
            return message.reply("❌ **No puedes administrar un rol igual o superior al tuyo.**");
        }

        const add = ["add", "agregar"].includes(accion.toLowerCase());
        if (modo === "member" || modo === "miembro") {
            const member = message.mentions.members.first()
                || await message.guild.members.fetch(args[1]).catch(() => null);
            if (!member) return message.reply("❌ **No se encontró al miembro.**");
            if (!member.manageable) return message.reply("❌ **No puedo administrar los roles de ese miembro por la jerarquía del servidor.**");
            if (member.id === message.guild.ownerId || member.roles.highest.position >= message.member.roles.highest.position
                && message.author.id !== message.guild.ownerId) {
                return message.reply("❌ **No puedes modificar los roles de ese miembro.**");
            }
            try {
                if (add) await member.roles.add(role);
                else await member.roles.remove(role);
            } catch (error) {
                console.error(`No se pudo actualizar el rol ${role.id} de ${member.id}:`, error);
                return message.reply("❌ **No se pudo actualizar el rol. Verifica los permisos y la jerarquía del bot.**");
            }
            return message.reply(`✅ Rol ${role} ${add ? "asignado a" : "quitado de"} ${member}.`);
        }

        const confirmacion = await message.reply(
            `⚠️ Esto afectará a miembros de tipo **${modo}**. Responde **confirmar** en 30 segundos para continuar.`
        );
        const confirmados = await message.channel.awaitMessages({
            filter: respuesta => respuesta.author.id === message.author.id
                && respuesta.content.toLowerCase() === "confirmar",
            max: 1,
            time: 30000
        });
        if (!confirmados.size) return confirmacion.edit("Operación cancelada: no se recibió confirmación.");

        const members = await message.guild.members.fetch();
        const targets = members.filter(member => {
            if (modo === "bots" && !member.user.bot) return false;
            if ((modo === "humans" || modo === "humanos") && member.user.bot) return false;
            if (!add && !member.roles.cache.has(role.id)) return false;
            if (add && member.roles.cache.has(role.id)) return false;
            return member.id !== message.guild.ownerId
                && (message.author.id === message.guild.ownerId
                    || member.roles.highest.position < message.member.roles.highest.position);
        });

        let exitos = 0;
        let fallidos = 0;
        for (const member of targets.values()) {
            try {
                if (add) await member.roles.add(role);
                else await member.roles.remove(role);
                exitos++;
            } catch (error) {
                fallidos++;
                console.error(`No se pudo actualizar el rol ${role.id} de ${member.id}:`, error);
            }
        }
        return confirmacion.edit(`✅ Operación terminada: ${exitos} cambios correctos${fallidos ? ` y ${fallidos} fallidos` : ""}.`);
    }
}
