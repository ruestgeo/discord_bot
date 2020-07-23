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





const utils = require('../utils.js'); 


var alreadyListening = false; //only log one channel at a time
var globals;
var client;
var voiceChannel;
var textChannel;
var controlChannel;
var connection;
var voiceChannelName;
var controlChannelName;

//TODO add support for multi-server use


module.exports = {
    version: 1.3,
    auth_level: 3,



    manual: "**--log-voicechannel-activity-to-textchannel**  ->  `{\"voice\": \"channel_ID\", \"text\": \"channel_ID\"  <,\"control\": \"channel_ID\">}`"
            +"\n.     *Logs voice channel activity (join/leave) to text channel.*"
            +"\n.     *If the bot leaves the control channel then it will stop watching and logging activity*",



    func: async function (_globals, msg, content){ 
        globals = _globals
        client = globals.client;
        
        try{
            args = JSON.parse(content);
        }
        catch (err){
            throw ("Incorrect request body ::  "+err);
        }
        if (!args.hasOwnProperty('voice') || !args.hasOwnProperty('text')){
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


        utils.botLogs(globals,  "--fetching voice channel ["+voice_channel_ID+"]");
        voiceChannel = await client.channels.fetch(voice_channel_ID.trim())
        .catch(err => {
            alreadyListening = false;
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred during voice channel fetch, couldn't complete the request\n`"+err+"`");
        });
        if (voiceChannel.type !== "voice"){
            alreadyListening = false;
            utils.botLogs("----invalid channel type");
            throw new Error("Incorrect voice channel id.  Given channel ["+voice_channel_ID+"] is type: '"+voiceChannel.type+"'");
        }
        voiceChannelName = voiceChannel.name+":"+voiceChannel.id;

        utils.botLogs(globals,  "--fetching text channel ["+text_channel_ID+"]");
        textChannel = await client.channels.fetch(text_channel_ID.trim())
        .catch(err => {
            alreadyListening = false;
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred during text channel fetch, couldn't complete the request\n`"+err+"`");
        });
        if (textChannel.type !== "text"){
            alreadyListening = false;
            utils.botLogs("----invalid channel type");
            throw new Error("Incorrect text channel id.  Given channel ["+text_channel_ID+"] is type: '"+textChannel.type+"'");
        }


        if (!args.hasOwnProperty('control') ){ 
            controlChannel = voiceChannel; 
            controlChannelName = voiceChannelName 
        }
        else {
            var control_channel_ID = args.control;
            utils.botLogs(globals,  "--fetching control channel ["+control_channel_ID+"]");
            controlChannel = await client.channels.fetch(control_channel_ID.trim())
            .catch(err => {
                alreadyListening = false;
                utils.botLogs(globals,  err.stack)
                throw ("An error occurred during control channel fetch, couldn't complete the request\n`"+err+"`");
            });
            if (controlChannel.type !== "voice"){
                alreadyListening = false;
                utils.botLogs("----invalid channel type");
                throw new Error("Incorrect voice channel id.  Given channel ["+control_channel_ID+"] is type: '"+controlChannel.type+"'");
            }
            controlChannelName = controlChannel.name+":"+controlChannel.id;
        }
        connection = await controlChannel.join()
        .catch(err => { 
            alreadyListening = false;
            throw ("error when joining voice channel ::  "+err); 
        });
        utils.botLogs(globals, "Joined voice channel ["+controlChannelName+"]"); 
        

        textChannel.send("**Logging voice activity from ["+voiceChannelName+"]**\n***"+utils.getDateTimeString(globals)+"***");
        
        client.on('voiceStateUpdate', listenToVoiceChannelActivity);
        if (globals._shutdown) { //add shutdown command
            globals._shutdown.push( async (globals) => {
                if (alreadyListening){
                    console.log("    __[lvcattc] shutdown");
                    await textChannel.send("**Bot Shutting down, ending voice activity listener**");
                    client.off('voiceStateUpdate', listenToVoiceChannelActivity);
                    alreadyListening = false;
                    voiceChannel = undefined;
                    textChannel = undefined;
                    controlChannel = undefined;
                    connection = undefined;
                    voiceChannelName = undefined;
                    controlChannelName = undefined;
                }
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
    if (voiceChannelName !== controlChannelName) { controlChannel = await controlChannel.fetch(); }
    if ( (member.id === globals.bot_id) 
    && (oldChannel ? (oldChannel.id === controlChannel.id) : false )
    && (newChannel ? (newChannel.id !== controlChannel.id) : (newChannel === undefined)) ){
        /* bot disconnected from channel */
        console.log("__[lvcattc] bot disconnected from control channel -> disabling listener");
        client.off('voiceStateUpdate', listenToVoiceChannelActivity);
        textChannel.send("**Bot disconnected from control channel**\n**Ending voice activity listener**");
        alreadyListening = false;
        voiceChannel = undefined;
        textChannel = undefined;
        controlChannel = undefined;
        connection = undefined;
        voiceChannelName = undefined;
        controlChannelName = undefined;
    }
    else if ( !controlChannel.members.has(globals.bot_id) ){
        /* bot isn't in channel (missed disconnect event) */
        console.log("__[lvcattc] bot found not in control channel -> disabling listener");
        client.off('voiceStateUpdate', listenToVoiceChannelActivity);
        textChannel.send("**Bot was ghosted from control channel...**👻\n**Ending voice activity listener**").catch(err => {console.log("--unable to send disconnect notification");});
        alreadyListening = false;
        voiceChannel = undefined;
        textChannel = undefined;
        controlChannel = undefined;
        connection = undefined;
        voiceChannelName = undefined;
        controlChannelName = undefined;
    }
    else if ( oldChannelName !== newChannelName ){ //( oldChannel ? (newChannel ? (newChannel.id !== oldChannel.id) : true) : newChannel ){ 
        /* not the same channel */
        //console.log("DEBUG    Not same channel");
        if ( newChannel ? (newChannel.id  === voiceChannel.id) : false ){
            /* user joined specified voice channel */
            //console.log("DEBUG    joined target channel");
            oldChannel ?
            textChannel.send(member.displayName+"#"+member.user.discriminator+" switched to ["+newChannelName+"] from ["+oldChannelName+"] at  *"+utils.getDateTimeString(globals)+"*") :
            textChannel.send(member.displayName+"#"+member.user.discriminator+" joined ["+newChannelName+"] at  *"+utils.getDateTimeString(globals)+"*");
        }
        else if ( (oldChannel ? (oldChannel.id === voiceChannel.id) : false ) 
        && (newChannel ? (newChannel.id !== voiceChannel.id) : (newChannel === undefined)) ){
            /* user left specified voice channel */
            //console.log("DEBUG    left target channel");
            newChannel ? 
            textChannel.send(member.displayName+"#"+member.user.discriminator+" left ["+voiceChannelName+"] and joined ["+newChannelName+"] at  *"+utils.getDateTimeString(globals)+"*") :
            textChannel.send(member.displayName+"#"+member.user.discriminator+" left ["+voiceChannelName+"] at  *"+utils.getDateTimeString(globals)+"*");
        }
    }
    
}






