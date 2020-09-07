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



/* There are two methods to install ffmpeg for nodejs use:
* 1.  npm install ffmpeg-static  
*         install this package and nothing more needs to be done, but package size is huge
* 2.  npm install ffmpeg
*         need to install ffmpeg on the host device to use, but package size is small
*         (not sure, but might also need to install the `fluent-ffmpeg` package)
*/

var musicQueueCapcity = 100; //default 100 songs in the queue at most
//should delete existing queues if capacity is decreased
var leaveOnStop = false;
const ytdl_options = {filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 };
const discordStream_options = {highWaterMark: 1};


const ytdl = require('ytdl-core');

const utils = require('../utils.js');
const { Queue } = require('../utils.js');
const voiceUtils = require('../_utils/voice_utils.js');
const ls = require('../_utils/localStorage_utils.js');
const bot = require('../bot.js');



var queues = undefined;
var playing = {}; //music playing boolean per server
var connections = {}; //music player connections
var eventsRemovers = {}; //functions returned from event_once or event_on that destroy the created event listener
var volumes = undefined;
var dbName = "music";
var dbNameVolumes = "music_volumes";
const commands = ["play","pause","stop","next","add","remove","removeAll","clear","list","info","volume"];



module.exports = {
    version: 1.1,
    auth_level: 1,



    manual: "Both the bot and the requester must have sufficient permissions.\n***(only works for youtube links)***\n\n" +
            
            /*"**--music**  ->  `play` <start_at>\n" +
            ".     *play first* ***music_link*** *in the queue.*\n"+
            ".     *can provide a time to start_at (or skip to)*\n"+
            ".     *Supports formats 00:00:00.000, 0ms, 0s, 0m, 0h, or number of milliseconds.*\n"+
            ".     *Example: 1:30, 05:10.123, 10m30s*\n\n"+*/  //ytdl `begin` option is unreliable so not used
            "**--music**  ->  `play`\n" +
            ".     *play first* ***music_link*** *in the queue.*\n"+
             

            "**--music**  ->  `pause` \n" +
            ".     *pause the playing music and retain track position*\n\n"+

            "**--music**  ->  `stop` \n" +
            ".     *stop playing music and reset track position to the beginning*\n\n"+

            "**--music**  ->  `next` \n" +
            ".     *move to the next song on the queue (maintains playing/paused)*\n\n"+

            "**--music**  ->  `add` *music_link* \n" +
            ".     *add * ***music_link*** *to the queue*\n"+
            ".     *multiple music links on newlines (shift+ENTER) can be given*\n\n"+

            "**--music**  ->  `remove` *music_link* \n" +
            ".     *remove first found instance of* ***music_link*** *from the queue*\n\n"+

            "**--music**  ->  `removeAll` *music_link* \n" +
            ".     *remove all instances of* ***music_link*** *in the queue (if added multiple times)*\n\n"+

            "**--music**  ->  `clear` \n" +
            ".     *clear the music queue of all* ***music_link*** *to play (empty the queue)*\n\n"+

            "**--music**  ->  `list` *amount_to_display* \n" +
            ".     *post an amount of songs from the beginning of the queue*\n\n"+

            "**--music**  ->  `info` <*music_link*> \n" +
            ".     *if no args then post the current song info (first song in the queue)*\n"+
            ".     *or if a* ***music_link*** *is given then give info for that link*\n\n"+

            "**--music**  ->  `volume` <number_to_set_volume_to> \n" +
            ".     *if no args then the current volume will be returned*\n"+
            ".     *or if a valid number, between 1 and 200, is specified then the volume is set to that number (%)*\n"+
            ".     ***audio quality may drop with higher than 100% volume***\n\n",






    func: async function (globals, msg, content){ 
        try{
            var server = msg.guild;
            var command;
            var args;
            if (content.includes(' ')){
                command = content.substr(0,content.indexOf(' ')).trim();
                args = content.substr(content.indexOf(' ')+1).trim();
            }
            else {
                command = content.trim();
                args = null;
            }

            if ( !commands.includes(command) )
                throw ("Invalid music command ["+command+"]");

            if ( (command === "pause" || command === "stop" || command === "next" || command === "clear") && (args !== null)) 
                throw ("Invalid request (given args when no args used)\n```\n"+content+"```");

            if ( (command === "add" || command === "remove" || command === "removeAll" || command === "list") && (args === null) )
                throw ("Invalid request (given no args when args required)\n```\n"+content+"```");


            /* check member permissions */
            if ( !(await voiceUtils.hasRolePermission(msg.member)) ){
                throw ("Insufficient permissions to use voice commands");
            }
            utils.botLogs(globals, "--fetching voice connection");
            var connection = connections[server.id];
            if ( command === "play" || command === "pause" || command === "stop" || command === "next" ){ //if commands require bot in voice channel
                if (!connection){
                    connection = voiceUtils.fetchLatestConnection(globals.client, server.id);
                    //connections[server_id] = connection;
                }
                if (connection === null) {
                    throw ("Bot is not connected to a voice channel in this server");
                }
                var hasPerm = hasVoicePermission(globals.client, msg.member, connection);
                if ( hasPerm !== true ){ throw (hasPerm);}
            }



            /* acquire runtime queues for first time since module load */
            if (queues === undefined){
                utils.botLogs(globals, "--acquiring queues");
                queues = {};
                await ls.db_acquire(dbName);
                var stringQueues = await ls.getAll(dbName);
                for (var server_id in stringQueues){
                    queues[server_id] = MusicQueue.from(stringQueues[server_id], musicQueueCapcity); 
                    utils.botLogs(globals, `--acquired queue for ${server_id}`);
                }
            }
            /* fetch or create queue for the server */
            if ( !queues.hasOwnProperty(server.id) ){ //server not in queues
                utils.botLogs(globals, "--setting up server queue");
                playing[server.id] = false;
                var queue = await ls.get(dbName, server.id);
                if (queue === null) {
                    utils.botLogs(globals, "----server didn't have queue in localstorage");
                    queue = new MusicQueue(musicQueueCapcity);
                    queues[server.id] = queue;
                    await ls.put(dbName, server.id, queue.stringify());
                }
                else {
                    utils.botLogs(globals, "----obtained queue from localstorage");
                    queues[server.id] = MusicQueue.from(queue, musicQueueCapcity); 
                }
            }



            /* acquire runtime volumes for first time since module load */
            if (volumes === undefined){
                utils.botLogs(globals, "--acquiring volumes");
                volumes = {};
                await ls.db_acquire(dbNameVolumes);
                var stringVolumes = await ls.getAll(dbNameVolumes);
                for (var server_id in stringVolumes){ 
                    volumes[server_id] = parseFloat(stringVolumes[server_id]);
                    utils.botLogs(globals, `--acquired volume for ${server_id}:  [${volumes[server_id]*100}%]`);
                }
            }
            /* fetch or create volume for the server */
            if ( !volumes.hasOwnProperty(server.id) ){ //server not in volumes
                utils.botLogs(globals, "--setting up server volume");
                playing[server.id] = false;
                var volume = await ls.get(dbNameVolumes, server.id);
                if (volume === null) {
                    utils.botLogs(globals, "----server didn't have volume in localstorage");
                    volumes[server.id] = 1; //default volume of 1 (100%)
                    await ls.put(dbNameVolumes, server.id, volumes[server.id].toString());
                }
                else {
                    utils.botLogs(globals, "----obtained volume value from localstorage");
                    volumes[server.id] = parseFloat(volume);
                }
            }


            /* parse args */
            var info;
            if (args && command !== "list" && command !== "play" && command !== "volume" && command !== "remove"){
                try{
                    if (command === "add" && args.includes("\n")){
                        info = []; //array of vids to insert
                        var links = args.split("\n");
                        links = links.map(item => item.trim());
                        for (var link of links){
                            if (link.startsWith("<") && link.endsWith(">"))  link = link.substring(1, link.length-1);
                            utils.botLogs(globals,"--fetching youtube video info");
                            const yt_info = await ytdl.getInfo(link);
                            var one_info = {
                                title: yt_info.videoDetails.title,
                                url: yt_info.videoDetails.video_url,
                                origin: link,
                                requester: `${msg.member.displayName}#${msg.member.user.discriminator}`
                            }
                            info.push(one_info);
                            utils.botLogs(globals, `----acquired  [${one_info.title}] from  ${one_info.url}`);    
                        }
                    }
                    else{
                        if (args.startsWith("<") && args.endsWith(">"))  args = args.substring(1, args.length-1);
                        utils.botLogs(globals,"--fetching youtube video info");
                        const yt_info = await ytdl.getInfo(args);
                        info = {
                            title: yt_info.videoDetails.title,
                            url: yt_info.videoDetails.video_url,
                            origin: args,
                            requester: `${msg.member.displayName}#${msg.member.user.discriminator}`
                        };
                        utils.botLogs(globals, `----acquired  [${info.title}] from  ${info.url}`);
                    }
                }
                catch (err){ throw ("Error in fetching youtube info ::   "+err); }
            }
            else if (args && command === "list"){
                args = parseInt(args);
                if (isNaN(args)) throw ("Invalid amount_to_display:  not a number");
                else if (args < 1) throw ("Invalid amount_to_display:  less than 1");
                else if (args > musicQueueCapcity) throw ("Invalid amount_to_display:  more than "+musicQueueCapcity);
            }
            else if (args && command === "volume"){
                args = parseFloat(args);
                if (isNaN(args)) throw ("Invalid volume:  not a number");
                else if (args < 1) throw ("Invalid volume:  less than 1");
                else if (args > 200) throw ("Invalid volume:  more than 200");
            }
            else if (command === "remove"){
                if ( !isNaN(parseInt(args)) ){ //index
                    info = parseInt(args);
                    if (!queues[server.id]) throw ("Can't remove a song by index from an empty queue");
                    if (info >= queues[server.id].length() || info < 0) throw ("Invalid index to remove (cannot be greater than the queue length (currently "+queues[server.id].length()+" /"+musicQueueCapcity+") or less than 0):  "+info);
                }
                else { //link
                    if (args.startsWith("<") && args.endsWith(">"))  args = args.substring(1, args.length-1);
                    utils.botLogs(globals,"--fetching youtube video info");
                    const yt_info = await ytdl.getInfo(args);
                    info = {
                        title: yt_info.videoDetails.title,
                        url: yt_info.videoDetails.video_url,
                        origin: args,
                        requester: `${msg.member.displayName}#${msg.member.user.discriminator}`
                    };
                    utils.botLogs(globals, `----acquired  [${info.title}] from  ${info.url}`);
                }
            }
            

            



            utils.botLogs(globals, `--music command [${command}]`);
            switch (command){
                case "play":{
                    await play(msg, connection /*, args*/).catch(err => { throw (err) });
                    break;
                }
                case "pause":{
                    await pause(msg).catch(err => { throw (err) });
                    break;
                }
                case "stop":{
                    await stop(msg).catch(err => { throw (err) });
                    break;
                }
                case "next":{
                    await next(msg, msg.guild.id).catch(err => { throw (err) });
                    break;
                }
                case "add":{
                    await add(msg, info).catch(err => { throw (err) });
                    break;
                }
                case "remove":{
                    await remove(msg, info).catch(err => { throw (err) });
                    break;
                }
                case "removeAll":{
                    await removeAll(msg, info).catch(err => { throw (err) });
                    break;
                }
                case "clear":{
                    await clear(msg).catch(err => { throw (err) });
                    break;
                }
                case "list":{
                    await list(msg, args).catch(err => { throw (err) });
                    break;
                }
                case "info":{
                    await getInfo(msg, info).catch(err => { throw (err) });
                    break;
                }
                case "volume":{
                    await setVolume(msg, args).catch(err => { throw (err) });
                    break;
                }
                default:{
                    throw (`Invalid request, music command [${command}] not supported`);
                }
            }
        }
        catch (err) { throw (err); }
    }
}





