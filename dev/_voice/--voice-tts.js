/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code if distributing any modifications
*/




const dtts = require("discord-tts");
const Discord = require("discord.js");

const Discord = require('discord.js');
const utils = require(process.cwd()+'/utils.js');
const voiceUtils = require(process.cwd()+'/_utils/voice_utils.js');

/**
 * @typedef streamInfo
 * @property {Discord.VoiceConnection} connection
 * @property {String} requester user ID
 */
/**
 * @type {{[key: Discord.Snowflake]: streamInfo}} streams collection of stream info
 */
let streams = {};

//TODO fix and fix for @discordjs/voice

module.exports = {
    version: 1.0,
    auth_level: 5,



    manual: "**--voice-tts**  ->  *message_to_speak* \n" +
            "~~**•** >~~  *speaks out a message in the currently connected voice channel*",

    requisites: {
        commands: ["voice.js"]
    },

/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){ 
        let server = await msg.guild.fetch();
        let connection; 
        
        /*DEV*/ //let utils = require("../utils.js");
        /*DEV*/ //let voiceUtils = require("../_utils/voice_utils.js");
        
        if ( !(await voiceUtils.hasRolePermission(msg.member)) )  throw ("Insufficient permissions:  lacking role to use voice commands");

        connection = voiceUtils.fetchLatestConnection(globals.client, msg.guild.id);
        if (!connection) throw ("Currently not connected to a voice channel in this server");


        let userID = msg.author.id;
        let serverID = msg.guild.id;

        if (content === ''){
            try{
                connection.dispatcher.pause();
                connection.dispatcher.destroy();
                await connection.voice.setMute(true);
                if (streams.hasOwnProperty(serverID)) delete streams[serverID];
            }
            catch (err) {console.error}
            return;
        }

        streams[serverID] = {'connection': connection, 'requester': userID};

        await connection.voice.setMute(false);
        let stream = dtts.getVoiceStream(content);
        let dispatcher = connection.play(stream);

        dispatcher.once('error', async (err) => {
            utils.awaitLogs(globals, "__[voice-tts] error on tts from user ID "+userID+"   in server ID "+serverID+"\n"+err, 5); 
            let conn = streams[serverID].connection;
            conn.dispatcher.pause(); 
            conn.dispatcher.destroy();
            await conn.voice.setMute(true);
            delete streams[serverID];
        });
        dispatcher.once('finish', async _ => { 
            utils.awaitLogs(globals, "__[voice-tts] finished tts from user ID "+userID+"   in server ID "+serverID, 5); 
            let conn = streams[serverID].connection;
            try{ conn.dispatcher.destroy(); } catch (err) {console.error}
            await conn.voice.setMute(true); 
            delete streams[serverID];
        });



    }

    
}






