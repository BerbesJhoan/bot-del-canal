# Bot Público y Servidor de Soporte!

<a href="https://discord.gg/MBPsvcphGf"><img src="https://discordapp.com/api/guilds/879397504075063297/widget.png?style=banner2"></a>
 
¿No quieres o no puedes hostearlo?
[**Invita la versión oficial del Bot**](https://discord.com/api/oauth2/authorize?client_id=939952555839078401&permissions=8&scope=bot%20applications.commands)


# ⚠ IMPORTANTE ⚠
Gracias por usar este código! Porfavor, si tienes dudas, errores o preguntas sobre como se usa, unete al Discord de Soporte!
<br>💛 Apoya el desarollo [**donándonos**](https://paypal.me/deustouh) 

# Guía de Instalación 🔥

## Comandos añadidos

El bot conserva su prefijo por servidor. Las funciones incorporadas de
información, moderación y configuración se usan así:

* `serverinfo` y `userinfo [@miembro]`
* `clear <1-99>` elimina mensajes recientes; los de más de 14 días no se pueden borrar en bloque.
* `anuncio #canal | título | mensaje` publica un anuncio. Para mencionar un rol:
  `anuncio #canal | @rol | título | mensaje`.
* `timeout @miembro <minutos> [razón]` admite hasta 28 días.
* `role member @miembro @rol add|remove` administra un miembro.
  `role all|humans|bots @rol add|remove` pide confirmación antes de actuar en grupo.
* `setup-bienvenida #canal [mensaje]` configura la bienvenida; admite `{user}`,
  `{server}` y `{memberCount}`. `setup-bienvenida off` la desactiva.
* `setup-logs #canal` configura los registros de canales, baneos y mensajes;
  `setup-logs off` los desactiva.
* `ia <pregunta>` consulta a Gemini únicamente cuando se invoca. No usa el historial
  del canal; la memoria opcional está desactivada por defecto. Tiene un límite de 1 pregunta por usuario cada 30
  segundos y 10 preguntas por servidor cada minuto dentro de este proceso del bot.
* También puedes mencionar al bot y escribir tu pregunta sin prefijo. La mención
  sola o un mensaje que empieza por el prefijo no activa esta ruta; los comandos
  existentes, incluido `ia`, conservan prioridad.
* `setup-ia #canal` (administradores) habilita un canal social dedicado donde Brasa
  inicia como máximo una conversación breve por día UTC. `setup-ia off` lo desactiva.
  Los inicios no usan Gemini, no leen el historial, no mencionan usuarios y requieren
  permiso para escribir. Las respuestas a menciones y `ia` siguen funcionando.
* `ia memoria activar` activa la memoria solo para tu usuario en ese servidor. Guarda
  tus preguntas y respuestas exitosas de `ia` en MongoDB y las envía como contexto
  en próximas consultas. La retención es indefinida hasta que la borres manualmente.
* `ia memoria ver` te envía los intercambios guardados por mensaje directo, no al canal.
* `ia memoria desactivar` deja de guardar y enviar contexto, pero conserva los datos
  existentes. `ia memoria borrar` los elimina y desactiva la memoria.

Los comandos de configuración requieren permisos de administrador; moderación y
gestión de roles verifican permisos y jerarquía. Los canales se configuran en cada
servidor, sin depender de IDs externos.

### Configurar el comando de IA

Define `GEMINI_API_KEY` en las variables de entorno del proceso que ejecuta el bot.
Opcionalmente, define `GEMINI_MODEL` para elegir otro modelo de Gemini; el valor
predeterminado es `gemini-3.5-flash-lite`. No guardes estas claves en `config.json`,
el código ni en el repositorio. El comando requiere una conexión HTTPS saliente a
Google y devuelve un mensaje claro si falta configuración o el proveedor falla.

**Privacidad:** antes de cada consulta, el bot indica qué contexto se enviará. Sin
memoria, solo envía la pregunta escrita en `ia`; no lee mensajes del canal. Con la
memoria activada, envía además hasta cinco intercambios previos tuyos de ese servidor.
Al activarla, se te informa de que tus preguntas y respuestas exitosas se guardan en
MongoDB indefinidamente hasta que las borres. Google puede usar contenido enviado en
el nivel gratuito para mejorar sus productos. No incluyas información sensible.

### Personalidad de Brasa

Brasa es un personaje virtual original: una reparadora ficticia de radios y bicicletas
de Caleta Bruma, competitiva, impulsiva y fan de las empanadas picantes. Su humor,
opiniones y nivel de cercanía vienen de instrucciones propias del bot, no de un
personaje preexistente. La confianza solo progresa cuando una persona con memoria
activada expresa confianza o comparte de forma explícita un gusto no sensible
reconocido (comida, música o pasatiempos); no aumenta por contar mensajes ni infiere
rasgos privados. El tono se vuelve más cálido cuando el propio mensaje pide apoyo.


## ✅ Requisitos Mínimos

  * Tener instalado una versión de [nodejs](https://nodejs.org) 16.11.0 o mayor.
  * Un [cluster de MongoDB](https://www.mongodb.com/es/cloud/atlas/) para la base de datos.
  * Hostearlo en un VPS o un Raspberry PI, para no tener tu PC encendido 24/7
  

## 🤖 Configuración Básica

   1. Introducir el Token del Bot en el archivo `./config/config.json` **NOTA:** *Si usas REPLIT, lo podrá ver todo el mundo!(usa .env entonces)*
   2. Introducir el Prefijo del Bot en el archivo `./config/config.json`
   3. Introducir la URL de MongoDB en el archivo `./config/config.json` **NOTA:** *Si usas REPLIT, lo podrá ver todo el mundo!(usa .env entonces)*
   4. Instala los paquetes del Bot usando `npm i` en la consola.
   5. Inicia el Bot usando: `node index.js` o `npm start` en la consola.
     * Si tienes un servidor linux o tienes pm2 instalado, entonces usa: `pm2 start --name Nombre_Bot index.js`

## 🎶 Sistema de Música

   Si vas a hostear el bot en Linux, deberás de instalar ffmpeg con `sudo apt install ffmpeg`
   
   Si vas a hostear el bot en Windows, te recomiendo descargar ffmpeg de la [página oficial de descarga](https://ffmpeg.org/download.html) o puedes instalar ffmpeg-static con `npm i ffmpeg-static`

## 💛 APÓYANOS

> Puedes apoyarme invitando a uno de **nuestros Bots**

[![Niby 2.0 | El Más Completo Todo-En-Uno](https://cdn.discordapp.com/avatars/919695409813815367/73ae978048bf4ea3c751638372d92a1f.webp?size=256)](https://discord.com/api/oauth2/authorize?client_id=919695409813815367&permissions=8&scope=bot%20applications.commands)
[![Nythm | La mejor calidad de música](https://cdn.discordapp.com/avatars/890233523464700014/1a81e677c1883e5806c7cac56694b132.webp?size=256)](https://discord.com/api/oauth2/authorize?client_id=890233523464700014&permissions=8&scope=bot%20applications.commands)
[![Super Tickets | Tickets Avanzados y Completos](https://cdn.discordapp.com/avatars/901877569866051636/5500087dc7d4819f725e5d59aabf3f4c.webp?size=256)](https://discord.com/api/oauth2/authorize?client_id=901877569866051636&permissions=8&scope=bot%20applications.commands)

# Creditos

> Si vas a usar este bot, asegúrate de darme créditos!