//function onFinish(){ next(); }
function onError(err) { console.log("__[music] error occurerd during audio stream:\n"+err); }



function hasVoicePermission(client, member, connection){
    var channel = connection.channel;
    var bot_perms = channel.permissionsFor(client.user);
    if ( !bot_perms.has("SPEAK") ) return ("Bot doesn't have permission to connect to ["+channel.name+":"+channel.id+"]");
    var member_perms = channel.permissionsFor(member);
    if ( !member_perms.has("CONNECT") ) return (member.displayName+"#"+member.user.discriminator+" doesn't have permission to connect to ["+channel.name+":"+channel.id+"]");
    return true;
}


async function play(msg, connection /*, args*/){
    var server_id = msg.guild.id;
    connections[server_id] = connection; //var connection = connections[server_id];
    //console.log("DEBUG connection: "+connection.channel.name+":"+connection.channel.id+"  ||  status:  "+connection.status+"  ||  dispatcher:  "+connection.dispatcher);
    //console.log(`DEBUG playing ::   ${JSON.stringify(playing,null,'  ')}`);
    //console.log(`DEBUG connections ::   ${JSON.stringify(Object.keys(connections).map(item => item+"  ||  status: "+connections[item].status+"  ||  dispatcher: "+connections[item].dispatcher),null,'  ')}`);
    var currentSong = queues[server_id].peek();
    if (currentSong === null){
        console.log("----nothing to play, queue empty");
        await msg.reply("Queue is empty");
        return;
    }
    if (playing[server_id] === true) {
        console.log("----already playing in server");
        msg.reply("Already playing");
        return;
        /*if (args === null) {
            msg.reply("Already playing");
            return;
        }
        connections[server_id].dispatcher.pause();
        var yt_stream = ytdl(currentSong.url, Object.assign({begin: args}, ytdl_options));
        var streamDispatcher = connection.play(yt_stream, discordStream_options);
        streamDispatcher.setVolumeLogarithmic(volumes[server_id]);
        return;*/
    }
    await connection.voice.setMute(false);
    playing[server_id] = true;
    if ( !connection.dispatcher ){ 
        console.log("----playing from queue");
        var streamDispatcher;
        try {
            //var yt_stream = ytdl(currentSong.url, (args === null ? ytdl_options : Object.assign({begin: args}, ytdl_options)));
            var yt_stream = ytdl(currentSong.url, ytdl_options);
            streamDispatcher = connection.play(yt_stream, discordStream_options);
            streamDispatcher.setVolumeLogarithmic(volumes[server_id]);
        }
        catch (err){
            await connection.voice.setMute(true);
            playing[server_id] = false;
            throw ("Error in playing youtube stream ::   "+err);
        }
        
        streamDispatcher.once("finish", () => { console.log("!__[music]  finish -> next ["+server_id+"]");  next(null, server_id); })
        .once("error", onError);
        var server_name = connection.channel.guild.name;
        eventsRemovers[server_id] = event_once(connection, 'disconnect', async () => {
            console.log("        !__[music]  disconnect event on connection for ["+server_name+":"+server_id+"]");
            //console.log(`DEBUG playing ::   ${JSON.stringify(playing,null,'  ')}`);
            //console.log(`DEBUG connections ::   ${JSON.stringify(Object.keys(connections).map(item => item+"  ||  status: "+connections[item].status+"  ||  dispatcher: "+connections[item].dispatcher),null,'  ')}`);
            try {
                delete connections[server_id];
                delete playing[server_id];
            } catch (err) {}
            //console.log(`DEBUG playing ::   ${JSON.stringify(playing,null,'  ')}`);
            //console.log(`DEBUG connections ::   ${JSON.stringify(Object.keys(connections).map(item => item+"  ||  status: "+connections[item].status+"  ||  dispatcher: "+connections[item].dispatcher),null,'  ')}`);
        }); 

        await msg.reply("Playing:  "+currentSong.title);
    }
    else { //resume
        console.log("----resuming audio stream");
        try {
            connections[server_id].dispatcher.resume();    
        }
        catch (err){
            await connection.voice.setMute(true);
            playing[server_id] = false;
            throw ("Error in playing youtube stream ::   "+err);
        }
        await msg.reply("Resuming:  "+currentSong.title);
    }
}



