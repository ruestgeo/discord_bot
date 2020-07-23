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
var streams = {}; //music player streams
var connections = {};
var dbName = "music";
const commands = ["play","pause","stop","next","add","remove","removeAll","clear","list","info"];



module.exports = {
    version: 1.0,
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
            ".     *add * ***music_link*** *to the queue*\n\n"+

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
            ".     *or if a* ***music_link*** *is given then give info for that link*",






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

            if (args) {
                if (args.startsWith("<") && args.endsWith(">"))  args = args.substring(1, args.length-1);
            }


            var info;
            if (args && command !== "list" && command !== "play"){
                try{
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
                catch (err){ throw ("Error in fetching youtube info ::   "+err); }
            }
            if (args && command === "list"){
                args = parseInt(args);
                if (isNaN(args)) throw ("Invalid amount_to_display:  not a number");
                if (args < 1) throw ("Invalid amount_to_display:  less than 1");
            }
            

            if (queues === undefined){
                utils.botLogs(globals, "--acquiring queues");
                queues = {};
                await ls.db_acquire(dbName);
                var stringQueues = ls.getAll(dbName);
                for (var server_id in stringQueues){
                    queues[server_id] = MusicQueue.from(stringQueues[server_id], musicQueueCapcity); 
                }
            }
            if ( !queues.hasOwnProperty(server.id) ){ //server not in queues
                utils.botLogs(globals, "--setting up server queue");
                playing[server.id] = false;
                var queue = await ls.get(dbName, server.id);
                if (queue == null) {
                    utils.botLogs(globals, "----server doesn't have queue in localstorage");
                    queue = new MusicQueue(musicQueueCapcity);
                    queues[server.id] = queue;
                    await ls.put(dbName, server.id, queue.stringify());
                }
                else {
                    utils.botLogs(globals, "----obtained queue from localstorage");
                    queues[server.id] = MusicQueue.from(queue, musicQueueCapcity); 
                }
            }


            



            utils.botLogs(globals, `--music command [${command}]`);
            if ( !(await voiceUtils.hasRolePermission(msg.member)) ){
                throw ("Insufficient permissions to use voice commands");
            }
            utils.botLogs(globals, "--fetching voice connection");
            var connection = connections[server.id];
            if ( command === "play" || command === "pause" || command === "stop" || command === "next" ){ //if commands require bot in voice channel
                if (!connection){
                    connection = fetchConnection(globals.client, server.id);
                }
                if (connection === null) {
                    throw ("Bot is not connected to a voice channel in this server");
                }
                var hasPerm = hasPermission(globals.client, msg.member, connection);
                if ( hasPerm !== true ){ throw (hasPerm);}
            }

            switch (command){
                case "play":{
                    await play(msg, connection/*, args*/).catch(err => { throw (err) });
                    break;
                }
                case "pause":{
                    await pause(msg, connection).catch(err => { throw (err) });
                    break;
                }
                case "stop":{
                    await stop(msg, connection).catch(err => { throw (err) });
                    break;
                }
                case "next":{
                    await next(msg, connection).catch(err => { throw (err) });
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
                default:{
                    throw (`Invalid request, music command [${command}] not supported`);
                }
            }
        }
        catch (err) { throw (err); }
    }
}



//function finish(){ next(); }
function onError(err) { console.log(`__[music] error occurerd during audio stream:\n${err}`); }


function fetchConnection(client, server_id){
    var connections = Array.from(client.voice.connections.values());
    for (var connection of connections){
        if (connection.channel.guild.id === server_id) {
            connections[server_id] = connection;
            return connection;
        }
    }
    return null;
}
function hasPermission(client, member, connection){
    var channel = connection.channel;
    var bot_perms = channel.permissionsFor(client.user);
    if ( !bot_perms.has("SPEAK") ) return ("Bot doesn't have permission to connect to ["+channel.name+":"+channel.id+"]");
    var member_perms = channel.permissionsFor(member);
    if ( !member_perms.has("CONNECT") ) return (member.displayName+"#"+member.user.discriminator+" doesn't have permission to connect to ["+channel.name+":"+channel.id+"]");
    return true;
}


