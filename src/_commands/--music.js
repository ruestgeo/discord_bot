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

let musicQueueCapcity = 100; //default 100 songs in the queue at most
//should delete existing queues if capacity is decreased
let leaveOnStop = false;
const ytdl_options = {filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 };
const discordStream_options = {highWaterMark: 1};


const ytdl = require('ytdl-core');

const utils = require(process.cwd()+'/utils.js');
const { Queue } = require(process.cwd()+'/utils.js');
const voiceUtils = require(process.cwd()+'/_utils/voice_utils.js');
const ls = require(process.cwd()+'/_utils/localStorage_utils.js');
//const bot = require(process.cwd()+'/bot.js');



let queues = undefined;
let playing = {}; //music playing boolean per server
let connections = {}; //music player connections
let eventsRemovers = {}; //functions returned from event_once or event_on that destroy the created event listener
let controllerInfo = {}; //
let volumes = undefined;
let dbName = "music";
let dbNameVolumes = "music_volumes";
const commands = ["play","playOne","pause","stop","next","add","insert","remove","removeAll","clear","list","info","volume", "controller"];



module.exports = {
    version: 1.3,
    auth_level: 1,



    manual: "Both the bot and the requester must have sufficient permissions.\n***(only works for youtube links)***\n\n" +
            
            /*"**--music**  ->  `play` <start_at>\n" +
            ".     *play first* ***music_link*** *in the queue.*\n"+
            ".     *can provide a time to start_at (or skip to)*\n"+
            ".     *Supports formats 00:00:00.000, 0ms, 0s, 0m, 0h, or number of milliseconds.*\n"+
            ".     *Example: 1:30, 05:10.123, 10m30s*\n\n"+*/  //ytdl `begin` option is unreliable;  UNUSED
            "**--music**  ->  `play`\n" +
            ".     *play first* ***music_link*** *in the queue.*\n\n"+
             
            "**--music**  ->  `playOne <music_link>`\n" +
            ".     *play first* ***music_link*** *in the queue then stop*\n"+
            ".     *if a music_link is provided as an arg then it will play that song without adding/inserting it to the queue, then stop*\n\n"+

            "**--music**  ->  `pause` \n" +
            ".     *pause the playing music and retain track position*\n\n"+

            "**--music**  ->  `stop` \n" +
            ".     *stop playing music and reset track position to the beginning*\n\n"+

            "**--music**  ->  `next` \n" +
            ".     *move to the next song on the queue (maintains playing/paused)*\n\n"+

            "**--music**  ->  `add` *music_link* \n" +
            ".     *add* ***music_link*** *to the queue*\n"+
            ".     *multiple music links on newlines (shift+ENTER) can be given*\n\n"+

            "**--music**  ->  `insert` *position* *music_link* \n" +
            ".     *insert* ***music_link*** *in the queue starting from 0, or add it to the end of the queue*\n\n"+

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
            ".     ***audio quality may drop with higher than 100% volume***\n\n"+
            
            "**--music**  ->  `controller` \n" +
            ".     *create a reaction controller to play, pause, stop, restart, next, increase volume (+10%), decrease volume (-10%), list (10)*\n\n",






    func: async function (globals, msg, content){ 
        try{
            let server = msg.guild;
            let command;
            let args;
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

            if ( (command === "pause" || command === "stop" || command === "next" || command === "clear" || command === "controller") && (args !== null)) 
                throw ("Invalid request (given args when no args used)\n```\n"+content+"```");

            if ( (command === "add" || command === "insert" || command === "remove" || command === "removeAll" || command === "list") && (args === null) )
                throw ("Invalid request (given no args when args required)\n```\n"+content+"```");
            
            if (command === "insert" && !args.includes(" ")){
                throw ("Invalid insert args: required both a position and youtube link");
            }

            /* check member permissions */
            if ( !(await voiceUtils.hasRolePermission(msg.member)) ){
                throw ("Insufficient permissions to use voice commands");
            }
            utils.botLogs(globals, "--fetching voice connection");
            let connection = connections[server.id];
            if ( command === "play" || command === "playOne" || command === "pause" || command === "stop" || command === "next" ){ //if commands require bot in voice channel
                if (!connection){
                    connection = voiceUtils.fetchLatestConnection(globals.client, server.id);
                    //connections[server_id] = connection;
                }
                if (connection === null) {
                    throw ("Bot is not connected to a voice channel in this server");
                }
                let hasPerm = hasVoicePermission(globals.client, msg.member, connection);
                if ( hasPerm !== true ){ throw ("Bot or requester doesn't have permission for the voice channel");}
            }



            /* acquire runtime queues for first time since module load */
            if (queues === undefined){
                utils.botLogs(globals, "--acquiring queues");
                queues = {};
                await ls.db_acquire(dbName);
                let stringQueues = await ls.getAll(dbName);
                for (let server_id in stringQueues){
                    queues[server_id] = MusicQueue.from(stringQueues[server_id], musicQueueCapcity); 
                    utils.botLogs(globals, `--acquired queue for ${server_id}`);
                }
            }
            /* fetch or create queue for the server */
            if ( !queues.hasOwnProperty(server.id) ){ //server not in queues
                utils.botLogs(globals, "--setting up server queue");
                playing[server.id] = false;
                let queue = await ls.get(dbName, server.id);
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
                let stringVolumes = await ls.getAll(dbNameVolumes);
                for (let server_id in stringVolumes){ 
                    volumes[server_id] = parseFloat(stringVolumes[server_id]);
                    utils.botLogs(globals, `--acquired volume for ${server_id}:  [${volumes[server_id]*100}%]`);
                }
            }
            /* fetch or create volume for the server */
            if ( !volumes.hasOwnProperty(server.id) ){ //server not in volumes
                utils.botLogs(globals, "--setting up server volume");
                playing[server.id] = false;
                let volume = await ls.get(dbNameVolumes, server.id);
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
            let info;
            let position;
            if (args && command !== "list" && command !== "play" && command !== "volume" && command !== "remove"){
                if (command === "insert"){
                    position = args.substring(0, args.indexOf(' ')).trim();
                    args = args.substring(args.indexOf(' ')+1).trim();
                    if (position < 0) throw ("Invalid insert position: "+position);
                }
                try{
                    if (command === "add" && args.includes("\n")){
                        info = []; //array of vids to insert
                        let links = args.split("\n");
                        links = links.map(item => item.trim());
                        for (let link of links){
                            if (link.startsWith("<") && link.endsWith(">"))  link = link.substring(1, link.length-1);
                            utils.botLogs(globals,"--fetching youtube video info");
                            const yt_info = await ytdl.getInfo(link);
                            let one_info = {
                                title: yt_info.videoDetails.title,
                                url: yt_info.videoDetails.video_url,
                                origin: link,
                                requester: `${msg.member.displayName}#${msg.member.user.discriminator}`
                            };
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
                case "playOne":{
                    await playOne(msg, connection, info).catch(err => { throw (err) });
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
                case "insert":{
                    await insert(msg, info, position).catch(err => { throw (err) });
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
                case "controller":{
                    await createController(globals, msg).catch(err =>{ throw (err) });
                    break;
                }
                default:{
                    throw (`Invalid request, music command [${command}] not supported`);
                }
            }
        }
        catch (err) { throw (err); }
    },

    isCurrentlyPlaying: function (server_id){
        return playing[server_id];
    }
}





//function onFinish (){ next(); }
function onError (err) { console.log("__[music] error occurerd during audio stream:\n"+err); }



function hasVoicePermission (client, member, connection){
    let channel = connection.channel;
    let bot_perms = channel.permissionsFor(client.user);
    if ( !bot_perms.has("SPEAK") ) return ("Bot doesn't have permission to connect to ["+channel.name+":"+channel.id+"]");
    let member_perms = channel.permissionsFor(member);
    if ( !member_perms.has("CONNECT") ) return (member.displayName+"#"+member.user.discriminator+" doesn't have permission to connect to ["+channel.name+":"+channel.id+"]");
    return true;
}


async function playOne (msg, connection, info){
    let server_id = msg.guild.id;
    connections[server_id] = connection; 
    if (playing[server_id] === true) {
        console.log("__[music]  already playing in server");
        msg.reply("Already playing. Stop the currently playing audio to use this command");
        return;
    }
    if ( connection.dispatcher ){ 
        try {
            playing[server_id] = false;
            delete connections[server_id];
            delete playing[server_id];
            eventsRemovers[server_id](); 
            connection.dispatcher.destroy(); 
            await connection.voice.setMute(true);
        }
        catch (err) { console.log(`!__[music]  error in destroying stream ::   ${err}`); }
        msg.channel.send("Stopped the currently paused audio before proceeding");
    }
    let currentSong;
    if (!info){ //link wasn't provided, play the first song in queue
        currentSong = queues[server_id].peek();
        if (currentSong === null){
            console.log("__[music]  nothing to play, queue empty");
            await msg.reply("Queue is empty");
            return;
        }
        console.log("__[music]  playing only the first from queue");
    }
    else { //play from provided url
        currentSong = info;
    }
    await connection.voice.setMute(false);
    playing[server_id] = true;
    let streamDispatcher;
    try {
        //let yt_stream = ytdl(currentSong.url, (args === null ? ytdl_options : Object.assign({begin: args}, ytdl_options)));
        let yt_stream = ytdl(currentSong.url, ytdl_options);
        streamDispatcher = connection.play(yt_stream, discordStream_options);
        streamDispatcher.setVolumeLogarithmic(volumes[server_id]);
    }
    catch (err){
        await connection.voice.setMute(true);
        playing[server_id] = false;
        throw ("Error in playing youtube stream ::   "+err);
    }
    
    streamDispatcher.once("finish", async () => { 
        console.log("!__[music]  finish -> stop ["+server_id+"]");
        try{
            playing[server_id] = false;
            delete connections[server_id];
            delete playing[server_id];
            eventsRemovers[server_id](); //connection.removeAllListeners('disconnect');
            await connection.voice.setMute(true);
        } catch (err) { console.log(err); throw (err); }
        if (!info) {
            queues[server_id].dequeue();
            await ls.put(dbName, server_id, queues[server_id].stringify());
        }
    })
    .once("error", onError);
    let server_name = connection.channel.guild.name;
    eventsRemovers[server_id] = utils.event_once(connection, 'disconnect', async () => {
        console.log("        !__[music]  disconnect event on connection for ["+server_name+":"+server_id+"]");
        try {
            delete connections[server_id];
            delete playing[server_id];
        } catch (err) {}
    }); 
    await msg.reply("Playing:  "+currentSong.title);
}


async function play (msg, connection /*, args*/){
    let server_id = msg.guild.id;
    connections[server_id] = connection; //let connection = connections[server_id];
    //console.log("DEBUG connection: "+connection.channel.name+":"+connection.channel.id+"  ||  status:  "+connection.status+"  ||  dispatcher:  "+connection.dispatcher);
    //console.log(`DEBUG playing ::   ${JSON.stringify(playing,null,'  ')}`);
    //console.log(`DEBUG connections ::   ${JSON.stringify(Object.keys(connections).map(item => item+"  ||  status: "+connections[item].status+"  ||  dispatcher: "+connections[item].dispatcher),null,'  ')}`);
    let currentSong = queues[server_id].peek();
    if (currentSong === null){
        console.log("__[music]  nothing to play, queue empty");
        await msg.reply("Queue is empty");
        return;
    }
    if (playing[server_id] === true) {
        console.log("__[music]  already playing in server");
        msg.reply("Already playing");
        return;
        /*if (args === null) {
            msg.reply("Already playing");
            return;
        }
        connections[server_id].dispatcher.pause();
        let yt_stream = ytdl(currentSong.url, Object.assign({begin: args}, ytdl_options));
        let streamDispatcher = connection.play(yt_stream, discordStream_options);
        streamDispatcher.setVolumeLogarithmic(volumes[server_id]);
        return;*/
    }
    await connection.voice.setMute(false);
    playing[server_id] = true;
    if ( !connection.dispatcher ){ 
        console.log("__[music]  playing from queue");
        let streamDispatcher;
        try {
            //let yt_stream = ytdl(currentSong.url, (args === null ? ytdl_options : Object.assign({begin: args}, ytdl_options)));
            let yt_stream = ytdl(currentSong.url, ytdl_options);
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
        let server_name = connection.channel.guild.name;
        eventsRemovers[server_id] = utils.event_once(connection, 'disconnect', async () => {
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
        console.log("__[music]  resuming audio stream");
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



async function pause (msg){
    let server_id = msg.guild.id;
    if ( !playing[server_id] ){
        console.log("__[music]  wasn't playing anything");
        await msg.reply("Wasn't playing anything");
        return;
    }
    if ( !connections[server_id] ){ 
        console.log("__[music]  wasn't playing; no connection");
        await msg.reply("Wasn't playing anything");
        return;
    }
    if ( !connections[server_id].dispatcher ){
        console.log("__[music]  wasn't playing; no dispatcher");
        await msg.reply("Wasn't playing anything");
        return;
    }
    playing[server_id] = false;
    connections[server_id].dispatcher.pause();
    await connections[server_id].voice.setMute(true);
    await msg.reply("Paused audio stream");
}



async function stop (msg){
    let server_id = msg.guild.id;
    if (connections[server_id] === undefined){ 
        await msg.reply("Wasn't playing anything nor had anything paused");
        return;
    }
    let connection = connections[server_id];
    try{
        playing[server_id] = false;
        delete connections[server_id];
        delete playing[server_id];
        eventsRemovers[server_id](); //connection.removeAllListeners('disconnect');
    } catch (err) { throw (err); }
    if (leaveOnStop){
        console.log("__[music]  disconnect on stop");
        connection.disconnect();
        await msg.reply("Stopped audio stream\nBot leaving voice channel ["+connection.channel.name+":"+connection.channel.id+"]");
    }
    else {
        console.log("__[music]  destroy stream on stop");
        try { connection.dispatcher.pause(); }
        catch (err) { console.log(`!__[music]  error in pausing stream ::   ${err}`); }
        try { connection.dispatcher.destroy(); }
        catch (err) { console.log(`!__[music]  error in destroying stream ::   ${err}`); }
        await connection.voice.setMute(true);
        await msg.reply("Stopped audio stream");
    }
    
}



async function next (msg, server_id){
    let connection = connections[server_id];
    if (!msg && !connection){ 
        console.log("!__[music]  auto-next -> no connection");
        return; 
    }

    let was_playing = playing[server_id];
    if (was_playing){
        playing[server_id] = false;
        if (msg){ //destroy previously playing stream
            console.log("__[music]  command while playing -> delete playing stream");    
            try { connection.dispatcher.pause(); }
            catch (err) { console.log(`!__[music]  error in pausing stream ::   ${err}`); }
            try { connection.dispatcher.destroy(); }
            catch (err) { console.log(`!__[music]  error in destroying stream ::   ${err}`); }
        }
    }
    if (msg && (was_playing === false)){ //command while paused -> delete paused
        console.log("__[music]  command while paused -> delete paused stream");
        try { connection.dispatcher.destroy(); }
        catch (err) { console.log(`!__[music]  error in destroying stream ::   ${err}`); }
        delete connections[server_id];
        delete playing[server_id];
    }
    let currentSong;
    try{ currentSong =  queues[server_id].dequeue(); } 
    catch (err){
        if (msg){ 
            await msg.reply(err.message); //queue empty
            return;
        }
        if (was_playing) throw new Error("Bot seemed to be playing but nothing in the queue"); //shouldn't be playing
    }
    let nextSong = queues[server_id].peek();
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
            console.log("__[music]  no next song queue empty");
            await msg.reply("No more songs in the queue");
        }
        else console.log("!__[music]  auto-next -> empty queue");
        await ls.put(dbName, server_id, queues[server_id].stringify());
        return;
    }
    if (was_playing){
        console.log("__[music]  continuing to play on next");
        let streamDispatcher = connection.play(ytdl(nextSong.url, ytdl_options), discordStream_options)
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



async function add (msg, info){
    let server_id = msg.guild.id;
    if (Array.isArray(info)){
        console.log("__[music]  add multiple");
        let index = 0;
        try { for (; index < info.length; index++) queues[server_id].enqueue(info[index]);  }
        catch (err){ //queue full
            console.log(err.message);
            await msg.reply(err.message+"\nCouldn't insert the following links:\n"+info.slice(index).map(item => item.origin));
            return; 
        }
        finally { 
            await ls.put(dbName, server_id, queues[server_id].stringify()); 
            let header = "Added the following youtube videos to queue:\n";
            let all = header+info.slice(0,index).map(item => "<"+item.origin+">").join("\n");
            if (all.length+header.length > 2000){
                await msg.reply(header);
                let parts = [];
                while (all.length > 2000){
                    let split_index = all.substr(1800, all.length).indexOf("\n")+1800;
                    parts.push(all.substr(0,split_index));
                    all = all.substr(split_index, all.length);
                }
                for (let part of parts){ await msg.channel.send(part); }
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




async function insert (msg, info, position){
    let server_id = msg.guild.id;
    let length = queues[server_id].length();
    position = position > length  ?  length  :  position;
    try { queues[server_id].insert(info, position); }
    catch (err){ //queue full
        console.log(err.message);
        await msg.reply(err.message);
        return;
    }
    await ls.put(dbName, server_id, queues[server_id].stringify());
    
    await msg.reply("Inserted youtube video to queue at position ["+position+"]:  "+info.title);
}




async function remove (msg, arg){
    let server_id = msg.guild.id;
    let removed;
    if (typeof(arg) === "number"){
        console.log("__[music]  remove by index");
        removed = queues[server_id].removeIndex(arg)[0];
    }
    else {
        console.log("__[music]  remove by url");
        removed = queues[server_id].removeByKey("url", arg.url)[0];
    }
    console.log(JSON.stringify(removed,null,'  '));
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Removed from queue:  "+removed.title);
}


async function removeAll (msg, info){
    let server_id = msg.guild.id;
    queues[server_id].removeAllByKey("url", info.url);
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Removed all matching entries from queue:  "+info.title);
}



async function clear (msg){
    let server_id = msg.guild.id;
    queues[server_id].clear();
    await ls.put(dbName, server_id, queues[server_id].stringify());
    await msg.reply("Emptied the queue");
}



async function list (msg, amount){
    if (amount > musicQueueCapcity) amount = musicQueueCapcity;
    let server_id = msg.guild.id;
    let copy = queues[server_id].copy();
    let titles = copy.map(item => item["title"]).splice(0,amount);
    for (let index = 0;  index < amount;  index++){
        if (index >= titles.length) titles[index] = `**[${index}]**  *empty*` ;
        else titles[index] = `**[${index}]**  ${titles[index]}`;
    }
    let all = titles.join("\n");
    if (all.length > 2000){
        let parts = [];
        while (all.length > 2000){
            let split_index = all.substr(1800, all.length).indexOf("\n")+1800;
            parts.push(all.substr(0,split_index));
            all = all.substr(split_index, all.length);
        }
        for (let part of parts){ await msg.channel.send(part); }
        if (all.trim() !== "") await msg.channel.send(all); //last part
    }
    else  await msg.channel.send(all);
}



async function getInfo (msg, info){
    if (info) {
        console.log("__[music]  get info from url");
        await msg.reply(`title :   ${info.title}\nurl:  ${info.url}`);
        return;
    }
    console.log("__[music]  get first in queue info");
    let server_id = msg.guild.id;
    let currentSong = queues[server_id].peek();
    await msg.reply(currentSong === null ? `Queue is empty, no info to send` : `title :   ${currentSong.title}\nurl:  ${currentSong.url}`);
}



async function setVolume (msg, arg){
    let server_id = msg.guild.id;
    if (!arg){ //obtain and reply with the current volume
        console.log("__[music]  get volume for bot in server");
        let vol = parseFloat(await ls.get(dbNameVolumes, server_id));
        await msg.reply("Current volume is set to:  "+(vol*100)+"%");
        return;
    } //else set the server volume and current dispatcher (if any) to the given arg
    console.log("__[music]  set volume for bot in server");
    volumes[server_id] = arg/100;
    await ls.put(dbNameVolumes, server_id, volumes[server_id].toString());
    if (connections[server_id]){
        if (connections[server_id].dispatcher){
            connections[server_id].dispatcher.setVolumeLogarithmic(volumes[server_id]);
        }
    }
    await msg.reply("Set volume to:  "+arg+"%");
}




//play, pause, stop, restart, next, increase volume (10), decrease volume (10), list (10)
//▶️ ⏸️ ⏹️ ↩️ ⏭️ 🔼 🔽 🎵 ❌
async function createController (globals, msg){
    let serverID = msg.guild.id;
    if (controllerInfo.hasOwnProperty(serverID)) {//only one music controller per server
        msg.reply("A message controller already exists\n<"+ utils.url_prefix + controllerInfo[serverID].token +">");
        return;
    }
    let controllerTextUpdate = async function (content){
        controllerInfo[serverID].content += content+"\n";
    }
    let fake_message = {
        'guild': {'id': serverID},
        'channel': {'send': controllerTextUpdate },
        'reply': controllerTextUpdate
    };

    let target_msg = await msg.channel.send(controller_prefix + "controller initialized" + controller_suffix);
    let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
    controllerInfo[serverID] = {
        'token': msg_token,
        'message': target_msg,
        'content': ""
    };
    await utils.react_controller(globals, "music controller ["+serverID+"]", target_msg, async (globals, serverID, userID) => {
        //isAuthorized
        let server = await utils.fetchServer(globals, serverID).catch(err => { utils.botLogs(globals, err); throw (err); });
        let member = await server.members.fetch(userID).catch(err => { utils.botLogs(globals, err); throw (err); });
        return (await voiceUtils.hasRolePermission(member));

    }, { //react_callbacks
        "▶️" : {
            'callback': async (globals, server_ID, user_ID, token) => {
                //fetch connection
                let connection = utils.getVoiceConnection(globals.client, server_ID);
                if (!connection){
                    controllerInfo[server_ID].content = "Currently not connected to a voice channel in this server";
                    return;
                }
                await play(fake_message, connection).catch(err => { controllerInfo[server_ID].content = err });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "⏸️" : {
            'callback': async (globals, server_ID, user_ID, token) => {
                await pause(fake_message).catch(err => { controllerInfo[server_ID].content = err });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "⏹️" : {
            'callback': async (globals, server_ID, user_ID, token) => {
                await stop(fake_message).catch(err => { controllerInfo[server_ID].content = err });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "↩️" : {
            'awaitLock' : true,
            'callback': async (globals, server_ID, user_ID, token) => {
                await stop(fake_message).catch(err => { 
                    controllerInfo[server_ID].content = err;
                    flushControllerContent(controllerInfo, server_ID);
                    return;
                });
                let connection = utils.getVoiceConnection(globals.client, server_ID);
                if (!connection){
                    controllerInfo[server_ID].content = "Currently not connected to a voice channel in this server";
                    return;
                }
                await play(fake_message, connection).catch(err => { 
                    controllerInfo[server_ID].content = err;
                    flushControllerContent(controllerInfo, server_ID);
                    return;
                });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "⏭️" : {
            'awaitLock' : true,
            'callback': async (globals, server_ID, user_ID, token) => {
                await next(fake_message, server_ID).catch(err => { controllerInfo[server_ID].content = err });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "🔼" : {
            'callback': async (globals, server_ID, user_ID, token) => {
                let currentVolume = volumes[server_ID];
                if (currentVolume > 1.0) {
                    controllerInfo[server_ID].content = "Cannot increase the volume any further using the controller.  \ncurrent volume is "+(currentVolume*100)+"%";
                    flushControllerContent(controllerInfo, server_ID);
                    return;
                }
                await setVolume(fake_message, (currentVolume + 0.1)*100).catch(err => { controllerInfo[server_ID].content = err });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "🔽" : {
            'callback': async (globals, server_ID, user_ID, token) => {
                let currentVolume = volumes[server_ID];
                if (currentVolume < 0.15) {
                    controllerInfo[server_ID].content = "Cannot decrease the volume any further using the controller.  \ncurrent volume is "+(currentVolume*100)+"%";
                    flushControllerContent(controllerInfo, server_ID);
                    return;
                }
                await setVolume(fake_message, (currentVolume - 0.1)*100).catch(err => { controllerInfo[server_ID].content = err });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "🎵" : {
            'callback': async (globals, server_ID, user_ID, token) => {
                await list(fake_message, 10).catch(err => { controllerInfo[server_ID].content = err });
                flushControllerContent(controllerInfo, server_ID);
            }
        },
        "❌" : {
            'awaitLock' : true,
            'callback': async (globals, server_ID, user_ID, token) => {
                delete controllerInfo[serverID];
                utils.botLogs(globals, "__[music]  destroyed controller for server "+server_ID+"  by request of user"+user_ID)
            }
        },
    });
    if (globals._shutdown){
        if ( !globals._shutdown.hasOwnProperty("--music") ){
            console.log("__[music] setting up shutdown for controllers");
            globals._shutdown["--music"] = [];
            globals._shutdown["--music"].push( async () => {
                let IDs = Object.keys(controllerInfo);
                for (let server_ID of IDs){
                    console.log("[music_shutdown] controller "+controllerInfo[server_ID].token);
                    await controllerInfo[server_ID].message.edit("Controller has been shutdown").then(_ => {console.log("    controller 'destroyed'")}).catch(err => console.error);
                    delete controllerInfo[server_ID];
                }
            } );
        }
    }
}
async function flushControllerContent (controllerInfo, serverID){
    if (controllerInfo[serverID].content.length + controller_const_length > 2000)
        controllerInfo[serverID].content = "`too much content to post`";
    await controllerInfo[serverID].message.edit(controller_prefix + controllerInfo[serverID].content + controller_suffix)
    .catch(err => {throw (err)});
    controllerInfo[serverID].content = "";
}
const controller_prefix = "__**Music Controller**__\n:small_orange_diamond: *last message*:\n";
const controller_suffix = "\n\n▶️ to play,   ⏸️ to pause,   ⏹️ to stop,   ↩️ to replay,   ⏭️ to play next,\n🔼 to increase volume,   🔽 to decrease volume,   🎵 to list next 10 titles,\n ❌ to destroy this music controller";
const controller_const_length = controller_prefix.length + controller_suffix.length;





//extend Queue to MusicQueue 
function MusicQueue (capacity, array){
    Queue.call(this, capacity, array);
}
/*let prototype = new Function();
prototype.prototype = Queue.prototype;
MusicQueue.prototype = new prototype();
MusicQueue.prototype.constructor = MusicQueue;*/
MusicQueue.prototype = Object.create(require(process.cwd()+'/utils.js').Queue.prototype);

/**
 * remove first instance of element that contains key with value from queue and returns it
 **/
MusicQueue.prototype.removeByKey = function (key, value){ 
    let index = this._elements.findIndex(Q_item => Q_item[key] === value);
    if (index < 0 ) throw new Error("element not found in Queue");
    return this._elements.splice(index, 1);
}

/**
 * remove all instances of element that contains key with value from queue
 **/
MusicQueue.prototype.removeAllByKey = function (key, value){ 
    this._elements = this._elements.filter(Q_item => Q_item[key] !== value);
}

/**
 * create a MusicQueue where if an array is given then it creates the queue from the array;  capacity is optional
 */
MusicQueue.from = function (array, capacity){ //create a new MusicQueue from the array with a given capacity
    try{ return new MusicQueue(capacity, array); }
    catch (err) { throw (err); }
}






//considered adding channel watcher (if empty, stop playing), but decided not to