async function pause(msg){
    var server_id = msg.guild.id;
    if ( !connections[server_id] ){ 
        console.log("----wasn't playing; no connection");
        await msg.reply("Wasn't playing anything");
        return;
    }
    if ( !connections[server_id].dispatcher ){
        console.log("----wasn't playing; no dispatcher");
        await msg.reply("Wasn't playing anything");
        return;
    }
    playing[server_id] = false;
    connections[server_id].dispatcher.pause();
    await connections[server_id].voice.setMute(true);
    await msg.reply("Paused audio stream");
}



async function stop(msg){
    var server_id = msg.guild.id;
    if (connections[server_id] === undefined){ 
        await msg.reply("Wasn't playing anything nor had anything paused");
        return;
    }
    var connection = connections[server_id];
    try{
        playing[server_id] = false;
        delete connections[server_id];
        delete playing[server_id];
        eventsRemovers[server_id](); //connection.removeAllListeners('disconnect');
    } catch (err) { throw (err); }
    if (leaveOnStop){
        console.log("----disconnect on stop");
        connection.disconnect();
        await msg.reply("Stopped audio stream\nBot leaving voice channel ["+connection.channel.name+":"+connection.channel.id+"]");
    }
    else {
        console.log("----destroy stream on stop");
        try { connection.dispatcher.pause(); }
        catch (err) { console.log(`!__[music]  error in pausing stream ::   ${err}`); }
        try { connection.dispatcher.destroy(); }
        catch (err) { console.log(`!__[music]  error in destroying stream ::   ${err}`); }
        await connection.voice.setMute(true);
        await msg.reply("Stopped audio stream");
    }
    
}



