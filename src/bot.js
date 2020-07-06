#!/usr/bin/env node

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


const logsPath = "./logs/"; //should end with '/'
const commandsPath = "./_commands/";
const reactablesPath = "./_reactables/";
//const customUtilsPath = "./_utils/"; 
//const customConfigsPath = "./_configs/";
//const privatePath = "./_private/";
const startupPath = "./_startup/";
const configsPath = './configs.json';

const fs = require('fs'); 
const EventEmitter = require('events');
const readline = require('readline'); //for enterToExit()

const Discord = require('discord.js');
const { DateTime } = require('luxon');


const package = require('./package.json');
const utils = require('./utils.js');
const _configs = require(configsPath); //original configs
var configs = undefined; //configs might be added (default) during verifyConfigs if missing


const client = new Discord.Client();
const botEventEmitter = new EventEmitter();

var globals = undefined; //set during verifyConfigs


const nonblocking_built_in_funcs = ["--version"];
const blocking_built_in_funcs = ["--help", "--commands", "--ping", "--shutdown"];

//"**--**  ->  ``\n" +
//".     *description* \n" +


const built_in_manuals = {
    
    "--version":    "**--version**  ->  \\*none\\*\n" +
                    ".     *replies with the discord bot version*",
    "--ping":       "**--ping**  ->  \\*none\\*\n" +
                    ".     *ping the discord bot which will reply pong and flash its status indicator*",
    "--shutdown":   "**--shutdown**  ->  \\*none\\*\n" +
                    ".     *close all listening instances of the discord bot*",
    "--help":       "**--help**  ->  \\*none\\* ~~  *or* ~~  all ~~  *or*  ~~ \\*commandName\\* ~~  *or*  ~~ \\**keywords*\\*\n" +
                    ".     *if \\*none\\* is given then it will send the help command manual*\n"+
                    ".     *if* **all** *is given then it will send a list of all commands*\n"+
                    ".     *if \\*commandName\\* is given then it will send the manual for that command*\n"+
                    ".     *if \\**keywords*\\* (split by a single empty space) are given then it will try to send a list of all commands that contain all of those keywords*\n",
    "--commands":   "**--commands** ->  \\*none\\*   *or*   all   *or*   \\*commandName\\*   *or*   \\**keywords*\\*\n" +
                    ".     *an alias for the \"--help\" command*"
}
var command_description = "The bot built-in commands are as follows, \n"+
        ".  ***commandName  ->  arguments*** \n"+
        ".    any quotation marks, curly brackets, or square brackets are necessary are necessary\n"+
        ".    `...` (ellipsis) implies that you can input more than one\n"+
        ".    encapsulating with `<` and `>` like `\"< args >\"` implies the argument is optional\n"+
        ".    do not include elipses, <, >, or single quotations in the command \n"+
        ".    do not use double quotations in a key value pair as it is used to encapsulate the key or value;  instead use single quotations or escaped double quotations for example, for example\n"+
        ".    `{\"message\": \"i quote, \"something\" and it failed :<\"}`\n"+
        ".    `{\"message\": \"i quote, 'something' and it succeeded :>\"}`\n"+
        ".    `{\"message\": \"i quote, \\\"something\\\" and it succeeded :>\"}`\n"+
        "================================";




