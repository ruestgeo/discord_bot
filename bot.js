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

--currently uses in-memory storage so the amount of reactroles that can be held is limited

--requires manage-roles permissions to use ConditionedRoles functions
--requires google sheets setup to use DocumentDump functions
*/

const logsPath = "./logs/"; //should end with '/'
const commandsPath = "./_commands/";
const reactablesPath = "./_reactables/";
//const customUtilsPath = "./_utils/"; 
const startupPath = "./_startup/";

const Discord = require('discord.js');
const fs = require('fs'); 
const EventEmitter = require('events');
const luxon = require('luxon');

const package = require('./package.json');
const utils = require('./utils.js');
const _configs = require('./configs.json'); //original configs
var configs = undefined; //configs might be added (default) during verifyConfigs if missing

const client = new Discord.Client();
const workLockEmitter = new EventEmitter();
const botEventEmitter = new EventEmitter();
var globals = undefined; //set during verifyConfigs
var googleEnabled = undefined; //default false but set during verifyConfigs
var consoleGap = undefined;
var botReady = undefined;
var googleDone = undefined;
var loginDone = undefined;


const nonblocking_built_in_funcs = ["--version"];
const blocking_built_in_funcs = ["--help", "--ping", "--shutdown"];






function handleRequest(msg){
    var requestBody = msg.content.substring(configs["prefix"].length);
    if (requestBody.includes(' ')){
        var command = requestBody.substr(0,requestBody.indexOf(' ')).trim();
        var content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
    }
    else {
        var command = requestBody.trim();
        var content = "";
    }
       
    //
    commandHandler(msg, msg.member, command, content)
    .catch(err => {
        msg.react('❌');
        utils.botLogs(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
        msg.reply("An error occured\n"+err);
    }); 
}




async function commandHandler(msg, member, command, content){
    if (command === "--commands") command = "--help";
    msg.react('👌');

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
        if ( globals.queueLength >= globals.queueCapacity ){
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
            utils.botLogs(globals,"\nReceived command ["+command+"]\n  with args ::   "+content_line, globals.configs.timestamp, "\n\n");
        else 
            utils.botLogs(globals,"\n\nReceived command ["+command+"]\n  with args ::   "+content_line);
        
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
    var configs = globals.configs;

    /* Display a post with all available commands */
    if (command === '--help' || command === '--commands'){
        utils.botLogs(globals,"received request [help] or [commands]");
        utils.botLogs(globals,"received request [help] or [commands]");
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
        var built_in_command_manuals = "" +
        //"**--**  ->  ``\n" +
        //".     *description* \n" +
        //"- - - - - - - - - \n"+
        "**--shutdown**  ->  \*none\*\n" +
        ".     *close all listening instances of the discord bot* \n" +
        "- - - - - - - - - " +
        "**--ping**  ->  \*none\*\n" +
        ".     *ping the discord bot which will reply pong and flash its status indicator* \n" +
        "- - - - - - - - - " +
        "";
        msg.channel.send(command_description);
        msg.channel.send(built_in_command_manuals);

        //TODO better help with searching
        var all = ""
        for (var modularCommand of globals.modularCommands){ //obtain from the <command>.js the manual
            all += modularCommand +"\n";
            //msg.channel.send(globals.modularCommands[modularCommand].manual+"\n- - - - - - - - - ");
        }
        msg.channel.send(all);
        return; //no completionMessage
    }

    else if (command === '--ping'){
        msg.reply("pong");
        await utils.status_blink(globals).catch(err => { throw (err); });
        utils.botLogs(globals,  "--blink done");
        return;
    }

    /* schedule timed events TODO-later */
    else if (command === '--repeat'){
        return repeatEventHandler(msg, member, command, content);
    }


    /* shutdown the bot */
    else if (command === '--shutdown'){
        utils.botLogs(globals,'--bot shutting down');
        await msg.react('👋').catch(err => { utils.botLogs(globals,'\n\n# ERR shutting down [react]  \n'+err); });
        utils.change_status(client, 'dnd', configs.shutdownStatusText)
        .finally(_ => {
            msg.channel.send("i must go, my pepol call me!")
            .finally(async (_) => { 
                await utils.sleep(2000); 
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




function repeatEventHandler(msg, member, command, content){
    msg.reply("this function is not supported yet");
}





async function handleReactables(msg){
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


















function clientSetup(){
    console.log("\nSetting up client event handlers");
    client.on('ready', () => {
        //console.log(client);
        utils.change_status(client, 'idle', configs.startupStatusText).catch();

        console.log(`\nLogged in as ${client.user.tag}!`);
        globals.bot_id = client.user.id;
        console.log("  bot client id: "+globals["bot_id"]); //bot_id);
        console.log("  -- use the '--help' or '--commands' command for info");
        botReady = true;
        if (consoleGap && (botReady && googleDone && loginDone)) { BotReady(); }
        else if (!googleEnabled &&  consoleGap && (botReady && loginDone))  { BotReady(); }
        globals["busy"] = false;
    });

    client.on('message', async (msg) => {        
        if (msg.content === 'ping')
            msg.reply('pong\ni see ping, i send pong!');

        /*** bot commands ***/
        else if (msg.content.startsWith(configs.prefix)) {
            handleRequest(msg);
        }

        /***  bot reactables  ***/
        else 
            await handleReactables(msg);


    });


    client.on('error', err => {
        utils.botLogs(globals,"\n\n________________________________________________________________________________\n"
        +"BOT ERROR OCCURRED\n\n"+err
        +"\n________________________________________________________________________________\n\n");
    });

    /*
    client.on( => {
        //
    });
    */
}




async function initializeClient(){
    console.log("\nInitializing client");
    clientSetup();

    await runStartupFunctions();

    console.log("\nLogging in to client via token");
    client.login(require(configs.DiscordAuthFilePath).token)
    .then(used_token => {
        console.log("--login complete");
        globals["client"] = client;
        loginDone = true;
        if (googleEnabled && consoleGap && (botReady && googleDone && loginDone)) { BotReady(); }
        else if (!googleEnabled &&  consoleGap && (botReady && loginDone))  { BotReady(); }
    })
    .catch(err => {console.log("--ERROR [LOGIN] ::  "+err); throw new Error("\nError occurred during login");});
}



/***   google connect   ***/
async function connectGoogle(){
    if (!googleEnabled)
        return null;
    const { GoogleSpreadsheet } = require('google-spreadsheet');
    const googleAuth = require(configs.GoogleAuthFilePath);
    const doc = new GoogleSpreadsheet(configs.googleSheetsId);
    await doc.useServiceAccountAuth(googleAuth)
    .then(async (x) => {
        console.log("\nSuccessfully connected to Google Sheets");
        await doc.loadInfo()
        .then(x => {
            console.log("Sheets title: ["+doc.title+"]");
            googleDone = true;
            if (consoleGap && (botReady && googleDone && loginDone)) { BotReady(); }
        })
        .catch(err => {
            console.log("Error loading info :-: "+err);
        });
    })
    .catch(err => {
        console.log("Error connecting to Sheets :-: "+err);
    });
    return doc;
}



async function runStartupFunctions(){
    console.log("\nRunning _startup functions");
    if (fs.existsSync(startupPath)) {
        console.log("--scanning directory: ");
        for ( file of fs.readdirSync(startupPath) ){
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
}


function acquireJS (){
    console.log("\nAcquiring _commands");
    if (fs.existsSync(commandsPath)) {
        console.log("--scanning directory: ");
        for ( file of fs.readdirSync(commandsPath) ){
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
    
    console.log("\nAcquiring _reactables");
    if (fs.existsSync(reactablesPath)) {
        console.log("--scanning directory: ");
        for ( file of fs.readdirSync(reactablesPath) ){
            if ((file === "disabled") ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                var jsFile = require(reactablesPath+file);
                if (jsFile.hasOwnProperty("exact") || jsFile.hasOwnProperty("contains")){
                    globals.modularReplies[file.substr(0,file.length-3)] = jsFile; 
                    console.log("    \""+file+"\" included");
                }
                else console.log("    \""+file+"\" not included");
            }
            else console.log("    \""+file+"\" not included");
        }
    }
    else 
        console.log("--directory not found");
}




async function logInterval(globals){
    try{
        await utils.acquire_work_lock(globals, "log_newfile");
        
        var date = utils.getDateTime(globals);
        var oldLogsFileName = globals.logsFileName;
        var newLogsFileName = "LOGS_"+date.toISO()+".txt";
        newLogsFileName = newLogsFileName.replace(/-/g,"_");
        newLogsFileName = newLogsFileName.replace(/:/g,"-");
        globals["logsFileName"] = newLogsFileName;
        fs.appendFileSync(logsPath+oldLogsFileName, "\n\nSwitching to new logs file with name:  LOGS_"+date.toISO()+".txt");
        fs.writeFileSync(logsPath+newLogsFileName, "\n\n\n\n\nCreating new logs file  [LOGS_"+date.toISO()+".txt]\n    "+utils.getDateTimeString(globals)+"\n\n\n\n");
    }
    catch (err){
        utils.botLogs(globals,"## ERR occurred during 24hour new logs file interval");
    }
    finally {
        if (globals.busy)
            utils.release_work_lock(globals, "log_newfile");
    }
}

function setupLogs(){
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
            globals["timers"].push(log_interval);
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
}





function checkBotAlreadyOnline(){ //doesn't seem like it can be done, at least not easily :<
    //client  configs.bot_id
    return false;
}






function verifyConfigs(){
    //TODO add type checking and validation

    googleEnabled = false;
    consoleGap = true;
    botReady = false;
    googleDone = false;
    loginDone = false;

    console.log("\nParsing configs.json");
    configs = require('./configs.json');
    var invalid = false;
    var missing = [];
    if ( !configs.hasOwnProperty("prefix") ){
        invalid = true;
        missing.push("prefix");
    }
    if ( !configs.hasOwnProperty("authorization") ){
        invalid = true;
        missing.push("authorization");
    }
    else { 
        if ( !configs.authorization.hasOwnProperty("authorizedRoles") ){
            invalid = true;
            missing.push("authorization.authorizedRoles");
        }
        if ( !configs.authorization.hasOwnProperty("authorizedUsers") ){
            invalid = true;
            missing.push("authorization.authorizedUsers");
        }
    }
    if ( !configs.hasOwnProperty("built_in_AuthLevels") ){
        missing.push("built_in_AuthLevels");
        invalid = true;
    }
    else {
        for (built_in of blocking_built_in_funcs){
            if ( !configs.built_in_AuthLevels.hasOwnProperty(built_in) ){
                missing.push("built_in_AuthLevels."+built_in);
                invalid = true;
            }
        }
    }
    if ( !configs.hasOwnProperty("DiscordAuthFilePath") ){
        invalid = true;
        missing.push("DiscordAuthFilePath");
    }
    if ( !configs.hasOwnProperty("workQueueCapacity") ){
        configs["workQueueCapacity"] = 10; //default 10
        missing.push("workQueueCapacity");
    }
    else if ( configs.workQueueCapacity < 1 )   configs.workQueueCapacity = 1;
    if ( !configs.hasOwnProperty("timestamp") ){
        configs["timestamp"] = false; //default false
        missing.push("timestamp");
    }
    if ( !configs.hasOwnProperty("IANAZoneTime") ){
        configs["IANAZoneTime"] = "America/Toronto"; //default Eastern time
        missing.push("IANAZoneTime");
    }
    if ( !configs.hasOwnProperty("logsFileMode") ){
        configs["logsFileMode"] = "newfile"; //default newfile
        missing.push("logsFileMode");
    }
    if ( !configs.hasOwnProperty("startupStatusText") ){
        configs["startupStatusText"] = "[started]" //default "[started]"
        missing.push("startupStatusText");
    }
    if ( !configs.hasOwnProperty("idleStatusText") ){
        configs["idleStatusText"] = "[idle]" //default "[idle]"
        missing.push("idleStatusText");
    }
    if ( !configs.hasOwnProperty("shutdownStatusText") ){
        configs["shutdownStatusText"] = "[shutdown]" //default "[shutdown]"
        missing.push("shutdownStatusText");
    }
    
    if ( configs.hasOwnProperty("googleEnabled") ){ //else assumed false
        googleEnabled = configs.googleEnabled;
        if ( googleEnabled ){
            if ( !configs.hasOwnProperty("GoogleAuthFilePath") ){
                invalid = true;
                missing.push("GoogleAuthFilePath");
            }
            if ( !configs.hasOwnProperty("googleSheetsId") ){
                invalid = true;
                missing.push("googleSheetsId");
            }
            if ( !configs.hasOwnProperty("defaultSheetRows") ){
                configs["defaultSheetRows"] = 100; //default 100
                missing.push("defaultSheetRows");
            }
            if ( !configs.hasOwnProperty("defaultSheetCols") ){
                configs["defaultSheetCols"] = 10; //default 10
                missing.push("defaultSheetCols");
            }
            if ( !configs.hasOwnProperty("autoSheetSize") ){
                configs["autoSheetSize"] = true; //default true
                missing.push("autoSheetSize");
            }
            if ( !configs.hasOwnProperty("sheetCellWrap") ){
                configs["sheetCellWrap"] = "CLIP"; //default "CLIP"
                missing.push("sheetCellWrap");
            }
        }
    }

    if (invalid){
        throw new Error("Invalid configs.json ::  missing or undefined configs:  ["+missing.toString()+"]");
    }
        
    if (missing.length > 0)
        console.log("--configs.json missing and used defaults for: "+missing.toString());

    globals = {};
    globals["client"] = null; //set in initializeClient
    globals["doc"] = null; //set in connectGoogle
    globals["bot_id"] = null; //set on ready
    globals["busy"] = true; //initially busy setting up
    globals["configs"] = configs;
    globals["logsPath"] = logsPath;
    globals["logsFileName"] = "LOGS.txt"; //default
    globals["timers"] = [];
    globals["luxon"] = luxon;
    globals["modularCommands"] = {};
    globals["modularReplies"] = {}; 
    globals["queueCapacity"] = configs.workQueueCapacity;
    globals["queueLength"] = 0;
    globals["botEventEmitter"] = botEventEmitter;
    globals["_shutdown"] = []; //add functions (params: (globals)) to run on shutdown
}

function BotReady(){
    consoleGap = false; 
    console.log("\nBot Ready\n    "+utils.getDateTimeString(globals)+"\n\n"); 
    globals.botEventEmitter.emit('botReady');
}



async function init (){
    console.log("\n\n["+package.name+"]   version -- "+package.version+"\n");
    try{
        verifyConfigs();
        if (googleEnabled) {
            require(configs.GoogleAuthFilePath);
            require('google-spreadsheet');
        }
        setupLogs();
        acquireJS();
    }
    catch (err){
        console.log(err);
        process.exit();
    }
    connectGoogle()
    .then(async (_doc) => {
        globals["doc"] = _doc;
        await initializeClient();
    })
    .catch(err => {
        console.log(err.stack);
        throw new Error("\nError occurred during Google Sheets connection");   
    });
}



async function shutdown(){
    //?? consider waiting until not busy

    if (!globals) return;

    utils.botLogs(globals, "Shutdown requested\n--destroying existing intervals");
    for (interval of globals["timers"]){
        clearInterval(interval);
    }
    utils.botLogs(globals, "--running _shutdown commands")
    if (globals._shutdown){
        for (shutdown_func of globals._shutdown){
            try{
                await shutdown_func(globals);
            }
            catch(err){
                console.log("----error ::   "+err);
            }
        }
    }
    

    try {
        client.destroy();
    }
    catch (err){
        utils.botLogs(globals, "ERROR when destroying client\n"+err);
    }
    utils.botLogs(globals,"Bot Shutdown\n    "+utils.getDateTimeString(globals)+"\n");
    globals.botEventEmitter.emit('botShutdown');
    globals = undefined; //delete globals on shutdown 
}

async function reset(){
    if (!globals) return;
    await shutdown();
    console.log("\n\n\nResetting\n\n\n");
    globals.botEventEmitter.emit('botReset');
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
        await shutdown();
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





//set_exit_handler();
//init(); 

module.exports = {
    init, 
    reset,
    shutdown,
    set_exit_handler,
    globals
}