async function next(msg, server_id){
    var connection = connections[server_id];
    if (!msg && !connection){ 
        console.log("!__[music]  auto-next -> no connection");
        return; 
    }

    
    var was_playing = playing[server_id];
    if (was_playing){
        playing[server_id] = false;
        if (msg){ //destroy previously playing stream
            console.log("----command while playing -> delete playing stream");    
            try { connection.dispatcher.pause(); }
            catch (err) { console.log(`!__[music]  error in pausing stream ::   ${err}`); }
            try { connection.dispatcher.destroy(); }
            catch (err) { console.log(`!__[music]  error in destroying stream ::   ${err}`); }
        }
    }
    if (msg && (was_playing === false)){ //command while paused -> delete paused
        console.log("----command while paused -> delete paused stream");
        try { connection.dispatcher.destroy(); }
        catch (err) { console.log(`!__[music]  error in destroying stream ::   ${err}`); }
        delete connections[server_id];
        delete playing[server_id];
    }
    var currentSong;
    try{ currentSong =  queues[server_id].dequeue(); } 
    catch (err){
        if (msg){ 
            await msg.reply(err.message); //queue empty
            return;
        }
        if (was_playing) throw new Error("Bot seemed to be playing but nothing in the queue"); //shouldn't be playing
    }
    var nextSong = queues[server_id].peek();
    if (nextSong === null){
        playing[server_id] = false;
        if (connection){
            delete connections[server_id];
            delete playing[server_id];
            eventsRemovers[server_id](); //connection.removeAllListeners('disconnect');
        }
        try { if (connection) await connection.voice.setMute(true); }
        catch (err){ console.log(`!__[music]  error in muting ::   ${err}`); } 
        if (msg) {
            console.log("----no next song queue empty");
            await msg.reply("No more songs in the queue");
        }
        else console.log("!__[music]  auto-next -> empty queue");
        await ls.put(dbName, server_id, queues[server_id].stringify());
        return;
    }
    if (was_playing){
        console.log("----continuing to play on next");
        var streamDispatcher = connection.play(ytdl(nextSong.url, ytdl_options), discordStream_options)
        .once("finish", () => { console.log("!__[music]  finish -> next ["+server_id+"]");  next(null, server_id); })
        .once("error", onError);
        playing[server_id] = true;
        streamDispatcher.setVolumeLogarithmic(volumes[server_id]);
    }
    if (msg)  await msg.reply(was_playing ? 
        "Playing next in the queue:  "+nextSong.title+"\nPreviously playing:   "+currentSong.title : 
        "Shifted to next in the queue:  "+nextSong.title+"\nPreviously playing:   "+currentSong.title
    );
    await ls.put(dbName, server_id, queues[server_id].stringify());
}



