/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code when asked if not already made public
*/






const utils = require(process.cwd()+'/utils.js');
const voiceUtils = require(process.cwd()+'/_utils/voice_utils.js');



module.exports = {
    version: 1.3,
    auth_level: 1,



    manual: "**--voice**  ->  \\**none*\\* ~~  or  ~~ \\**channel_ID*\\*  ~~  or  ~~ \\**channel_name*\\* \n" +
            ".     *if no args given, the bot is in a channel in the server, and the requester has permission to connect to that channel then bot will disconnect from that channel*\n"+
            ".     *if an identifier for a voice channel within the server is given and user has sufficient permission then the bot will join that voice channel*",

    requisites: {
        "startups" : ["voice_setup.js"]
    },

    func: async function (globals, msg, content){ 
        let client = globals.client;
        let server = await msg.guild.fetch();
        let connection; 
        
        if ( !(await voiceUtils.hasRolePermission(msg.member)) )  throw ("Insufficient permissions:  lacking role to use voice commands");



        /* leave voice */
        if (content === ""){
            connection = utils.getVoiceConnection(client, server.id);
            if (connection === null) throw ("Bot is not connected to a voice channel in this server");
            let channel = connection.channel;
            if ( !channel.permissionsFor(msg.member).has("CONNECT") ) throw (msg.member.displayName+"#"+msg.member.user.discriminator+" doesn't have permission to connect to ["+voiceChannelName+"]");
            connection.disconnect();
            return "Bot left voice channel ["+channel.name+":"+channel.id+"]";
        }


        /* join voice */
        utils.botLogs(globals,  "--resolving voice channel ["+content+"]");
        let voiceChannel;
        voiceChannel = server.channels.resolve(content);
        if (!voiceChannel){
            voiceChannel = server.channels.cache.find(_channel => _channel.name === content);
            if (!voiceChannel) throw ("Could not find voice channel ["+content+"] in server");
        }
        let voiceChannelName = voiceChannel.name+":"+voiceChannel.id;
        if (voiceChannel.type !== "voice"){
            throw new Error("Invalid voice channel.  Given channel ["+voiceChannelName+"] is type: '"+voiceChannel.type+"'");
        }
        

        /* check bot and member permission for channel */
        let bot_perms = voiceChannel.permissionsFor(client.user);
        if ( !bot_perms.has("CONNECT") ) throw ("Bot doesn't have permission to connect to ["+voiceChannelName+"]");
        let member_perms = voiceChannel.permissionsFor(msg.member);
        if ( !member_perms.has("CONNECT") ) throw (msg.member.displayName+"#"+msg.member.user.discriminator+" doesn't have permission to connect to ["+voiceChannelName+"]");


        /* connect and mute */
        connection = await voiceChannel.join().catch(err => { throw (err); });
        await connection.voice.setMute(true);
        return "Joined voice channel ["+voiceChannelName+"]";
    }

    
}






