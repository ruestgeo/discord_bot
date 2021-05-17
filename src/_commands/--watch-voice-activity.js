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



let globals;
let client;

let isListening = false; //set true if listener exists
const listeningServers = new Set();
let voiceChannels = {};
let textChannels = {};

let displayID = false;


module.exports = {
    version: 2.1,
    auth_level: 3,



    manual: "**--watch-voice-activity**  ->  `{\"comms\": [\"category/channel_ID/name\" , ...], \"text\": \"channel_ID/name or channel_tag\"}`"
            +"\n.     *Logs voice channel activity (join/leave) to text channel.*"
            +"\n.     *Posting `***stop***` in the text channel with sufficient auth level will stop the bot from watching and logging activity*"
            +"\n.     *Posting `***update***` in the text channel with sufficient auth level along with the 'comms' (excluding the 'text' channel) will set the activity watcher to those new channels.*"
            +"\n.     *Posting `***list***` in the text channel with sufficient auth level will post the names of participants in the watched voice channels*"
            +"\n.     *Posting `***status***` in the text channel with sufficient auth level post the currently watched voice channels*"
            +"\n.     *Bot will only create one listener per server, attempting to make another will automatically end the existing listener for the server*",


    requisites: {
        "startups" : ["watchVoiceActivity_setup.js"]
    },

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
        let args;
        try{
            args = JSON.parse(content);
        }
        catch (err){
            throw ("Incorrect request body ::  "+err);
        }
        if (!args.hasOwnProperty('comms') || !args.hasOwnProperty('text')){
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        else if ( typeof args.comms === 'string' ){
            args.comms = Array.of(args.comms);
        }
        else if ( !Array.isArray(args.comms) ){
            throw ("Incorrect request body.  Please ensure that the input arguments are correct:  'comms' must be an array of resolvables or a string resolvable");
        }
        let targetText = args.text.trim();

        let server = await msg.guild.fetch();
       
        //resolve target voice channel group
        let resolvedVoice;
        try{
            resolvedVoice = utils.resolveVoiceChannels(globals, args.comms, server, true);
        }
        catch (err){ throw (err); }
        let voiceChannelName = resolvedVoice.voiceChannelNames;
        let targetVoiceChannels = resolvedVoice.targetVoiceChannels;
        
        //resolve target text channel
        let textChannel;
        try {
            textChannel = utils.resolveChannel(globals, targetText, server.channels, true);
        } catch (err) { throw (err); }
        if ( textChannel.type !== "text" ){
            throw new Error("Invalid given text channel.  Given channel ["+targetText+"] is type: '"+textChannel.type+"'");
        }


        //erase existing listener if already listening
        if (listeningServers.has(msg.guild.id)){
            utils.botLogs(globals,  "--overwriting existing listener in this server");
            await (await client.channels.fetch(textChannels[msg.guild.id])).send("Received new logging request, halting existing voice activity listener");
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
        voiceChannels[msg.guild.id] = targetVoiceChannels;
        textChannels[msg.guild.id] = textChannel.id;

        let voiceParticipants = "";
        let printParticipants = false;
        for ( let channelID of targetVoiceChannels ){
            let channel = await (server.channels.resolve(targetChannel)).fetch();
            if (channel.members.size > 0) printParticipants = true;
            else continue;
            voiceParticipants += "__"+channel.name+"__\n";
            for ( let member of [...channel.members.values()] ){ 
                voiceParticipants += member.displayName+"#"+member.user.discriminator+"\n";
            }
            voiceParticipants += "\n";
        }

        let init_msg = await textChannel.send("**Logging voice activity from ["+voiceChannelName+"]**\n***"+utils.getDateTimeString(globals)+"***");
        if (printParticipants) await utils.message(init_msg, voiceParticipants, false);
        if (!isListening){
            utils.botLogs(globals,  "----starting client listener");
            client.on('message', wva_listener);
            client.on('voiceStateUpdate', listenToVoiceChannelActivity);
            isListening = true;
        }

        return "Request complete\n Listening to voice activity from ["+voiceChannelName+"] and logging in [<#"+textChannel.id+">:"+textChannel.id+"]"
    }
}






async function listenToVoiceChannelActivity(oldState, newState){
    let oldChannel = oldState.channel ? await oldState.channel.fetch() : undefined;
    let newChannel = newState.channel ? await newState.channel.fetch() : undefined;
    let member = newState.member;
    let oldChannelName = (oldChannel ?   (displayID ? oldChannel.name+":"+oldChannel.id : oldChannel.name)   : "null");
    let newChannelName = (newChannel ?   (displayID ? newChannel.name+":"+newChannel.id : newChannel.name)   : "null");
    //console.log("DEBUG    "+ "["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] left old channel ["+oldChannelName+"] joined new channel ["+newChannelName+"]");

    let servers = new Set(); //user might hop in diff server channels where the bot might watching across servers
    if ( newChannel ? (voiceChannels.hasOwnProperty(newChannel.guild.id)) : false ) servers.add(newChannel.guild.id);
    if ( oldChannel ? (voiceChannels.hasOwnProperty(oldChannel.guild.id)) : false ) servers.add(oldChannel.guild.id);
    //console.log("DEBUG listeningServers:  "+listeningServers);
    //console.log("DEBUG voiceChannels:  "+JSON.stringify(voiceChannels,null,'  '));
    //console.log("DEBUG textChannels:  "+JSON.stringify(textChannels,null,'  '));
    let _servers = Array.from(servers);
    //console.log("DEBUG servers: "+_servers);
    for (let server of _servers){ //if bot is watching for both old and new channel, update logs for both sides
        
        if ( oldChannelName !== newChannelName ){ //( oldChannel ? (newChannel ? (newChannel.id !== oldChannel.id) : true) : newChannel ){ 
            /* not the same channel */
            //console.log("DEBUG    Not same channel");
            let targetVoiceChannels = voiceChannels[server]; //array of channel IDs
            let textChannel = await client.channels.fetch(textChannels[server]); //channel ID
            
            if ( newChannel && oldChannel && (targetVoiceChannels.includes(newChannel.id) && targetVoiceChannels.includes(oldChannel.id)) && (newChannel.id !== oldChannel.id) ){
                /* user switched between channels in the target group */
                //console.log("DEBUG    switched in target group");
                textChannel.send("[x] **"+member.displayName+"#"+member.user.discriminator+"**   changed to   __["+newChannelName+"]__   from   __[*"+oldChannelName+"*]__   at  *"+utils.getTimeString2(globals)+"*");
            }
            else if ( newChannel ? (targetVoiceChannels.includes(newChannel.id)) : false ){
                /* user joined specified voice channel group */
                //console.log("DEBUG    joined target channel");
                oldChannel ?
                textChannel.send("[<] **"+member.displayName+"#"+member.user.discriminator+"**   switched to   __["+newChannelName+"]__   from   ["+oldChannelName+"]   at  *"+utils.getTimeString2(globals)+"*") :
                textChannel.send("[+] **"+member.displayName+"#"+member.user.discriminator+"**   joined   __["+newChannelName+"]__   at  *"+utils.getTimeString2(globals)+"*");
            }
            else if ( (oldChannel ? (targetVoiceChannels.includes(oldChannel.id)) : false ) 
            && (newChannel ? (!targetVoiceChannels.includes(newChannel.id)) : (newChannel === undefined)) ){
                /* user left specified voice channel group */
                //console.log("DEBUG    left target channel");
                newChannel ? 
                textChannel.send("[>] **"+member.displayName+"#"+member.user.discriminator+"**   swapped from   __["+oldChannelName+"]__   to   ["+newChannelName+"]   at  *"+utils.getTimeString2(globals)+"*") :
                textChannel.send("[-] **"+member.displayName+"#"+member.user.discriminator+"**   left   __["+oldChannelName+"]__   at  *"+utils.getTimeString2(globals)+"*");
            }
        }
    }
}


async function wva_listener(msg){
    if ( !msg.guild ) return;//msg is DM
    if ( msg.author.id === client.user.id )  return; //msg is from bot

    if (!listeningServers.has(msg.guild.id)) return;
    let textChannel = await client.channels.fetch( textChannels[msg.guild.id] );
    if (msg.channel.id !== textChannel.id) return;


    if ( msg.content === "***stop***" ){ //stop watching voice activity from channels
        if (!utils.checkMemberAuthorized(globals, msg.member, this.auth_level, false)) return;
        utils.awaitLogs(globals, "__[wva] ***stop*** from ["+msg.member.displayName+"#"+msg.member.user.discriminator+"] in  `"+msg.guild.name+":"+msg.guild.id+"` server", 5);
        await textChannel.send("**Ending voice activity listener**\n*"+utils.getDateTimeString(globals)+"*");
        listeningServers.delete(textChannel.guild.id);
        delete voiceChannels[textChannel.guild.id];
        delete textChannels[textChannel.guild.id];
        if (listeningServers.size == 0){
            utils.awaitLogs(globals, "__[wva] no listeners remaining (destroying event listeners)", 1);
            client.off('voiceStateUpdate', listenToVoiceChannelActivity);
            client.off('message', wva_listener);
            isListening = false;
        }
    }


    else if ( msg.content === "***status***" ){ //post current watched channels
        if (!utils.checkMemberAuthorized(globals, msg.member, this.auth_level, false)) return;
        utils.awaitLogs(globals, "__[wva] ***status*** from ["+msg.member.displayName+"#"+msg.member.user.discriminator+"] in  `"+msg.guild.name+":"+msg.guild.id+"` server", 5);
        let targetVoiceChannels = voiceChannels[msg.guild.id];
        let channels = [];
        for (let channelId of targetVoiceChannels){
            let channel = await client.channels.fetch( channelId );
            if (!channel) channels.push("["+channelId+"] *cannot be resolved*");
            else channels.push(channel.name+":*"+channelId+"*");
        }
        await textChannel.send("Currently watching voice activity from:\n    "+channels.join("\n    "));
    }


    else if ( msg.content === "***list***" ){ //post participants in watched channels
        if (!utils.checkMemberAuthorized(globals, msg.member, this.auth_level, false)) return;
        utils.awaitLogs(globals, "__[wva] ***list*** from ["+msg.member.displayName+"#"+msg.member.user.discriminator+"] in  `"+msg.guild.name+":"+msg.guild.id+"` server", 5);
        let targetVoiceChannels = voiceChannels[msg.guild.id];
        let channels = [];
        for (let channelId of targetVoiceChannels){
            let channel = await client.channels.fetch( channelId );
            if (!channel) channels.push("["+channelId+"] *cannot be resolved*");
            else channels.push(channel);
        }

        let voiceParticipants = "";
        let printParticipants = false;
        for ( let channel of channels ){
            channel = await channel.fetch();
            if (channel.members.size > 0) printParticipants = true;
            else continue;
            voiceParticipants += "__"+channel.name+"__ ("+channel.members.size+")\n";
            for ( let member of [...channel.members.values()] ){ 
                voiceParticipants += member.displayName+"#"+member.user.discriminator+"\n";
            }
            voiceParticipants += "\n";
        }
        if (printParticipants) await utils.message(msg, voiceParticipants, false);
        else await msg.channel.send("No participants in currently watched channels");
    }


    else if ( msg.content.startsWith("***update***") ){ //update the watched channels with args
        if (!utils.checkMemberAuthorized(globals, msg.member, this.auth_level, false)) return;
        let content = msg.content.substring("***update***".length).trim();
        utils.awaitLogs(globals, "__[wva] ***update*** from ["+msg.member.displayName+"#"+msg.member.user.discriminator+"] in  `"+msg.guild.name+":"+msg.guild.id+"` server\nargs ::  "+content, 5);
        let args;
        if (utils.countOccurrences(content, "\"") % 2 != 0)   throw new Error("Invalid request body. Each channel resolvable must be encapsulated by double quotations");
        try{
            args = JSON.parse(content);
        }
        catch (err){
            await msg.reply("Incorrect request body ::  "+err);
            await msg.react('❌');
            return;
        }
        if ( typeof args === 'object' && !Array.isArray(args) && !args.hasOwnProperty('comms') ){
            await msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            await msg.react('❌');
            return;
        }
        else if ( args.hasOwnProperty('comms') ){
            args = [args.comms].flat();
        }
        else if ( typeof args === 'string' ){
            args = [args];
        }
        else if ( !Array.isArray(args) ){
            await msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            await msg.react('❌');
            return;
        }
        let server = await msg.guild.fetch();
        let resolvedVoice;
        try{
            resolvedVoice = utils.resolveVoiceChannels(globals, args, server);
        }
        catch (err){
            msg.reply("An error occured ::   \n"+ err);
            msg.react('❌'); 
            return;
        }
        let voiceChannelName = resolvedVoice.voiceChannelNames;
        let targetVoiceChannels = resolvedVoice.targetVoiceChannels;
        //update listener voice channels
        let oldVoiceChannelName = voiceChannels[msg.guild.id].map(id => {
            let channel = server.channels.resolve(id);
            return (channel ? channel.name+":"+channel.id : "*<deleted_channel>*")
        }).join(",  ");
        voiceChannels[msg.guild.id] = targetVoiceChannels;

        let voiceParticipants = "";
        let printParticipants = false;
        for ( let channelID of targetVoiceChannels ){
            let channel = await (server.channels.resolve(channelID)).fetch();
            if (channel.members.size > 0) printParticipants = true;
            else continue;
            voiceParticipants += "__"+channel.name+"__\n";
            for ( let member of [...channel.members.values()] ){ 
                voiceParticipants += member.displayName+"#"+member.user.discriminator+"\n";
            }
            voiceParticipants += "\n";
        }
        
        await msg.reply("Updated voice activity watcher from old voice channel group to new voice channel group\n"+
        "__**new voice channel group**__\n    [ "+voiceChannelName+" ]\n"+
        "__**old voice channel group**__\n    [ "+oldVoiceChannelName+" ]");
        if (printParticipants) await utils.message(msg, voiceParticipants, false);
    }
}


function clear(){
    listeningServers.clear();
    voiceChannels = {};
    textChannels = {};
    isListening = false;
}