async function add(msg, info){
    var server_id = msg.guild.id;
    if (Array.isArray(info)){
        console.log("----add multiple");
        var index = 0;
        try { for (; index < info.length; index++) queues[server_id].enqueue(info[index]);  }
        catch (err){ //queue full
            console.log(err.message);
            await msg.reply(err.message+"\nCouldn't insert the following links:\n"+info.slice(index).map(item => item.origin));
            return; 
        }
        finally { 
            await ls.put(dbName, server_id, queues[server_id].stringify()); 
            var header = "Added the following youtube videos to queue:\n";
            var all = header+info.slice(0,index).map(item => "<"+item.origin+">").join("\n");
            if (all.length+header.length > 2000){
                await msg.reply(header);
                var parts = [];
                while (all.length > 2000){
                    var split_index = all.substr(1800, all.length).indexOf("\n")+1800;
                    parts.push(all.substr(0,split_index));
                    all = all.substr(split_index, all.length);
                }
                for (var part of parts){ await msg.channel.send(part); }
                if (all.trim() !== "") await msg.channel.send(all); //last part
            }
            else  await msg.reply(header+all);
        }
    }
    else {
        try { queues[server_id].enqueue(info); }
        catch (err){ //queue full
            console.log(err.message);
            await msg.reply(err.message);
            return;
        }
        await ls.put(dbName, server_id, queues[server_id].stringify());
        await msg.reply("Added youtube video to queue:  "+info.title);
    }
}