function handleRequest(msg){
    if (!globals) return;
    var requestBody = msg.content.substring(configs["prefix"].length);
    var command;
    var content;
    if (requestBody.includes(' ')){
        command = requestBody.substr(0,requestBody.indexOf(' ')).trim();
        content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
    }
    else {
        command = requestBody.trim();
        content = "";
    }
    msg.react('👌');

    commandHandler(msg, msg.member, command, content)
    .catch(err => {
        msg.react('❌');
        utils.botLogs(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
        msg.reply("An error occured\n"+err);
    }); 
}




async function commandHandler(msg, member, command, content, ignoreQueue){
    if (!globals) return;
    if (!ignoreQueue) ignoreQueue = false;

    /* modular  and  blocking built-in  commands */
    if ( globals.modularCommands.hasOwnProperty(command) || blocking_built_in_funcs.includes(command) ){
        var requiredAuthLevel;
        if ( blocking_built_in_funcs.includes(command) ){
            requiredAuthLevel = globals.configs.built_in_AuthLevels[command];
        }
        else  requiredAuthLevel = globals.modularCommands[command].auth_level; 

        if ( !(await utils.checkMemberAuthorized(globals, member, requiredAuthLevel, false).catch(err =>{ throw (err) }) ) ){
            msg.reply("Insufficient permissions to run ["+command+"]");
            msg.react('❌');
            return;
        }
        //console.log("DEBUG current queue :  "+globals.queueLength+" / "+globals.queueCapacity);
        if ( (globals.queueLength >= globals.queueCapacity) && !ignoreQueue ){
            console.log("## Queue capacity reached, ignoring command ["+command+"] from "+member.displayName+"#"+member.user.discriminator);
            msg.reply("Too many commands queued, try again later");
            msg.react('❌');
            return;
        }
        globals.queueLength ++;
        if ( globals.busy ){
            msg.reply("I'm busy with something at the moment\n Please wait and I'll get back to your request in a moment");
        } // else not busy
        
        var content_line = content.replace(/\n/g, ' `\\n` ');
        await utils.acquire_work_lock(globals, "["+command/*+"  "+content_line*/+"] req from "+member.displayName+"#"+member.user.discriminator);
        if (globals.configs.timestamp)
            utils.botLogs(globals,"\nProcessing command ["+command+"]\n  with args ::   "+content_line, globals.configs.timestamp, "\n\n");
        else 
            utils.botLogs(globals,"\n\nProcessing command ["+command+"]\n  with args ::   "+content_line);
        
        if ( await utils.checkMemberAuthorized(globals, member, requiredAuthLevel, true).catch(err =>{ throw (err) }) ){ //recheck auth in case changed while waiting
            msg.reply("processing request ["+command+"]");
            await utils.change_status(client, 'dnd', "[working for "+member.displayName+"#"+member.user.discriminator+"]")
            .catch(err =>{
                utils.botLogs(globals,"## err occured on setting status: "+err); //catch but continue on
            });

            /* handle built-in (blocking) command */
            if ( blocking_built_in_funcs.includes(command) ){
                builtInHandler(msg, member, command, content)
                .then(completionMessage => {
                    if (globals.configs.timestamp)
                        utils.botLogs(globals,"\nCompleted request\n", globals.configs.timestamp, "\n");
                    else
                        utils.botLogs(globals,"\nCompleted request\n");
                    if (completionMessage) msg.reply(completionMessage); //send if one is given
                    msg.react('✅');             
                })
                .catch(err => {
                    msg.react('❌');
                    utils.botLogs(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
                    msg.reply("An error occured\n"+err);
                    return;
                })
                .finally(_ =>{ 
                    globals.queueLength --; 
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { 
                        utils.botLogs(globals,"## err occured on returning status: "+err); 
                        msg.channel.send("Error ::  "+err + "\n\nMy status should be 'idle'."); 
                        return;
                    })
                    .finally(_ => {
                        utils.release_work_lock(globals, "["+command/*+"  "+content_line*/+"] req from "+member.displayName+"#"+member.user.discriminator);
                    });
                });
            }    

            /* handle modularCommand */
            else {
                globals.modularCommands[command].func(globals, msg, content)
                .then(completionMessage => {
                    if (globals.configs.timestamp)
                        utils.botLogs(globals,"\nCompleted request\n", globals.configs.timestamp, "\n");
                    else
                        utils.botLogs(globals,"\nCompleted request\n");
                    if (completionMessage) msg.reply(completionMessage); //send only if given
                    msg.react('✅');             
                })
                .catch(err => {
                    msg.react('❌');
                    utils.botLogs(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
                    msg.reply("An error occured\n"+err);
                    return;
                })
                .finally(_ =>{ 
                    globals.queueLength --; 
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { 
                        utils.botLogs(globals,"## err occured on returning status: "+err); 
                        msg.channel.send("Error ::  "+err + "\n\nMy status should be 'idle'."); 
                        return;
                    })
                    .finally(_ => {
                        utils.release_work_lock(globals, "["+command/*+"  "+content_line*/+"] req from "+member.displayName+"#"+member.user.discriminator);
                    });
                });
            }
        }
        else{ // insufficient permissions when handling the command
            utils.release_work_lock(globals, "insufficient auth on ["+command+"] req from "+member.displayName+"#"+member.user.discriminator);
            msg.reply("Insufficient permissions to run ["+command+"]");
            msg.react('❌');
        }
    }

    /* non-blocking built-in commands */
    else if ( nonblocking_built_in_funcs.includes(command) ){
        if (command === '--version'){ //non-blocking command
            utils.botLogs(globals,"\nreceived version query\n["+package.name+"]   version -- "+package.version+"\n\n"); 
            msg.reply("["+package.name+"]   version -- "+package.version); 
            return;
        }
    }

    /* unknown command */
    else {
        msg.react('🤔');
        msg.reply("`"+configs.prefix+command+"` command unknown, try --help or --commands for a list of commands and short documentation");
    }
}




async function builtInHandler (msg, member, command, content){
    if (!globals) return;
    var configs = globals.configs;

    /* Display a post with all available commands */
    if (command === '--help' || command === '--commands'){
        utils.botLogs(globals,"received request [help] or [commands]");
        
        if ( content === "" ){
            msg.reply("This is the usage manual for searching for other usage manuals: \n"+built_in_manuals["--help"]);
            return;
        }

        if ( content === "all" || content === "-all" || content === "--all" ){
            var all = ""
            for (var builtin of nonblocking_built_in_funcs){ all += builtin +"\n"; }
            for (var builtin of blocking_built_in_funcs){ all += builtin +"\n"; }
            for (var modularCommand in globals.modularCommands){ all += modularCommand +"\n"; }
            if (all.length > 2000){
                var parts = [];
                while (all > 2000){
                    var split_index = all.substr(1800, all.length).indexOf("\n")+1800;
                    parts.push(all.substr(0,split_index));
                    all = all.substr(split_index, all.length);
                }
                for (part of parts){ msg.channel.send(part); }
                msg.channel.send(all); //last part
            }
            else  msg.channel.send(all);
            return;
        }
        
        if ( nonblocking_built_in_funcs.includes(content) || blocking_built_in_funcs.includes(content)) {
            var manual = built_in_manuals[content];
            if ( (command_description + manual).length > 1999 ){
                msg.reply(command_description);
                msg.channel.send(manual);
                return;
            }
            msg.reply(command_description+"\n"+manual);
            return;
        }

        if ( globals.modularCommands.hasOwnProperty(content) ){
            var manual = globals.modularCommands[content].manual;
            if ( (command_description + manual).length > 1999 ){
                msg.reply(command_description);
                msg.channel.send(manual);
                return;
            }
            msg.reply(command_description+"\n"+manual);
            return;
        }

        var keywords = content.split(" "); //split by spaces
        var remaining_keywords = Array.from(keywords);
        msg.reply("The following keywords are being used list matching command names\n["+keywords.toString().replace(/,/g, ", ")+"]");
        var matches = {};
        var allList = [];
        allList = allList.concat(Object.keys(built_in_manuals), Object.keys(globals.modularCommands));

        var keyword = remaining_keywords.shift();
        for (cmd of allList){
            if ( cmd.includes(keyword) ) matches[cmd] = undefined; //globals.modularCommands[cmd].manual;
        }
        if (Object.keys(matches).length == 0){
            msg.reply("No matches found for the provided keywords");
        }
        
        while (remaining_keywords.length > 0){ 
            var keyword = remaining_keywords.shift();
            for (command_match in matches){
                if ( !command_match.includes(keyword) ) { delete matches[command_match]; }
            }
        }
        var command_matches = Object.keys(matches).toString().replace(/,/g, "\n");
        if (command_matches.length > 2000){
            var parts = [];
            while (command_matches > 2000){
                var split_index = command_matches.substr(1800, command_matches.length).indexOf("\n")+1800;
                parts.push(command_matches.substr(0,split_index));
                command_matches = command_matches.substr(split_index, command_matches.length);
            }
            for (part of parts){ msg.channel.send(part); }
            msg.channel.send(command_matches); //last part
        }
        else  msg.channel.send(command_matches);
    }


    else if (command === '--ping'){
        msg.reply("pong");
        var blink_time = 1000;
        await client.user.setStatus('online').catch(err => { console.log("## err in status_blink ::  "+err); });
        await utils.sleep(blink_time);        
        await client.user.setStatus('dnd').catch(err => { console.log("## err in status_blink ::  "+err); });
        await utils.sleep(blink_time);
        await client.user.setStatus('online').catch(err => { console.log("## err in status_blink ::  "+err); });
        await utils.sleep(blink_time);
        await client.user.setStatus('dnd').catch(err => { console.log("## err in status_blink ::  "+err); });
        await utils.sleep(blink_time);
        await utils.change_status(client, 'idle', globals.configs.idleStatusText)
        .catch(err => { throw ("error occured on returning status in status_blink: "+err); });
        utils.botLogs(globals,  "--blink done");
        return;
    }


    /* shutdown the bot */
    else if (command === '--shutdown'){
        utils.botLogs(globals,'--bot shutting down');
        await msg.react('👋').catch(err => { utils.botLogs(globals,'\n\n# ERR shutting down [react]  \n'+err); });
        await utils.change_status(client, 'dnd', configs.shutdownStatusText)
        .finally(async (_) => {
            await msg.channel.send("i must go, my pepol call me!")
            .finally(async (_) => { 
                await utils.sleep(3000); 
                await shutdown();
                console.log("process exit in 5seconds");
                await utils.sleep(5000); 
                console.log("exiting");
                process.exit(); //hard close
            } )
            .catch(err => { console.log('\n\n# ERR shutting down [msg]  \n'+err); throw (err); });
        })
        .catch(err => { utils.botLogs(globals,'\n\n# ERR shutting down [status]  \n'+err); throw (err); });
        
    }   

    /* unknown command again */
    else {
        throw new Error("unknown command somehow made it through");
    }
}







async function handleReactables(msg){
    if (!globals) return;
    for ( _replyFile in globals.modularReplies ){
        var replyFile = globals.modularReplies[_replyFile];
        
        if ( replyFile.hasOwnProperty("exact") ){
            if ( replyFile.exact.hasOwnProperty(msg.content) || replyFile.exact.hasOwnProperty(msg.content.toLowerCase()) ){
                var msg_content = msg.content;
                if ( (msg.content !== msg.content.toLowerCase())
                && replyFile.exact.hasOwnProperty(msg.content.toLowerCase())
                && !replyFile.exact.hasOwnProperty(msg.content) ){ //if all lowercase matches and there isn't an exact match
                    if ( replyFile.exact[msg.content.toLowerCase()]["case_insensitive"] ){ //if not undefined and true
                        msg_content = msg.content.toLowerCase();
                    }
                } 

                if ( replyFile.exact[msg_content].hasOwnProperty("reply") ){
                    var directed = true;
                    if ( replyFile.exact[msg_content].hasOwnProperty("directed") )
                        directed = replyFile.exact[msg_content].directed;
                    if ( directed )
                        await msg.reply(replyFile.exact[msg_content].reply);
                    else 
                        await msg.channel.send(replyFile.exact[msg_content].reply);
                }
                if ( replyFile.exact[msg_content].hasOwnProperty('reactions') ){
                    for ( reaction of replyFile.exact[msg_content].reactions ){
                        await msg.react(reaction);
                    }
                }
                return; //if msg.content in exact then no need to check contains
            }
        }

        if ( replyFile.hasOwnProperty("contains") ){
            for ( subphrase in replyFile.contains ){
                var case_insensitive = replyFile.contains[subphrase].hasOwnProperty("case_insensitive") ? replyFile.contains[subphrase].case_insensitive : false;
                if ( case_insensitive ? msg.content.toLowerCase().includes(subphrase) : msg.content.includes(subphrase) ){
                    if ( replyFile.contains[subphrase].hasOwnProperty("reply") ){
                        var directed = true;
                        if ( replyFile.contains[subphrase].hasOwnProperty("directed") )
                            directed = replyFile.contains[subphrase].directed;
                        if ( directed )
                            await msg.reply(replyFile.contains[subphrase].reply);
                        else 
                            await msg.channel.send(replyFile.contains[subphrase].reply);
                    }
                    if ( replyFile.contains[subphrase].hasOwnProperty('reactions') ){
                        for ( reaction of replyFile.contains[subphrase].reactions ){
                            await msg.react(reaction);
                        }
                    }
                }
            }
        }
    }
}















function onReady (){
    //console.log(client);
    utils.change_status(client, 'idle', configs.startupStatusText).catch();

    console.log(`\nLogged in as ${client.user.tag}!`);
    globals.bot_id = client.user.id;
    console.log("  bot client id: "+globals["bot_id"]); //bot_id);
    console.log("  -- use the '--help' or '--commands' command for info");
    globals["busy"] = false;

    console.log("\nBot Ready\n    "+utils.getDateTimeString(globals)+"\n\n"); 
    botEventEmitter.emit('botReady');
}
async function onMessage (msg) {        
    if (msg.content === 'ping')
        msg.reply('pong\ni see ping, i send pong!');

    /*** bot commands ***/
    else if (msg.content.startsWith(configs.prefix)) {
        handleRequest(msg);
    }

    /***  bot reactables  ***/
    else 
        await handleReactables(msg);
}
function onError (err){
    utils.botLogs(globals,"\n\n________________________________________________________________________________\n"
    +"BOT ERROR OCCURRED\n\n"+err
    +"\n________________________________________________________________________________\n\n");
    //process.exit();
}

function clientSetup(){
    console.log("\nSetting up client event handlers");
    client.on('ready', onReady);
    client.on('message', onMessage);
    client.on('error', onError);
}







async function runStartupFunctions(){
    console.log("\nRunning _startup functions");
    if (fs.existsSync(startupPath)) {
        console.log("--scanning directory: ");
        var startup_Dir = fs.readdirSync(startupPath);
        botEventEmitter.emit('botRunningStartup', startup_Dir.length);
        for ( file of startup_Dir ){
            if ((file === "disabled") ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                var jsFile = require(startupPath+file);
                if ( jsFile.hasOwnProperty("func")){
                    console.log("    running  \""+file+"\"");
                    await jsFile.func(globals);
                }
            }
        }
    }
    else 
        console.log("--directory not found");
    botEventEmitter.emit('botStartupDone');
}




function acquireJS (){
    console.log("\nAcquiring _commands");
    if (fs.existsSync(commandsPath)) {
        console.log("--scanning directory: ");
        var commands_Dir = fs.readdirSync(commandsPath);
        botEventEmitter.emit('botAcquiringCommands', commands_Dir.length);
        for ( file of commands_Dir ){
            if ((file === "disabled") ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                var jsFile = require(commandsPath+file);
                if ( jsFile.hasOwnProperty("func") && jsFile.hasOwnProperty("manual") && jsFile.hasOwnProperty("auth_level") ){
                    globals.modularCommands[file.substr(0,file.length-3)] = jsFile; 
                    console.log("    \""+file+"\"  included");
                }
                else console.log("    \""+file+"\"  not included");
            }
            else console.log("    \""+file+"\"  not included");
        }
    }
    else 
        console.log("--directory not found");
    botEventEmitter.emit('botAcquiredCommands');
    
    console.log("\nAcquiring _reactables");
    if (fs.existsSync(reactablesPath)) {
        console.log("--scanning directory: ");
        var reactables_Dir = fs.readdirSync(reactablesPath);
        botEventEmitter.emit('botAcquiringCommands', reactables_Dir.length);
        for ( file of reactables_Dir ){
            if ((file === "disabled") ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                var jsFile = require(reactablesPath+file);
                if (jsFile.hasOwnProperty("exact") || jsFile.hasOwnProperty("contains")){
                    globals.modularReplies[file.substr(0,file.length-3)] = jsFile; 
                    console.log("    \""+file+"\" included");
                }
                else  console.log("    \""+file+"\" not included");
            }
            else  console.log("    \""+file+"\" not included");
        }
    }
    else  console.log("--directory not found");
    botEventEmitter.emit('botAcquiredReactables');
}




async function logInterval(globals){
    try{
        await utils.acquire_work_lock(globals, "log_newfile");
        botEventEmitter.emit('botLogNewFile_start');
        
        var date = utils.getDateTime(globals);
        var oldLogsFileName = globals.logsFileName;
        var newLogsFileName = "LOGS_"+date.toISO()+".txt";
        newLogsFileName = newLogsFileName.replace(/-/g,"_");
        newLogsFileName = newLogsFileName.replace(/:/g,"-");
        globals["logsFileName"] = newLogsFileName;
        fs.appendFileSync(logsPath+oldLogsFileName, "\n\nSwitching to new logs file with name:  "+newLogsFileName);
        fs.writeFileSync(logsPath+newLogsFileName, "\n\n\n\n\nCreating new logs file  ["+newLogsFileName+"]\n    "+utils.getDateTimeString(globals)+"\n\n\n\n");
    }
    catch (err){
        utils.botLogs(globals,"## ERR occurred during 24hour new logs file interval");
    }
    finally {
        if (globals.busy)
            utils.release_work_lock(globals, "log_newfile");
        botEventEmitter.emit('botLogNewFile_end');
    }
}

function setupLogs(){
    botEventEmitter.emit('botLogsSetup');
    if ((configs.logsFileMode !== "none") || (configs.logsFileMode !== "")){
        console.log("\nlogsFileMode:  "+configs.logsFileMode);
        if (!fs.existsSync(logsPath)){
            console.log("--creating ["+logsPath+"] dir(s)");
            fs.mkdirSync(logsPath, { recursive: true });
        }
    
        globals["LogsToFile"] = true;
        if (configs.logsFileMode === "newfile"){ //setup 24hour interval to renew name and make new file
            var date = utils.getDateTime(globals);
            var fileName = "LOGS_"+date.toISO()+".txt";
            fileName = fileName.replace(/-/g,"_");
            fileName = fileName.replace(/:/g,"-");
            globals["logsFileName"] = fileName;
            var log_interval = setInterval(logInterval, 24*60*60*1000, globals);
            globals.timers["botLogs"] = log_interval;
            fs.writeFileSync(logsPath+globals.logsFileName, "\n\n\n\n\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\n\n");
        }
        else if (configs.logsFile === "overwrite"){
            fs.writeFileSync(logsPath+globals.logsFileName, "\n\n\n\n\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\n\n");
        }
        else {
            if (configs.logsFile !== "append"){
                console.log("--invalid logsFileMode; defaulting to [append] mode");
            }
            fs.appendFileSync(logsPath+globals.logsFileName, "\n\n\n\n\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\n\n");
        }
        fs.appendFileSync(logsPath+globals.logsFileName, "logsFileMode:  "+configs.logsFileMode);
    }
    else globals["LogsToFile"] = false;

    botEventEmitter.emit('botLogsReady');
}





function checkBotAlreadyOnline(){ 
    //doesn't seem like it can be done, at least not easily :<
    return false;
}






function verifyConfigs(){ 
    console.log("\nParsing configs.json");
    configs = require(configsPath);
    botEventEmitter.emit('botVerifyConfigs');
    var invalid = false;
    var missing = [];
    var incorrect = [];
    if ( !configs.hasOwnProperty("prefix") ){ invalid = true; missing.push("prefix"); }
    else if ( typeof configs.prefix !== "string" ){ invalid = true; incorrect.push("prefix"); }
    
    if ( !configs.hasOwnProperty("authorization") ){ invalid = true; missing.push("authorization"); }
    else if ( typeof configs.authorization !== "object" ){ invalid = true; incorrect.push(""); }
    else if ( !configs.authorization.hasOwnProperty("authorizedRoles") ){ invalid = true; missing.push("authorization.authorizedRoles"); }
    else if ( !configs.authorization.hasOwnProperty("authorizedUsers") ){ invalid = true; missing.push("authorization.authorizedUsers"); }
    else if ( typeof configs.authorization.authorizedRoles !== "object" ){ invalid = true; incorrect.push("authorization.authorizedRoles"); }
    else if ( typeof configs.authorization.authorizedUsers !== "object" ){ invalid = true; incorrect.push("authorization.authorizedUsers"); }

    if ( !configs.hasOwnProperty("built_in_AuthLevels") ){ missing.push("built_in_AuthLevels"); invalid = true; }
    else if ( typeof configs.built_in_AuthLevels !== "object" ){ invalid = true; incorrect.push("built_in_AuthLevels"); }
    else {
        for (built_in of blocking_built_in_funcs){
            if ( !configs.built_in_AuthLevels.hasOwnProperty(built_in) ){ invalid = true; missing.push("built_in_AuthLevels."+built_in); }
        }
    }

    if ( !configs.hasOwnProperty("DiscordAuthFilePath") ){ invalid = true; missing.push("DiscordAuthFilePath"); }
    else if ( typeof configs.DiscordAuthFilePath !== "string" ){ invalid = true; incorrect.push("DiscordAuthFilePath"); }
    else if ( !fs.existsSync(configs.DiscordAuthFilePath) ){ invalid = true; incorrect.push("DiscordAuthFilePath"); }

    //default 10
    if ( !configs.hasOwnProperty("workQueueCapacity") ){ missing.push("workQueueCapacity (default 10)"); configs["workQueueCapacity"] = 10; }
    else if ( typeof configs.workQueueCapacity !== "number" ){ incorrect.push("workQueueCapacity (default 10)"); configs["workQueueCapacity"] = 10; }
    else if ( configs.workQueueCapacity < 1 )   configs.workQueueCapacity = 1;

    //default false
    if ( !configs.hasOwnProperty("timestamp") ){ missing.push("timestamp (default false)"); configs["timestamp"] = false; }
    else if ( typeof configs.timestamp !== "boolean" ){ incorrect.push("timestamp (default false)"); configs["timestamp"] = false; }

    //default Eastern time
    if ( !configs.hasOwnProperty("IANAZoneTime") ){ missing.push("IANAZoneTime (default America/Toronto)"); configs["IANAZoneTime"] = "America/Toronto"; }
    else if ( typeof configs.IANAZoneTime !== "string" ){ incorrect.push("IANAZoneTime (default America/Toronto)"); configs["IANAZoneTime"] = "America/Toronto"; }
    else if ( !DateTime.local().setZone(configs.IANAZoneTime).isValid ){ incorrect.push("IANAZoneTime (default America/Toronto)"); configs["IANAZoneTime"] = "America/Toronto"; }

    //default newfile
    if ( !configs.hasOwnProperty("logsFileMode") ){ missing.push("logsFileMode (default newfile)"); configs["logsFileMode"] = "newfile"; }
    else if ( configs.logsFileMode !== "append" && configs.logsFileMode !== "newfile" && configs.logsFileMode !== "overwrite" && configs.logsFileMode !== "none" ){ incorrect.push("logsFileMode (default newfile)"); configs["logsFileMode"] = "newfile"; }

    //default "[started]"
    if ( !configs.hasOwnProperty("startupStatusText") ){ missing.push("startupStatusText (default \"[started]\")"); configs["startupStatusText"] = "[started]"; }
    else if ( typeof configs.startupStatusText !== "string" ){ incorrect.push("startupStatusText (default \"[started]\")"); configs["startupStatusText"] = "[started]"; }
    
    //default "[idle]"
    if ( !configs.hasOwnProperty("idleStatusText") ){ missing.push("idleStatusText (default \"[idle]\")"); configs["idleStatusText"] = "[idle]"; }
    else if ( typeof configs.idleStatusText !== "string" ){ incorrect.push("idleStatusText (default \"[idle]\")"); configs["idleStatusText"] = "[idle]"; }

    //default "[shutdown]"
    if ( !configs.hasOwnProperty("shutdownStatusText") ){ missing.push("shutdownStatusText (default \"[shutdown]\")"); configs["shutdownStatusText"] = "[shutdown]"; }
    else if ( typeof configs.shutdownStatusText !== "string" ){ incorrect.push("shutdownStatusText (default \"[shutdown]\")"); configs["shutdownStatusText"] = "[shutdown]"; }



    if (invalid){
        throw new Error("Invalid configs.json ::  missing configs:  \n["+missing.toString().replace(/,/g, ", ")+"]   \n\nincorrect configs: \n["+incorrect.toString().replace(/,/g, ", ")+"]");
    }
        
    if (missing.length > 0)
        console.log("--configs.json used defaults for the following missing entries ::   ["+missing.toString().replace(/,/g, ", ")+"]");
    if (incorrect.length > 0)
        console.log("--configs.json used defaults for the following incorrect entries ::   ["+incorrect.toString().replace(/,/g, ", ")+"]");


    globals["configs"] = configs;
    globals["queueCapacity"] = configs.workQueueCapacity;

    botEventEmitter.emit('botConfigsVerified');
}


async function initializeClient(){
    console.log("\nInitializing client");
    clientSetup();

    await runStartupFunctions();

    botEventEmitter.emit('botLogin');
    console.log("\nLogging in to client via token");
    client.login(require(configs.DiscordAuthFilePath).token)
    .catch(err => {console.log("--ERROR [LOGIN] ::  "+err); throw new Error("\nError occurred during login");});
}


async function init (press_enter_to_exit){
    console.log("\n\n["+package.name+"]   version -- "+package.version+"\n");
    try{
        globals = {};
        globals["client"] = client;
        globals["bot_id"] = null; //set on ready
        globals["busy"] = true; //initially busy setting up
        globals["logsPath"] = logsPath;
        globals["logsFileName"] = "LOGS.txt"; //default
        globals["timers"] = {};
        globals["modularCommands"] = {};
        globals["modularReplies"] = {}; 
        globals["blocking_built_in_funcs"] = blocking_built_in_funcs;
        globals["nonblocking_built_in_funcs"] = nonblocking_built_in_funcs;
        globals["queueLength"] = 0;
        globals["botEventEmitter"] = botEventEmitter;
        globals["_shutdown"] = []; //add functions (params: (globals)) to run on shutdown

        verifyConfigs();
        setupLogs();
        acquireJS();
        await initializeClient();
    }
    catch (err){
        console.log(err);
        if (press_enter_to_exit)  await enterToExit();
        else  process.exit();
    }    
}



async function shutdown(){
    //?? consider waiting until not busy
    if (!globals) process.exit();

    utils.botLogs(globals, "Shutdown requested\n--destroying existing intervals");
    for (interval in globals["timers"]){
        clearInterval(globals.timers[interval]);
    }
    utils.botLogs(globals, "--running _shutdown commands")
    if (globals._shutdown){
        botEventEmitter.emit('botRunningShutdown', globals._shutdown.length);
        for (shutdown_func of globals._shutdown){
            try{ await shutdown_func(globals); }
            catch(err){ console.log("----error ::   "+err); }
        }
        botEventEmitter.emit('botShutdownDone');
    }
    try { 
        client.off('ready', onReady);
        client.off('message', onMessage);
        client.off('error', onError);
        client.destroy(); 
    }
    catch (err){ utils.botLogs(globals, "ERROR when destroying client\n"+err); }
    utils.botLogs(globals,"Bot Shutdown\n    "+utils.getDateTimeString(globals)+"\n");
    botEventEmitter.emit('botExit');
    globals = undefined; //delete globals on shutdown 
}

async function reset(){
    if (globals) {
        await shutdown();
        console.log("\n\n\nResetting\n\n\n");
    }
    init();
}




function set_exit_handler(){
    if (process.platform === "win32") {
        var rl = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout
        });
      
        rl.on("SIGINT", function () {
          process.emit("SIGINT");
        });
    }
      
    process.on("SIGINT", async function () {
        console.log('\n\nProcess interrupted [SIGTERM]\n\n');
        await shutdown();
        //console.log("\n\nProcess will exit in 2 seconds.\n\n");
        //await utils.sleep(2000);
        process.exit();
    });
    process.on('SIGHUP', async function() {
        console.log('\n\nWindow about to close [SIGHUP]\n\n');
        await shutdown();
        console.log("\n\nWindow will close in 5 seconds.\n\n");
        await utils.sleep(5000);
        process.exit();
    });
    process.on('SIGTERM', async function() { 
        console.log('\n\nProcess about to terminate [SIGTERM]\n\n');
        await shutdown();
        process.exit();
    });
}


function enterToExit() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question("Press Enter to exit.", ans => {
        console.log("EXITING");
        rl.close();
        resolve(ans);
        process.exit();
    }));
}





//set_exit_handler();
//init(); 

module.exports = {
    init, 
    reset,
    shutdown,
    set_exit_handler,
    commandHandler,
    globals,
    botEventEmitter
}