async function play(msg, connection/*, args*/){
    var server_id = msg.guild.id;
    var currentSong = queues[server_id].peek();
    if (currentSong === null){
        await msg.reply("Queue is empty");
        return;
    }
    if (playing[server_id] === true) {
        msg.reply("Already playing");
        return;
        /*if (args === null) {
            msg.reply("Already playing");
            return;
        }
        streams[server_id].pause();
        var yt_stream = ytdl(currentSong.url, Object.assign({begin: args}, ytdl_options));
        var streamDispatcher = connection.play(yt_stream, discordStream_options);
        return;*/
    }
    if (streams[server_id] === undefined){ 
        //var yt_stream = ytdl(currentSong.url, (args === null ? ytdl_options : Object.assign({begin: args}, ytdl_options)));
        var yt_stream = ytdl(currentSong.url, ytdl_options);
        var streamDispatcher = connection.play(yt_stream, discordStream_options)
        .once("finish", () => { next(null, connection); })
        .once("error", onError); //will crash after anyway
        connection.voice.setMute(false);
        playing[server_id] = true;
        streams[server_id] = streamDispatcher;
        await msg.reply("Playing:  "+currentSong.title);
    }
    else { //resume
        streams[server_id].resume();
        connection.voice.setMute(false);
        playing[server_id] = true;
        await msg.reply("Resuming:  "+currentSong.title);
    }
}



async function pause(msg, connection){
    var server_id = msg.guild.id;
    if (playing[server_id] === false) {
        await msg.reply("Wasn't playing anything");
        return;
    }
    streams[server_id].pause();
    connection.voice.setMute(true);
    playing[server_id] = false;
    await msg.reply("Paused audio stream");
}



async function stop(msg, connection){
    var server_id = msg.guild.id;
    if (streams[server_id] === undefined){ 
        await msg.reply("Wasn't playing anything");
        return;
    }
    var streamDispatcher = streams[server_id];
    playing[server_id] = false;
    delete streams[server_id];
    if (leaveOnStop){
        await msg.reply("Stopped audio stream\nBot leaving voice channel ["+connection.channel.name+":"+connection.channel.id+"]");
        connection.disconnect();
    }
    else {
        connection.voice.setMute(true);
        streamDispatcher.pause();
        await msg.reply("Stopped audio stream");
    }
    
}



async function next(msg, connection){
    var server_id = connection.channel.guild.id;
    if (!msg)  connection = fetchConnection(connection.client, server_id); //get latest connection
    var was_playing = playing[server_id];
    if (was_playing){
        playing[server_id] = false;
        streams[server_id].pause();
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
        var streamDispatcher = streams[server_id];
        if (streamDispatcher){
            streamDispatcher.pause();
            delete streams[server_id];
        }
        playing[server_id] = false;
        connection.voice.setMute(true); 
        if (msg) await msg.reply("No more songs in the queue");
        await ls.put(dbName, server_id, queues[server_id].stringify());
        return;
    }
    if (was_playing){
        var stream = connection.play(ytdl(nextSong.url, ytdl_options), discordStream_options)
        .once("finish", () => { next(null, connection); })
        .once("error", onError); //will crash after anyway
        playing[server_id] = true;
        streams[server_id] = stream;
    }
    if (msg)  await msg.reply(was_playing ? `Playing next in the queue:  ${nextSong.title}\nPreviously playing:   ${currentSong.title}` : `Shifted to next in the queue:  ${nextSong.title}\nPreviously playing:   ${currentSong.title}`);
    await ls.put(dbName, server_id, queues[server_id].stringify());
}



async function add(msg, info){
    var server_id = msg.guild.id;
    try { queues[server_id].enqueue(info); }
    catch (err){
        await msg.reply(err.message); //queue full
        return;
    }
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Added youtube video to queue:  "+info.title);
}



async function remove(msg, info){
    var server_id = msg.guild.id;
    queues[server_id].removeByKey("url", info.url);
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Removed from queue:  "+info.title);
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
        await msg.reply(`title :   ${info.title}`);
        return;
    }
    var server_id = msg.guild.id;
    var currentSong = queues[server_id].peek();
    await msg.reply(currentSong === null ? `Queue is empty, no info to send` : `title :   ${currentSong.title}`);
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





//considered adding channel watcher (if empty, stop playing), but decided not to