async function remove(msg, arg){
    var server_id = msg.guild.id;
    var removed;
    if (typeof(arg) === "number"){
        console.log("----remove by index");
        removed = queues[server_id].removeIndex(arg)[0];
    }
    else {
        console.log("----remove by url");
        removed = queues[server_id].removeByKey("url", arg.url)[0];
    }
    console.log(JSON.stringify(removed,null,'  '));
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Removed from queue:  "+removed.title);
}


async function removeAll(msg, info){
    var server_id = msg.guild.id;
    queues[server_id].removeAllByKey("url", info.url);
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Removed all matching entries from queue:  "+info.title);
}



async function clear(msg){
    var server_id = msg.guild.id;
    queues[server_id].clear();
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Emptied the queue");
}



async function list(msg, amount){
    if (amount > musicQueueCapcity) amount = musicQueueCapcity;
    var server_id = msg.guild.id;
    var copy = queues[server_id].copy();
    var titles = copy.map(item => item["title"]).splice(0,amount);
    for (var index = 0;  index < amount;  index++){
        if (index >= titles.length) titles[index] = `**[${index}]**  *empty*` ;
        else titles[index] = `**[${index}]**  ${titles[index]}`;
    }
    var all = titles.join("\n");
    if (all.length > 2000){
        var parts = [];
        while (all.length > 2000){
            var split_index = all.substr(1800, all.length).indexOf("\n")+1800;
            parts.push(all.substr(0,split_index));
            all = all.substr(split_index, all.length);
        }
        for (var part of parts){ await msg.channel.send(part); }
        if (all.trim() !== "") await msg.channel.send(all); //last part
    }
    else  await msg.channel.send(all);
}



async function getInfo(msg, info){
    if (info) {
        console.log("----get first in queue info");
        await msg.reply(`title :   ${info.title}`);
        return;
    }
    console.log("----get info from url");
    var server_id = msg.guild.id;
    var currentSong = queues[server_id].peek();
    await msg.reply(currentSong === null ? `Queue is empty, no info to send` : `title :   ${currentSong.title}`);
}



async function setVolume(msg, arg){
    var server_id = msg.guild.id;
    if (!arg){ //obtain and reply with the current volume
        console.log("----get volume for bot in server");
        var vol = parseFloat(await ls.get(dbNameVolumes, server_id));
        await msg.reply("Current volume is set to:  "+(vol*100)+"%");
        return;
    } //else set the server volume and current dispatcher (if any) to the given arg
    console.log("----set volume for bot in server");
    volumes[server_id] = arg/100;
    await ls.put(dbNameVolumes, server_id, volumes[server_id].toString());
    if (connections[server_id]){
        if (connections[server_id].dispatcher){
            connections[server_id].dispatcher.setVolumeLogarithmic(volumes[server_id]);
        }
    }
    await msg.reply("Set volume to:  "+arg+"%");
}





//extend Queue to MusicQueue 
function MusicQueue(capacity, array){
    Queue.call(this, capacity, array);
}
/*var prototype = new Function();
prototype.prototype = Queue.prototype;
MusicQueue.prototype = new prototype();
MusicQueue.prototype.constructor = MusicQueue;*/
MusicQueue.prototype = Object.create(require('../utils.js').Queue.prototype);

/**
 * remove first instance of element that contains key with value from queue and returns it
 **/
MusicQueue.prototype.removeByKey = function(key, value){ 
    var index = this._elements.findIndex(Q_item => Q_item[key] === value);
    if (index < 0 ) throw new Error("element not found in Queue");
    return this._elements.splice(index, 1);
}

/**
 * remove all instances of element that contains key with value from queue
 **/
MusicQueue.prototype.removeAllByKey = function(key, value){ 
    this._elements = this._elements.filter(Q_item => Q_item[key] !== value);
}

/**
 * create a MusicQueue where if an array is given then it creates the queue from the array;  capacity is optional
 */
MusicQueue.from = function(array, capacity){ //create a new MusicQueue from the array with a given capacity
    try{ return new MusicQueue(capacity, array); }
    catch (err) { throw (err); }
}


//TODO put these in utils for v1.4.4 or v1.5.0
function event_once(target, type, func) {
    target.once(type, func);
    return function() {
        if (target.off)
            target.off(type, func);
    };
}
function event_on(target, type, func) {
    target.on(type, func);
    return function() {
        target.off(type, func);
    };
}




//considered adding channel watcher (if empty, stop playing), but decided not to


