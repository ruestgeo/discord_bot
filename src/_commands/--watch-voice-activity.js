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



var globals;
var client;

var isListening = false; //set true if listener exists
const listeningServers = new Set();
var voiceChannels = {};
var textChannels = {};


module.exports = {
    version: 1.2,
    auth_level: 3,



    manual: "**--watch-voice-activity**  ->  `{\"voice\": \"channel_ID or channel_name\", \"text\": \"channel_ID or channel_name or channel_tag\"}`"
            +"\n.     *Logs voice channel activity (join/leave) to text channel.*"
            +"\n.     *posting `***stop***` in the text channel with sufficient auth level will stop the bot from watching and logging activity*"
            +"\n.     *Bot will only create one listener per server, attempting to make another will automatically end the existing listener for the server*",


    isListening,
    listeningServers,
    voiceChannels,
    textChannels,
    listenToVoiceChannelActivity,
    wva_listener,
    clear,


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
        var targetVoice = args.voice.trim();
        var targetText = args.text.trim();


        var server = await msg.guild.fetch();


        var voiceChannel;
        utils.botLogs(globals,  "--resolving voice channel ["+targetVoice+"]");
        //if (targetVoice.startsWith("<!") && targetVoice.endsWith(">")) targetVoice = targetVoice.substring(2, targetVoice.length-1); //future support?
        voiceChannel = server.channels.resolve(targetVoice);
        if ( !voiceChannel ){
            voiceChannel = server.channels.cache.find(_channel => _channel.name === targetVoice);
            if (!voiceChannel) throw ("Could not find voice channel ["+targetVoice+"] in server");
        }
        if ( voiceChannel.type !== "voice" ){
            throw new Error("Invalid given voice channel.  Given channel ["+targetVoice+"] is type: '"+voiceChannel.type+"'");
        }
        var voiceChannelName = voiceChannel.name+":"+voiceChannel.id;


        var textChannel;
        utils.botLogs(globals,  "--resolving text channel ["+targetText+"]");
        textChannel = server.channels.resolve(targetText);
        if ( !textChannel && (targetText.startsWith("<#") && targetText.endsWith(">")) ) { //cant resolve links/tags for whatever reason
            targetText = targetText.substring(2, targetText.length-1);
            textChannel = server.channels.resolve(targetText);
        }
        if ( !textChannel ){
            textChannel = server.channels.cache.find(_channel => _channel.name === targetText);
            if (!textChannel) throw ("Could not find text channel ["+targetText+"] in server");
        }
        if ( textChannel.type !== "text" ){
            throw new Error("Invalid given text channel.  Given channel ["+targetText+"] is type: '"+textChannel.type+"'");
        }


        //erase existing listener if already listening
        if (listeningServers.has(msg.guild.id)){
            await textChannels[msg.guild.id].send("Received new logging request, halting existing voice activity listener");
            listeningServers.delete(msg.guild.id);
            delete voiceChannels[msg.guild.id];
            delete textChannels[msg.guild.id];
            if (listeningServers.size == 0){
                client.off('voiceStateUpdate', listenToVoiceChannelActivity);
                client.off('message', wva_listener);
                isListening = false;
            }
        }

        //add new listener
        utils.botLogs(globals,  "--finalizing listener setup");
        listeningServers.add(msg.guild.id);
        voiceChannels[msg.guild.id] = voiceChannel;
        textChannels[msg.guild.id] = textChannel;

        textChannel.send("**Logging voice activity from ["+voiceChannelName+"]**\n***"+utils.getDateTimeString(globals)+"***");
        if (!isListening){
            utils.botLogs(globals,  "----starting client listener");
            client.on('message', wva_listener);
            client.on('voiceStateUpdate', listenToVoiceChannelActivity);
            isListening = true;
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

    var servers = new Set(); //user might hop in diff server channels where the bot might watching across servers
    if ( newChannel ? (voiceChannels.hasOwnProperty(newChannel.guild.id)) : false ) servers.add(newChannel.guild.id);
    if ( oldChannel ? (voiceChannels.hasOwnProperty(oldChannel.guild.id)) : false ) servers.add(oldChannel.guild.id);
    //console.log("DEBUG listeningServers:  "+listeningServers);
    //console.log("DEBUG voiceChannels:  "+JSON.stringify(voiceChannels,null,'  '));
    //console.log("DEBUG textChannels:  "+JSON.stringify(textChannels,null,'  '));
    var _servers = Array.from(servers);
    //console.log("DEBUG servers: "+_servers);
    for (var server of _servers){
        
        if ( oldChannelName !== newChannelName ){ //( oldChannel ? (newChannel ? (newChannel.id !== oldChannel.id) : true) : newChannel ){ 
            /* not the same channel */
            //console.log("DEBUG    Not same channel");
            var voiceChannel = voiceChannels[server];
            var textChannel = textChannels[server];
            var voiceChannelName = voiceChannel.name+":"+voiceChannel.id;
            if ( newChannel ? (newChannel.id  === voiceChannel.id) : false ){
                /* user joined specified voice channel */
                //console.log("DEBUG    joined target channel");
                oldChannel ?
                textChannel.send("[<] "+member.displayName+"#"+member.user.discriminator+" switched to ["+newChannelName+"] from ["+oldChannelName+"] at  *"+utils.getDateTimeString(globals)+"*") :
                textChannel.send("[+] "+member.displayName+"#"+member.user.discriminator+" joined ["+newChannelName+"] at  *"+utils.getDateTimeString(globals)+"*");
            }
            else if ( (oldChannel ? (oldChannel.id === voiceChannel.id) : false ) 
            && (newChannel ? (newChannel.id !== voiceChannel.id) : (newChannel === undefined)) ){
                /* user left specified voice channel */
                //console.log("DEBUG    left target channel");
                newChannel ? 
                textChannel.send("[>] "+member.displayName+"#"+member.user.discriminator+" swapped from ["+voiceChannelName+"] to ["+newChannelName+"] at  *"+utils.getDateTimeString(globals)+"*") :
                textChannel.send("[-] "+member.displayName+"#"+member.user.discriminator+" left ["+voiceChannelName+"] at  *"+utils.getDateTimeString(globals)+"*");
            }
        }
    }
}

async function wva_listener(msg){
    if (!listeningServers.has(msg.guild.id)) return;
    var textChannel = textChannels[msg.guild.id];
    if (msg.channel.id !== textChannel.id) return;
    if ((msg.content === "***stop***")){
        if (!utils.checkMemberAuthorized(globals, msg.member, this.auth_level, false)) return;
        console.log("    __[wva] stop from ["+msg.guild.name+":"+msg.guild.id+"]");
        await textChannel.send("**Ending voice activity listener**");
        listeningServers.delete(textChannel.guild.id);
        delete voiceChannels[textChannel.guild.id];
        delete textChannels[textChannel.guild.id];
        if (listeningServers.size == 0){
            console.log("    __[wva] no listeners remaining (destroying event listeners)");
            client.off('voiceStateUpdate', listenToVoiceChannelActivity);
            client.off('message', wva_listener);
            isListening = false;
        }
    }
}


function clear(){
    listeningServers.clear();
    voiceChannels = {};
    textChannels = {};
    isListening = false;
}




