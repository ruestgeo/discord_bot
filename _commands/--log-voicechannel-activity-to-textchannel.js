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





const utils = require('../utils.js'); //utils is located in the directory above, if needed
const bot = require('../bot.js');

var alreadyListening = false; //only log one channel at a time
var globals;
var client;
var voiceChannel;
var textChannel;
var connection;
var voiceChannelName;


module.exports = {
    version: 1.1,
    auth_level: 3,



    manual: "**--log-voicechannel-activity-to-textchannel**  ->  `{\"voice\": \"channel_ID\", \"text\": \"channel_ID\"}`"
            +"\n.     *Logs voice channel activity (join/leave) to text channel*",



    func: async function (_globals, msg, content){ 
        globals = _globals
        client = globals.client;
        
        try{
            args = JSON.parse(content);
        }
        catch (err){
            alreadyListening = false;
            throw ("Incorrect request body ::  "+err);
        }
        if (!args.hasOwnProperty('voice') || !args.hasOwnProperty('text')){
            alreadyListening = false;
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        var voice_channel_ID = args.voice;
        var text_channel_ID = args.text;

        //erase existing listener if already listening
        if (alreadyListening){
            client.off('voiceStateUpdate', listenToVoiceChannelActivity);
            connection.disconnect();
            textChannel.send("Received new logging request, halting existing voice activity listener");
        }
        alreadyListening = true;


        utils.botLogs(globals,  "--fetching channel ["+voice_channel_ID+"]");
        voiceChannel = await client.channels.fetch(voice_channel_ID.trim())
        .catch(err => {
            alreadyListening = false;
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred during voice channel fetch, couldn't complete the request\n`"+err+"`");
        });
        if (voiceChannel.type !== "voice"){
            alreadyListening = false;
            throw new Error("Incorrect voice channel id.  Given channel ["+voice_channel_ID+"] is type: '"+voiceChannel.type+"'");
        }
        utils.botLogs(globals,  "--fetching channel ["+text_channel_ID+"]");
        textChannel = await client.channels.fetch(text_channel_ID.trim())
        .catch(err => {
            alreadyListening = false;
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred during text channel fetch, couldn't complete the request\n`"+err+"`");
        });
        if (textChannel.type !== "text"){
            alreadyListening = false;
            throw new Error("Incorrect text channel id.  Given channel ["+text_channel_ID+"] is type: '"+textChannel.type+"'");
        }
        voiceChannelName = voiceChannel.name+":"+voiceChannel.id;



        connection = await voiceChannel.join()
        .catch(err => { 
            alreadyListening = false;
            throw ("error when joining voice channel ::  "+err); 
        });
        utils.botLogs(globals, "Joined voice channel ["+voiceChannelName+"]");


        textChannel.send("**Logging voice activity from ["+voiceChannelName+"]**\n***"+utils.getDateTimeString(globals)+"***");
        
        client.on('voiceStateUpdate', listenToVoiceChannelActivity);
        if (globals._shutdown) {
            globals._shutdown.push( async (globals) => {
                console.log("    __[lvcattc] shutdown");
                await textChannel.send("**Bot Shutting down, ending voice activity listener**");
                client.off('voiceStateUpdate', listenToVoiceChannelActivity);
            });
        }

        return "Request complete\n Listening to voice activity from ["+voiceChannelName+"] and logging in ["+textChannel.name+":"+textChannel.id+"]"
    }  
}

async function listenToVoiceChannelActivity(oldState, newState){
    var oldChannel = oldState.channel ? await oldState.channel.fetch() : undefined;
    var newChannel = newState.channel ? await newState.channel.fetch() : undefined;
    var member = newState.member;
    var oldChannelName = (oldChannel ? (oldChannel.name+":"+oldChannel.id) : "null");
    var newChannelName = (newChannel ? (newChannel.name+":"+newChannel.id) : "null");

    //console.log("DEBUG    "+ "["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] left old channel ["+oldChannelName+"] joined new channel ["+newChannelName+"]");

    
    voiceChannel = await voiceChannel.fetch(); //update voicechannel list            
    if ( (member.id === globals.bot_id) 
    && (oldChannel ? (oldChannel.id === voiceChannel.id) : false )
    && (newChannel ? (newChannel.id !== voiceChannel.id) : (newChannel === undefined)) ){
        /* bot disconnected from channel */
        console.log("__[lvcattc] bot disconnected from channel -> disabling listener");
        client.off('voiceStateUpdate', listenToVoiceChannelActivity);
        textChannel.send("**Bot disconnected from voice channel**\n**Ending voice activity listener**");
        alreadyListening = false;
    }
    else if ( !voiceChannel.members.has(globals.bot_id) ){
        /* bot isn't in channel (missed disconnect event) */
        console.log("__[lvcattc] bot found not in channel -> disabling listener");
        client.off('voiceStateUpdate', listenToVoiceChannelActivity);
        textChannel.send("**Bot was ghosted from voice channel...**👻\n**Ending voice activity listener**").catch(err => {console.log("--unable to send disconnect notification");});
        alreadyListening = false;
    }
    else if ( oldChannelName !== newChannelName ){ //( oldChannel ? (newChannel ? (newChannel.id !== oldChannel.id) : true) : newChannel ){ 
        /* not the same channel */
        //console.log("DEBUG    Not same channel");
        if ( newChannel ? (newChannel.id  === voiceChannel.id) : false ){
            /* user joined specified voice channel */
            //console.log("DEBUG    joined target channel");
            textChannel.send("["+member.displayName+"#"+member.user.discriminator+"] joined voice channel ["+newChannelName+"] at  *"+utils.getDateTimeString(globals)+"*");
        }
        else if ( (oldChannel ? (oldChannel.id === voiceChannel.id) : false ) 
        && (newChannel ? (newChannel.id !== voiceChannel.id) : (newChannel === undefined)) ){
            /* user left specified voice channel */
            //console.log("DEBUG    left target channel");
            newChannel ? 
            textChannel.send("["+member.displayName+"#"+member.user.discriminator+"] left voice channel ["+voiceChannelName+"] and joined ["+newChannelName+"] at  *"+utils.getDateTimeString(globals)+"*") :
            textChannel.send("["+member.displayName+"#"+member.user.discriminator+"] left voice channel ["+voiceChannelName+"] at  *"+utils.getDateTimeString(globals)+"*")
        }
    }
    
}






