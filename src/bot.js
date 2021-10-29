#!/usr/bin/env node

/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code if distributing any modifications
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
const path = require('path');
const EventEmitter = require('events');
const readline = require('readline'); //for enterToExit()

const Discord = require('discord.js');
const { DateTime } = require('luxon');


const package = require('./package.json');
const utils = require('./utils.js');
//const _configs = require(configsPath); //original configs
let configs = undefined; //configs might be added (default) during acquireConfigs if missing


//const client = new Discord.Client();
let client = undefined;
const botEventEmitter = new EventEmitter();

let globals = {};
let initArg = undefined;


const nonblocking_built_in_funcs = ["--version"];
const blocking_built_in_funcs = ["--help", "--commands", "--ping", "--shutdown", "--detach", "--import", "--reimport", "--restart"];

//"**--**  ->  ``\n" +
//".     *description* \n" +


const built_in_manuals = {
    
    "--version":    "**--version**  ->  \\*none\\*\n" +
                    ".     *replies with the discord bot version*",
    "--ping":       "**--ping**  ->  \\*none\\*\n" +
                    ".     *ping the discord bot which will reply pong and flash its status indicator*",
    "--shutdown":   "**--shutdown**  ->  \\*none\\*\n" +
                    ".     *close all listening instances of the discord bot*",
    "--restart":   "**--restart**  ->  \\*none\\*\n" +
                    ".     *soft restart all listening instances of the discord bot*",
    "--help":       "**--help**  ->  \\*none\\* ~~  *or* ~~  all ~~  *or*  ~~ \\*commandName\\* ~~  *or*  ~~ \\**keywords*\\*\n" +
                    ".     *if \\*none\\* is given then it will send the help command manual*\n"+
                    ".     *if* **all** *is given then it will send a list of all commands*\n"+
                    ".     *if \\*commandName\\* is given then it will send the manual for that command*\n"+
                    ".     *if \\**keywords*\\* (split by a single empty space) are given then it will try to send a list of all commands that contain all of those keywords*\n",
    "--commands":   "**--commands** ->  \\*none\\*   *or*   all   *or*   \\*commandName\\*   *or*   \\**keywords*\\*\n" +
                    ".     *an alias for the \"--help\" command*",
    "--detach":   "**--detach** ->  command/reactable *fileName* \n"+
                    ".     *unlink or remove a command or reactable module from the bot, making it unaccessible*\n"+
                    ".     *only the base file name should be provided, not including the extension type*",
    "--import":   "**--import** ->  command/reactable *path/to/file/from/cwd/fileName.js* \n"+
                    ".     *import a command or reactable (or reimport if command already imported)*\n"+
                    ".     *if a command is imported then it will (re)import any requisite utils or commands and run any startup*\n"+
                    ".     *the path given should be relative to the respective directory; \"_commands\" for command files, and \"_reactables\" for emoji reaction files*",
    "--reimport":   "**--reimport** ->  configs   *and/or*   reactables\n"+
                    ".     *will reimport both or one of configs and/or reactables*\n"+
                    ".     *for example `--reimport reactables configs`*",

}
let command_description = "The command manual *should* follow the following conventions: \n"+
        ".    **commandName**  ->  ***`arguments`*** \n"+
        ".    any quotation marks, curly brackets, or square brackets are necessary\n"+
        ".    `...` (ellipsis) implies that you can input more than one, usually using a comma\n"+
        ".    encapsulating with `<` and `>` like `\"< args >\"` implies the argument is optional\n"+
        "================================";




function handleRequest(msg){
    if (!globals) return;
    let requestBody = msg.content.substring(configs["prefix"].length).trim();
    let command;
    let content;
    if (requestBody.includes(' ')){
        command = requestBody.substr(0,requestBody.indexOf(' ')).trim();
        content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
    }
    else {
        command = requestBody.trim();
        content = "";
    }
    msg.react('👌');

    commandHandler(msg, command, content)
    .catch(err => {
        msg.react('❌');
        utils.botLogs(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
        msg.reply("\n"+err);
    }); 
}




async function commandHandler(msg, command, content, ignoreQueue){
    if (!globals) return;
    if (!ignoreQueue) ignoreQueue = false;

    let member = msg.member;

    /* modular  and  blocking built-in  commands */
    if ( globals.modularCommands.hasOwnProperty(command) || blocking_built_in_funcs.includes(command) ){
        let requiredAuthLevel;
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
        
        let content_line = content.replace(/\n/g, ' `\\n` ');
        await utils.acquire_work_lock(globals, "["+command/*+"  "+content_line*/+"] req from "+member.displayName+"#"+member.user.discriminator);
        if (globals.configs.timestamp)
            utils.botLogs(globals,"\n\n("+utils.getTimeString(globals)+")\nProcessing command ["+command+"]\n  from "+member.displayName+"#"+member.user.discriminator+"\n    in channel #"+msg.channel.name+":"+msg.channel.id+" of server ["+msg.guild.name+":"+msg.guild.id+"]\n  with args ::   "+content_line);
        else 
            utils.botLogs(globals,"\n\nProcessing command ["+command+"]\n  from "+member.displayName+"#"+member.user.discriminator+"\n    in channel #"+msg.channel.name+":"+msg.channel.id+" of server ["+msg.guild.name+":"+msg.guild.id+"]\n  with args ::   "+content_line);
        
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
                        utils.botLogs(globals,"\n("+utils.getTimeString(globals)+")\nCompleted request\n");
                    else
                        utils.botLogs(globals,"\nCompleted request\n");
                    if (completionMessage) msg.reply(completionMessage); //send if one is given
                    msg.react('✅');             
                })
                .catch(err => {
                    msg.react('❌');
                    utils.botLogs(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
                    msg.reply("\n"+err);
                    return;
                })
                .finally(_ =>{ 
                    globals.queueLength --; 
                    if (globals.queueLength < 0){ globals.botLogs(globals, "\nERROR ::  queueLength less than 0:  ["+globals.queueLength+"]\n")}
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
                        utils.botLogs(globals,"\n("+utils.getTimeString(globals)+")\nCompleted request\n");
                    else
                        utils.botLogs(globals,"\nCompleted request\n");
                    if (completionMessage) msg.reply(completionMessage); //send only if given
                    msg.react('✅');             
                })
                .catch(err => {
                    msg.react('❌');
                    utils.botLogs(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
                    msg.reply("\n"+err);
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


    /* only prefix given */
    else if ( command === "" ){
        msg.react('🤔');
        msg.reply("Try --help or --commands for a list of commands and short documentation");
    }


    /* unknown command */
    else {
        msg.react('🤔');
        msg.reply("`"+configs.prefix+command+"` command unknown, try --help or --commands for a list of commands and short documentation");
    }
}




async function builtInHandler (msg, member, command, content){
    if (!globals) return;

    /* Display a post with command info */
    if (command === '--help' || command === '--commands'){
        utils.botLogs(globals,"received request [help] or [commands]");
        
        if ( content === "" ){
            await msg.reply("This is the usage manual for searching for other usage manuals: \n"+built_in_manuals["--help"]);
            await msg.channel.send(command_description);
            return;
        }

        if ( content === "all" || content === "-all" || content === "--all" ){
            let all = ""
            for (let builtin of nonblocking_built_in_funcs){ all += builtin +"\n"; }
            for (let builtin of blocking_built_in_funcs){ all += builtin +"\n"; }
            for (let modularCommand in globals.modularCommands){ all += modularCommand +"\n"; }
            utils.message(msg,all,false);
            return;
        }
        
        if ( nonblocking_built_in_funcs.includes(content) || blocking_built_in_funcs.includes(content)) {
            let manual = built_in_manuals[content];
            utils.message(msg,manual,true); //await msg.reply(manual);
            return;
        }

        if ( globals.modularCommands.hasOwnProperty(content) ){
            let jsFile = globals.modularCommands[content];
            let manual = jsFile.manual+"\nversion:  "+jsFile.version+"\nauthorization Lv."+jsFile.auth_level;
            utils.message(msg,manual,true); //await msg.reply(manual);
            return;
        }

        let keywords = content.split(" "); //split by spaces
        let remaining_keywords = Array.from(keywords);
        await msg.reply("The following keywords are being used list matching command names\n["+keywords.toString().replace(/,/g, ", ")+"]");
        let matches = {};
        let allList = [];
        allList = allList.concat(Object.keys(built_in_manuals), Object.keys(globals.modularCommands));

        let keyword = remaining_keywords.shift();
        for (let cmd of allList){
            if ( cmd.includes(keyword) ) matches[cmd] = null; //globals.modularCommands[cmd].manual;
        }
        if (Object.keys(matches).length == 0){
            await msg.reply("No matches found for the provided keywords");
        }
        
        while (remaining_keywords.length > 0){ 
            let keyword = remaining_keywords.shift();
            for ( let command_match in matches ){
                if ( !command_match.includes(keyword) ) { delete matches[command_match]; }
            }
        }
        let command_matches = Object.keys(matches).toString().replace(/,/g, "\n");
        utils.message(msg,command_matches,false);
    }

    /* fancy ping */
    else if (command === '--ping'){
        msg.reply("pong");
        let blink_time = 1000;
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


    else if (command === "--detach"){
        if (content === "")  throw ("No args were given");
        let import_type;
        let targetName;
        if (content.includes(' ')){
            import_type = content.substr(0,content.indexOf(' ')).trim();
            targetName = content.substr(content.indexOf(' ')+1).trim();
        }
        switch (import_type) {
            case "command":
                if ( globals.modularCommands.hasOwnProperty(targetName) ){
                    let rc_message = await msg.channel.send("React with 🟢 to confirm detachment of command ["+targetName+"]\n__***30 seconds to confirm***__\n\nOrgin: "+globals.modularCommands[targetName].__filePath+"\nVersion: "+globals.modularCommands[targetName].version+"\nAuth_level: "+globals.modularCommands[targetName].auth_level).catch(err => {throw (err)});
                    await utils.react_confirm(globals, "Detach_command["+targetName+"]", rc_message, 30, [msg.author.id], async _ => {
                        utils.botLogs(globals,"DETACH_CONFIRM\n  Requester: "+msg.author.tag+" : "+msg.author.id+"\n--detaching command ["+targetName+"]");
                        if ( globals._shutdown.hasOwnProperty(targetName) ){
                            utils.botLogs(globals,"--running linked shutdown functions");
                            let shutdown_funcs = globals._shutdown[targetName];
                            for ( let shutdown_func of shutdown_funcs ){
                                try{ await shutdown_func(globals); }
                                catch(err){ 
                                    utils.botLogs(globals, "----error ::   "+err.stack); 
                                    console.error(err); 
                                    await msg.channel.send("an error occured when trying to run shutdown functions to properly detach the command:\n"+err);
                                }
                            }
                        }
                        delete require.cache[require.resolve( globals.modularCommands[targetName].__filePath )];
                        delete globals.modularCommands[targetName];
                        await msg.reply("request complete;  ["+targetName+"] detached");
                    },  async _ => { await msg.reply("REJECTED -> detach abandoned"); });
                }
                else 
                    msg.reply(import_type+" "+targetName+" not found");
                break;

            case "reactable":
                if ( globals.modularReactables.hasOwnProperty(targetName) ){
                    let rc_message = await msg.channel.send("React with 🟢 to confirm detachment of reactable ["+targetName+"]\n__***30 seconds to confirm***__\n\nOrgin: "+globals.modularCommands[targetName].__filePath).catch(err => {throw (err)});
                    await utils.react_confirm(globals, "Detach_reactable["+targetName+"]", rc_message, 30, [msg.author.id], async _ => {
                        utils.botLogs(globals,"DETACH_CONFIRM\n  Requester: "+msg.author.tag+" : "+msg.author.id+"\n--detaching reactable ["+targetName+"]");
                        delete require.cache[require.resolve( globals.modularReactables[targetName].__filePath )];
                        delete globals.modularReactables[targetName];
                        await msg.reply("request complete;  ["+targetName+"] detached");
                    }, async _ => { await msg.reply("REJECTED -> detach abandoned"); });
                }
                else 
                    msg.reply(import_type+" "+targetName+" not found");
                break;

            default:
                throw ("Invalid import type  ["+import_type+"]\nOnly \"command\" and \"reactable\"");
        }
        return;// "request complete;  ["+targetName+"] detached";
        
    }

    else if (command === "--import"){
        if (content === "")  throw ("No args were given");

        //"**--import command/reactable *path/to/file/from/cwd/fileName.js*"
        let import_type;
        let filePath;
        let jsFile;
        let originalPath;
        if (content.includes(' ')){
            import_type = content.substr(0,content.indexOf(' ')).trim();
            originalPath = content.substr(content.indexOf(' ')+1).trim();
        }
        filePath = "./"+path.normalize( (import_type === "command" ? commandsPath : (import_type === "reactable" ? reactablesPath : "")) + originalPath );
        if (filePath.startsWith("..") || filePath.includes("/../") || filePath.includes("\\..\\")) throw new Error("Illegal path;  Path includes upward traversal beyond scope ::   "+originalPath);
        let targetName = path.basename(filePath, ".js");
        if ( !fs.existsSync(filePath) ){
            throw ("Invalid path:  "+filePath.replace("\\","/"));
        }
        switch (import_type) {
            case "command":
                //trigger any linked shutdowns
                if ( globals._shutdown.hasOwnProperty(targetName) ){
                    utils.botLogs(globals,"--running linked shutdown functions");
                    let shutdown_funcs = globals._shutdown[targetName];
                    for ( let shutdown_func of shutdown_funcs ){
                        try{ await shutdown_func(globals); }
                        catch(err){ 
                            utils.botLogs(globals, "----error ::   "+err.stack); 
                            console.error(err); 
                            await msg.channel.send("an error occured when trying to run shutdown functions to properly detach the command:\n"+err);
                        }
                    }
                }
                //delete old caches and entries
                if ( globals.modularCommands.hasOwnProperty(targetName) ){ 
                    utils.botLogs(globals,"--detaching command ["+targetName+"]");
                    delete require.cache[require.resolve(filePath)];
                    delete globals.modularCommands[targetName];
                }
                utils.botLogs(globals, "--importing command ["+filePath+"]");
                jsFile = require(filePath);
                if ( jsFile.hasOwnProperty("func") && jsFile.hasOwnProperty("manual") && jsFile.hasOwnProperty("auth_level") ){
                    jsFile["__filePath"] = filePath;
                    globals.modularCommands[targetName] = jsFile;
                    utils.botLogs(globals, "----\""+filePath+"\" "+(jsFile.version ? " (v"+jsFile.version+") " : "")+"  included  [Lv."+jsFile.auth_level+"]");
                }
                else
                    throw ("Invalid modular command file ["+filePath+"]");
                //import and run any additional requisites
                acquireRequisites( targetName, jsFile );  
                importCommandRequisite();
                await runRequisiteStartupFunctions().catch(err => { throw (err) });
                break;

            case "reactable":
               //delete old caches and entries 
               if ( globals.modularReactables.hasOwnProperty(targetName) ){
                    utils.botLogs(globals,"--detaching reactable ["+targetName+"]");
                    delete require.cache[require.resolve(filePath)];
                    delete globals.modularReactables[targetName];
                }
                //import reactable
                jsFile = require(filePath);
                if (jsFile.hasOwnProperty("exact") || jsFile.hasOwnProperty("contains")){
                    jsFile["__filePath"] = filePath;
                    globals.modularReactables[targetName] = jsFile; 
                    utils.botLogs(globals, "--importing reactable ["+filePath+"]");
                }
                else 
                    throw ("Invalid modular reactable file ["+filePath+"]");
                break;

            default:
                throw ("Invalid import type  ["+import_type+"]\nOnly \"command\" and \"reactable\"")
        }
        return "request complete;  ["+targetName+"] imported";
    }


    /* reimport reactables or configs */
    else if (command === '--reimport'){
        let args = content.split(" ");
        args = [...new Set(args)]; //remove duplicates
        utils.botLogs(globals, "--reimporting:  "+args);
        for (let arg of args){
            if ( arg !== "reactables" && arg !== "configs" )
                throw new Error(`invalid arg: [${arg}]`);
        }


        if (args.includes("reactables")) {
            for (let modReact in globals.modularReactables) { delete require.cache[require.resolve(reactablesPath+modReact+'.js')]; }
            globals["modularReactables"] = {}; 
            acquireReactables();
        }
        if (args.includes("configs")) {
            let old_configs = globals.configs;
            //console.log("DEBUG_old "+JSON.stringify(configs,null,'  '));
            configs = {};
            globals.configs = {};
            //console.log("DEBUG2 "+JSON.stringify(configs,null,'  '));
            try { 
                acquireConfigs(); 
                if (old_configs.DiscordAuthFilePath !== configs.DiscordAuthFilePath)
                    throw new Error("Auth file path was changed, bot should be shutdown and manually restarted.");
                if (old_configs.logsFileMode !== configs.logsFileMode){
                    utils.botLogs(globals,"--logfile mode changed from ["+old_configs.logsFileMode+"] to ["+configs.logsFileMode+"]\n----setting up for new logging mode");
                    setupLogs();
                }   
            }
            catch (err){ 
                globals.configs = old_configs;
                configs = old_configs;
                utils.botLogs(globals, "---- error on configs reimport (retaining old configs)\n"+err);
                msg.reply("An error occured when reimporting configs.  Previous configs will be retained.\n"+err); 
            }
        }
        return "Request complete.  Reimported "+args;
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


    /* shutdown and reboot */
    else if (command === '--restart'){
        utils.botLogs(globals,'--bot restarting');
        await soft_restart(msg);
        return "Restart complete";
    }


    /* unknown command again */
    else {
        throw new Error("unknown command somehow made it through");
    }
}







async function handleReactables(msg){
    if (!globals) return;
    for ( let _replyFile in globals.modularReactables ){
        const replyFile = globals.modularReactables[_replyFile];

        if ( replyFile.hasOwnProperty("targetServers") ){
            if ( !replyFile.targetServers.includes(msg.guild.id) ) return;
        }
        
        if ( replyFile.hasOwnProperty("exact") ){
            if ( replyFile.exact.hasOwnProperty(msg.content) || replyFile.exact.hasOwnProperty(msg.content.toLowerCase()) ){
                let msg_content = msg.content;
                if ( (msg.content !== msg.content.toLowerCase())
                && replyFile.exact.hasOwnProperty(msg.content.toLowerCase())
                && !replyFile.exact.hasOwnProperty(msg.content) ){ //if all lowercase matches and there isn't an exact match
                    if ( replyFile.exact[msg.content.toLowerCase()]["case_insensitive"] ){ //if not undefined and true
                        msg_content = msg.content.toLowerCase();
                    }
                }
                if ( replyFile.exact[msg_content].hasOwnProperty('reactions') ){
                    for ( let reaction of replyFile.exact[msg_content].reactions ){
                        await msg.react(reaction);
                    }
                }
                if ( replyFile.exact[msg_content].hasOwnProperty("reply") ){
                    let directed = true;
                    if ( replyFile.exact[msg_content].hasOwnProperty("directed") )
                        directed = replyFile.exact[msg_content].directed;
                    if ( directed )
                        await msg.reply(replyFile.exact[msg_content].reply);
                    else 
                        await msg.channel.send(replyFile.exact[msg_content].reply);
                }
                return; //if msg.content in exact then no need to check contains
            }
        }

        if ( replyFile.hasOwnProperty("contains") ){
            for ( let subphrase in replyFile.contains ){
                let case_insensitive = replyFile.contains[subphrase].hasOwnProperty("case_insensitive") ? replyFile.contains[subphrase].case_insensitive : false;
                if ( case_insensitive ? msg.content.toLowerCase().includes(subphrase) : msg.content.includes(subphrase) ){
                    if ( replyFile.contains[subphrase].hasOwnProperty("reactions") ){
                        for ( let reaction of replyFile.contains[subphrase].reactions ){
                            await msg.react(reaction);
                        }
                    }
                    if ( replyFile.contains[subphrase].hasOwnProperty("reply") ){
                        let directed = true;
                        if ( replyFile.contains[subphrase].hasOwnProperty("directed") )
                            { directed = replyFile.contains[subphrase].directed; }
                        if ( directed )
                            { await msg.reply(replyFile.contains[subphrase].reply); }
                        else 
                            { await msg.channel.send(replyFile.contains[subphrase].reply); }
                    }
                }
            }
        }
    }
}
















function onReady (){
    //console.log(client);
    //utils.change_status(client, 'idle', configs.startupStatusText).catch();
    process.title = `${client.user.tag}  [${package.name}]   version -- ${package.version}`;

    console.log(`\nLogged in as ${client.user.tag}!`);
    globals.bot_id = client.user.id;
    console.log("  bot client id: "+globals["bot_id"]); //bot_id);
    console.log("  -- use the '--help' or '--commands' command for info");
    //globals["busy"] = false;

    console.log("\nBot Ready\n    "+utils.getDateTimeString(globals)+"\n\n"); 
    botEventEmitter.emit('botReady');
}
async function onMessage (msg) {        
    if (msg.content === 'ping')
        msg.reply('pong\ni see ping, i send pong!');

    else if ( !msg.guild || !(msg.channel instanceof Discord.TextChannel) ) return; //ignore DMs unless basic 'ping'

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
function onRateLimit (rateLimitInfo){
    console.log("<< Request rate limited for "+(rateLimitInfo.timeout/1000.0)+"s >>");
}

function onShardReady (id, unavailableGuilds){
    console.log("<< Shard "+id+" ready >>"+ (unavailableGuilds ? "\nUnavailable servers (id): "+unavailableGuilds: ""));
    utils.change_status(client, 'idle', configs.startupStatusText).catch(err => utils.botLogs(globals, err));
}
function onShardReconnecting (id){
    console.log("<< Shard "+id+" reconnecting... >>");
}
function onShardResume (id, replayedEvents){
    console.log("<< Shard "+id+" connection resumed; "+replayedEvents+" events replaying >>");
    //utils.change_status(client, 'idle', "reconnected shard "+id).catch(err => utils.botLogs(globals, err));
}
function onShardDisconnect (closeEvent, id){
    console.log("<< Shard "+id+" disconnected >>\ncode: "+closeEvent.code+"  (wasClean: "+closeEvent.wasClean+")\nreason: "+closeEvent.reason);
}
function onShardError (error, shardId){
    console.log("<< Shard "+shardId+" encountered an error >>\n");
    console.error(error);
}


function clientSetup (){
    console.log("\nSetting up client event handlers");
    client.once('ready', onReady);
    client.on('message', onMessage);
    client.on('error', onError);
    client.on('rateLimit', onRateLimit);

    client.on('shardReady', onShardReady);
    client.on('shardError', onShardError);
    client.on('shardReconnecting', onShardReconnecting);
    client.on('shardResume', onShardResume);
    client.on('shardDisconnect', onShardDisconnect);

}







async function runStartupFunctions (){
    utils.botLogs(globals, "\nStarting _startup functions");
    if (fs.existsSync(startupPath)) {
        utils.botLogs(globals, "--scanning _startup directory (one layer): ");
        let startup_Dir = fs.readdirSync(startupPath);
        botEventEmitter.emit('botRunningStartup', startup_Dir.length);
        for ( let file of startup_Dir ){
            if ((file === "disabled") ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                let jsFile = require(startupPath+file);
                let filePath = path.normalize(startupPath+file);
                if (filePath.startsWith("..") || filePath.includes("/../") || filePath.includes("\\..\\")) throw new Error("Illegal path;  Path includes upward traversal beyond scope ::   "+startupPath+file);
                let requesters = null;
                if ( globals._requisites.startups.hasOwnProperty(filePath) ){
                    requesters = globals._requisites.startups[filePath];
                    delete globals._requisites.startups[filePath];
                }
                if ( jsFile.hasOwnProperty("func")){
                    utils.botLogs(globals, "    running  \""+file+"\""+ (requesters ? "\n      requested by: [ "+requesters.join(", ")+" ]" : "") );
                    await jsFile.func(globals);
                }
            }
        }
    }
    else 
        utils.botLogs(globals, "--directory not found");

    await runRequisiteStartupFunctions().catch(err => { throw (err) });
    botEventEmitter.emit('botStartupDone');
}
async function runRequisiteStartupFunctions (){
    /** run additional requisite startups **/
    if ( Object.keys(globals._requisites.startups).length > 0 ){
        utils.botLogs(globals, "--running requisite startups");
        let to_delete = [];
        for (let filePath in globals._requisites.startups){
            if (filePath.endsWith('.js')){
                let jsFile = require('./'+filePath);
                let requesters = globals._requisites.startups[filePath];
                let file = path.basename(filePath);
                if ( jsFile.hasOwnProperty("func")){
                    utils.botLogs(globals, "    running  \""+file+"\""+ (requesters ? "\n      requested by: [ "+requesters.join(", ")+" ]" : "") );
                    await jsFile.func(globals);
                    to_delete.push(filePath);
                }
            }
        }
        for (let filePath of to_delete){ //clean up
            delete globals._requisites.startups[filePath];
        }
    }
}



function acquireCommands (){
    utils.botLogs(globals, "\nAcquiring _commands");
    if (fs.existsSync(commandsPath)) {
        utils.botLogs(globals, "--scanning _commands directory: ");
        let commands_Dir = fs.readdirSync(commandsPath);
        botEventEmitter.emit('botAcquiringCommands', commands_Dir.length);
        for ( let file of commands_Dir ){
            if ((file === "disabled") ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                let jsFile = require(commandsPath+file);
                if ( jsFile.hasOwnProperty("func") && jsFile.hasOwnProperty("manual") && jsFile.hasOwnProperty("auth_level") ){
                    jsFile["__filePath"] = commandsPath+file;
                    globals.modularCommands[file.substr(0,file.length-3)] = jsFile; 
                    utils.botLogs(globals, "    \""+file+"\" "+(jsFile.version ? " (v"+jsFile.version+") " : "")+"  included  [Lv."+jsFile.auth_level+"]");
                }
                else utils.botLogs(globals, "    \""+file+"\"  not included");
            }

            else if ( fs.lstatSync(commandsPath+file).isDirectory() ){ //parse 1 layer of directories, but no deeper
                let cmd_inner_dir = file+"/";
                utils.botLogs(globals, "--scanning _commands inner directory ["+cmd_inner_dir+"]: ");
                let commands_Dir_inner = fs.readdirSync(commandsPath+cmd_inner_dir);
                botEventEmitter.emit('botAcquiringCommands', commands_Dir_inner.length);
                for ( let inner_file of commands_Dir_inner ){
                    if ((inner_file === "disabled") ||  (inner_file === "README.txt"))  continue;
                    if (inner_file.endsWith('.js')){
                        let jsFile = require(commandsPath+cmd_inner_dir+inner_file);
                        if ( jsFile.hasOwnProperty("func") && jsFile.hasOwnProperty("manual") && jsFile.hasOwnProperty("auth_level") ){
                            jsFile["__filePath"] = commandsPath+cmd_inner_dir+inner_file;
                            globals.modularCommands[inner_file.substr(0,inner_file.length-3)] = jsFile; 
                            utils.botLogs(globals, "    \""+inner_file+"\" "+(jsFile.version ? " (v"+jsFile.version+") " : "")+"  included  [Lv."+jsFile.auth_level+"]");
                        }
                        else utils.botLogs(globals, "    \""+inner_file+"\"  not included");
                    }
                    else utils.botLogs(globals, "    \""+inner_file+"\"  not included");
                }
            }

            else utils.botLogs(globals, "    \""+file+"\"  not included");
        }
    }
    else utils.botLogs(globals, "--directory not found");

    
    /** acquire list of requisites from each command **/
    for ( let cmd in globals.modularCommands ){
        acquireRequisites( cmd, globals.modularCommands[cmd] );        
    }

    /** search and import requisites from the list **/
    importCommandRequisite();

    botEventEmitter.emit('botAcquiredCommands');
}
function acquireRequisites(cmd, jsFile){
    if ( jsFile.hasOwnProperty("requisites") ){
        if ( jsFile.requisites.hasOwnProperty("commands") ){
            for ( let cmd_req of jsFile.requisites.commands ){
                let filePath = path.normalize( commandsPath + cmd_req );
                if (filePath.startsWith("..") || filePath.includes("/../") || filePath.includes("\\..\\")) throw new Error("Illegal path;  Path includes upward traversal beyond scope ::   "+commandsPath + cmd_req);
                if ( !globals._requisites.commands.hasOwnProperty(filePath) ){
                    globals._requisites.commands[filePath] = [];
                }
                utils.botLogs(globals, "--command ["+cmd+"] required command at file path:  "+filePath);
                globals._requisites.commands[filePath].push(cmd);
            }
        }
        if ( jsFile.requisites.hasOwnProperty("startups") ){
            for ( let start_req of jsFile.requisites.startups ){
                let filePath = path.normalize( startupPath + start_req );
                if (filePath.startsWith("..") || filePath.includes("/../") || filePath.includes("\\..\\")) throw new Error("Illegal path;  Path includes upward traversal beyond scope ::   "+startupPath + start_req);
                if ( !globals._requisites.startups.hasOwnProperty(filePath) ){
                    globals._requisites.startups[filePath] = [];
                }
                utils.botLogs(globals, "--command ["+cmd+"] required startup at file path:  "+filePath);
                globals._requisites.startups[filePath].push(cmd);
            }
        }
    }
}
function importCommandRequisite(){
    //as imported, check imports for new requisites and add to list
    utils.botLogs(globals, "--importing requisite commands");
    let commands_to_import = Object.keys(globals._requisites.commands);
    while ( commands_to_import.length > 0 ){
        let filePath = commands_to_import[0];
        let requesters = globals._requisites.commands[filePath];
        let commandName = path.basename(filePath, ".js");
        if ( globals.modularCommands.hasOwnProperty(commandName) ){
            utils.botLogs(globals, "--requisite command ["+commandName+"] already found in command list\n----requested file path: ["+filePath+"]\n----requesters: ["+requesters+"]");
            delete globals._requisites.commands[filePath];
        }
        else { //not yet imported
            utils.botLogs(globals, "--importing ["+commandName+"] via path: "+filePath);
            globals.modularCommands[commandName] = require('./'+filePath);
            globals.modularCommands[commandName]["__filePath"] = './'+filePath;
            delete globals._requisites.commands[filePath];
            acquireRequisites(commandName, globals.modularCommands[commandName]);
        }
        commands_to_import = Object.keys(globals._requisites.commands);
    }
}
function acquireReactables (){
    utils.botLogs(globals, "\nAcquiring _reactables");
    if (fs.existsSync(reactablesPath)) {
        utils.botLogs(globals, "--scanning _reactables directory: ");
        let reactables_Dir = fs.readdirSync(reactablesPath);
        botEventEmitter.emit('botAcquiringCommands', reactables_Dir.length);
        for ( let file of reactables_Dir ){
            if ((file === "disabled") ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                let jsFile = require(reactablesPath+file);
                if (jsFile.hasOwnProperty("exact") || jsFile.hasOwnProperty("contains")){ 
                    for (let elem in jsFile.exact){ //fix reaction by removing any < or >
                        if (jsFile.exact[elem].hasOwnProperty('reactions')) 
                            jsFile.exact[elem].reactions = jsFile.exact[elem].reactions.map(react => react.replace("<","").replace(">",""));
                    }
                    for (let elem in jsFile.contains){ //fix reaction by removing any < or >
                        if (jsFile.contains[elem].hasOwnProperty('reactions')) 
                            jsFile.contains[elem].reactions = jsFile.contains[elem].reactions.map(react => react.replace("<","").replace(">",""));
                    }
                    jsFile["__filePath"] = reactablesPath+file;//store the orgin path
                    globals.modularReactables[file.substr(0,file.length-3)] = jsFile; 
                    utils.botLogs(globals, "    \""+file+"\" included");
                }
                else  utils.botLogs(globals, "    \""+file+"\" not included");
            }
            else  utils.botLogs(globals, "    \""+file+"\" not included");
        }
    }
    else  utils.botLogs(globals, "--directory not found");
    botEventEmitter.emit('botAcquiredReactables');
}




async function logInterval(globals){
    try{
        await utils.acquire_work_lock(globals, "log_newfile");
        botEventEmitter.emit('botLogNewFile_start');
        
        let date = utils.getDateTime(globals);
        let oldLogsFileName = globals.logsFileName;
        let newLogsFileName = "LOGS_"+date.toISO()+".txt";
        newLogsFileName = newLogsFileName.replace(/-/g,"_");
        newLogsFileName = newLogsFileName.replace(/:/g,"-");
        globals["logsFileName"] = newLogsFileName;
        fs.appendFileSync(logsPath+oldLogsFileName, "\n\nSwitching to new logs file with name:  "+newLogsFileName);
        fs.writeFileSync(logsPath+newLogsFileName, "\n\n\n\n\n["+package.name+"]\nCreating new logs file  ["+newLogsFileName+"]\n    "+utils.getDateTimeString(globals)+"\n\n\n\n");
        console.log("\nLogs File Name:  "+globals.logsFileName+"\n");
    }
    catch (err){
        utils.botLogs(globals,"## ERR occurred during 24hour new logs file interval ::  "+err);
    }
    finally {
        if (globals.busy)
            utils.release_work_lock(globals, "log_newfile");
        botEventEmitter.emit('botLogNewFile_end');
    }
}
async function logTimeout(globals){
    try{
        await utils.acquire_work_lock(globals, "log_daily");
        botEventEmitter.emit('botLogDaily_start');
        
        let day = utils.getDate(globals);
        let oldLogsFileName = globals.logsFileName;
        let newLogsFileName = `LOGS_${day}.txt`;
        globals["logsFileName"] = newLogsFileName;
        fs.appendFileSync(logsPath+oldLogsFileName, "\n\nSwitching to new daily logs file with name:  "+newLogsFileName);
        fs.writeFileSync(logsPath+newLogsFileName, "\n\n\n\n\n["+package.name+"]\nCreating new daily logs file  ["+newLogsFileName+"]\n    "+utils.getDateTimeString(globals)+"\n\n\n\n");
        console.log("\nLogs File Name:  "+globals.logsFileName+"\n");
        
        //setup next timeout
        let dateTime = utils.getDateTime(globals);
        let secondsTillNextDay = (24*60*60) - ((dateTime.hour*60*60) + (dateTime.minute*60) + dateTime.second); //should be nearly 24hour
        let log_timeout = setTimeout(logTimeout,(secondsTillNextDay*1000)+60000, globals);
        globals.timeouts["botLogs"] = log_timeout;
    }
    catch (err){
        utils.botLogs(globals,"## ERR occurred during daily logs file timeout ::  "+err);
    }
    finally {
        if (globals.busy)
            utils.release_work_lock(globals, "log_daily");
        botEventEmitter.emit('botLogDaily_end');
    }
}

function setupLogs (){
    botEventEmitter.emit('botLogsSetup');
    
    //clear any existing intervals or timeouts
    if (globals.intervals.hasOwnProperty("botLogs")) clearInterval(globals.intervals["botLogs"]);
    if (globals.timeouts.hasOwnProperty("botLogs")) clearTimeout(globals.timeouts["botLogs"]);

    if ((configs.logsFileMode !== "none") || (configs.logsFileMode !== "")){
        console.log("\nlogsFileMode:  "+configs.logsFileMode);
        if (!fs.existsSync(logsPath)){
            console.log("--creating ["+logsPath+"] dir(s)");
            fs.mkdirSync(logsPath, { recursive: true });
        }
    
        globals["LogsToFile"] = true;
        if (configs.logsFileMode === "daily"){ // 1 file per day
            let day = utils.getDate(globals);
            //console.log("DEBUG day: "+day);
            let fileName = `LOGS_${day}.txt`;
            globals["logsFileName"] = fileName;
            let dateTime = utils.getDateTime(globals);
            let secondsTillNextDay = (24*60*60) - ((dateTime.hour*60*60) + (dateTime.minute*60) + dateTime.second);
            //console.log("DEBUG till next day: "+secondsTillNextDay);
            let log_timeout = setTimeout(logTimeout,(secondsTillNextDay*1000)+60000, globals);
            globals.timeouts["botLogs"] = log_timeout;
            //if file exists, append otherwise create
            if (fs.existsSync(logsPath+globals.logsFileName)){
                console.log("----daily log exists: appending");
                fs.appendFileSync(logsPath+globals.logsFileName, "\n\n\n\ndaily log\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
            }
            else {
                console.log("----creating daily log");
                fs.writeFileSync(logsPath+globals.logsFileName, "\n\n\n\ndaily log\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
            }
        }
        else if (configs.logsFileMode === "newfile"){ //setup 24hour interval to renew name and make new file
            let date = utils.getDateTime(globals);
            let fileName = "LOGS_"+date.toISO()+".txt";
            fileName = fileName.replace(/-/g,"_");
            fileName = fileName.replace(/:/g,"-");
            globals["logsFileName"] = fileName;
            let log_interval = setInterval(logInterval, 24*60*60*1000, globals);
            globals.intervals["botLogs"] = log_interval;
            fs.writeFileSync(logsPath+globals.logsFileName, "\n\n\n\nnewfile log\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
        }
        else if (configs.logsFile === "overwrite"){
            fs.writeFileSync(logsPath+globals.logsFileName, "\n\n\n\noverwrite log\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
        }
        else {
            if (configs.logsFile !== "append"){
                console.log("--invalid logsFileMode; defaulting to [append] mode"); //deprec
            }
            fs.appendFileSync(logsPath+globals.logsFileName, "\n\n\n\n\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
        }
    }
    else globals["LogsToFile"] = false;
    if ( globals.LogsToFile != false ) console.log("\nLogs File Name:  "+globals.logsFileName+"\n");

    botEventEmitter.emit('botLogsReady');
}





function checkBotAlreadyOnline (){ 
    //doesn't seem like it can be done, at least not easily :<
    return false;
}






function acquireConfigs (){ 
    
    if (!fs.existsSync(configsPath)){
        console.log("invalid configs path");
        throw ("configs not found on path ["+configsPath+"]");
    }
    configs = require(configsPath);
    delete require.cache[require.resolve(configsPath)]; //prevent configs caching
    botEventEmitter.emit('botVerifyConfigs');
    console.log("\nParsing configs.json");
    let invalid = false;
    let missing = [];
    let incorrect = [];
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
        for (let built_in of blocking_built_in_funcs){
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

    //default UTC
    if ( !configs.hasOwnProperty("IANAZoneTime") ){ missing.push("IANAZoneTime (default Etc/UTC)"); configs["IANAZoneTime"] = "Etc/UTC"; }
    else if ( typeof configs.IANAZoneTime !== "string" ){ incorrect.push("IANAZoneTime (default Etc/UTC)"); configs["IANAZoneTime"] = "Etc/UTC"; }
    else if ( !DateTime.local().setZone(configs.IANAZoneTime).isValid ){ incorrect.push("IANAZoneTime (default Etc/UTC)"); configs["IANAZoneTime"] = "Etc/UTC"; }

    //default newfile
    if ( !configs.hasOwnProperty("logsFileMode") ){ missing.push("logsFileMode (default newfile)"); configs["logsFileMode"] = "newfile"; }
    else if ( configs.logsFileMode !== "append" && configs.logsFileMode !== "daily" && configs.logsFileMode !== "newfile" && configs.logsFileMode !== "overwrite" && configs.logsFileMode !== "none" ){ incorrect.push("logsFileMode (default newfile)"); configs["logsFileMode"] = "newfile"; }

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


async function initializeClient (){
    console.log("\nInitializing client");
    clientSetup();

    await runStartupFunctions();

    botEventEmitter.emit('botLogin');
    console.log("\nLogging in to client via token");
    client.login(require(configs.DiscordAuthFilePath).token)
    .catch(err => {console.log("--ERROR [LOGIN] ::  "+err); throw new Error("\nError occurred during login");});
}


async function init (press_enter_to_exit){
    if (!client) client = new Discord.Client({
        ws: { intents: [
            'GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS',
            'GUILD_EMOJIS', 'GUILD_INVITES', 'GUILD_VOICE_STATES',
            'GUILD_PRESENCES', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS',
            'DIRECT_MESSAGES'
        ] }
        /*,fetchAllMembers: true*/
    });
    console.log("\n\n["+package.name+"]   version -- "+package.version+"\n");
    process.title = "["+package.name+"]   version -- "+package.version;
    
    if (press_enter_to_exit !== undefined) initArg = press_enter_to_exit;
    else if (press_enter_to_exit === undefined) press_enter_to_exit = initArg;
    
    try{
        clearGlobals();
        globals["client"] = client;
        globals["bot_id"] = null; //set on ready
        globals["busy"] = false; 
        globals["logsPath"] = logsPath;
        globals["logsFileName"] = "LOGS.txt"; //default
        globals["__awaitLogs"] = {"content":null, "timeout":null, "init_time":null, "wait_time":0};
        globals["intervals"] = {};
        globals["timeouts"] = {}; //may contain arrays of timeouts
        globals["modularCommands"] = {};
        globals["modularReactables"] = {}; 
        globals["blocking_built_in_funcs"] = blocking_built_in_funcs;
        globals["nonblocking_built_in_funcs"] = nonblocking_built_in_funcs;
        globals["queueLength"] = 0;
        globals["botEventEmitter"] = botEventEmitter;
        globals["_shutdown"] = {}; //add functions (params: (globals)) to run on shutdown
        globals["_requisites"] = {
            "commands" : {/*"example_req_command": ["requester_cmd_1", ...] ...*/},
            "startups" : {/*"normalized_path/fileName.js": ["requester_1, ..."] ...*/}
        };
        await utils.util_startup(globals);
        acquireConfigs();
        setupLogs();
        acquireCommands();
        acquireReactables();
        await initializeClient();
        await new Promise(resolve => botEventEmitter.once('botReady', resolve));
    }
    catch (err){
        console.log(err);
        if (press_enter_to_exit)  await enterToExit();
        process.exit();
    }    
}



async function shutdown (){
    if (!globals) process.exit();

    utils.botLogs(globals, "Shutdown requested\n--destroying existing intervals and timeouts");
    for (let _timeout in globals.timeouts){
        let timeout = globals.timeouts[_timeout];
        if (Array.isArray(timeout)){
            for (let t of timeout){
                clearTimeout(t);
            }
        }
        else  clearTimeout(timeout);
    }
    for (let interval_name in globals.intervals){
        clearInterval(globals.intervals[interval_name]);
    }
    utils.botLogs(globals, "--running _shutdown commands")
    if (globals._shutdown){
        botEventEmitter.emit('botRunningShutdown', globals._shutdown.length);
        for (let shutdown_src in globals._shutdown){
            let shutdown_funcs = globals._shutdown[shutdown_src];
            for (let shutdown_func of shutdown_funcs){
                try{ await shutdown_func(globals); }
                catch(err){ console.log("----error ::   "+err.stack); console.error(err); }
            }
        }
    }
    await utils.util_shutdown(globals);
    botEventEmitter.emit('botShutdownDone');
    try { 
        //client.off('ready', onReady);
        client.off('message', onMessage);
        client.off('error', onError);
        client.off('rateLimit', onRateLimit);
        client.off('shardReady', onShardReady);
        client.off('shardError', onShardError);
        client.off('shardReconnecting', onShardReconnecting);
        client.off('shardResume', onShardResume);
        client.off('shardDisconnect', onShardDisconnect);
        client.destroy(); 
    }
    catch (err){ utils.botLogs(globals, "ERROR when destroying client\n"+err); }
    utils.botLogs(globals,"Bot Shutdown\n    "+utils.getDateTimeString(globals)+"\n");
    botEventEmitter.emit('botExit');
    clearGlobals();
}



async function restart (){
    if (globals) {
        await shutdown();
        console.log("\n\n\nRestarting\n\n\n");
    }
    await init();
}



async function soft_restart (msg){
    //dont destroy the client, but shutdown and init (if msg provided, return reply on failure)
    botEventEmitter.emit('botSoftRestart0');
    utils.botLogs(globals, "Soft restart requested\n--destroying existing intervals and timeouts");
    for (let _timeout in globals.timeouts){
        let timeout = globals.timeouts[_timeout];
        if (Array.isArray(timeout)){
            for (let t of timeout){
                clearTimeout(t);
            }
        }
        else  clearTimeout(timeout);
    }
    for (let interval_name in globals.intervals){
        clearInterval(globals.intervals[interval_name]);
    }
    utils.botLogs(globals, "--running _shutdown commands")
    if (globals._shutdown){
        botEventEmitter.emit('botRunningShutdown', globals._shutdown.length);
        for (let shutdown_src in globals._shutdown){
            let shutdown_funcs = globals._shutdown[shutdown_src];
            for (let shutdown_func of shutdown_funcs){
                try{ await shutdown_func(globals); }
                catch(err){ console.log("----error ::   "+err.stack); console.error(err); }
            }
        }
    }
    await utils.util_shutdown(globals);
    botEventEmitter.emit('botShutdownDone');
    let temp_globals = globals;
    clearGlobals(); 
    botEventEmitter.emit('botSoftRestart1');
    
    let press_enter_to_exit = initArg;
    try{
        globals["client"] = client;
        globals["bot_id"] = temp_globals.bot_id;
        globals["busy"] = temp_globals.busy;
        globals["logsPath"] = logsPath;
        globals["logsFileName"] = temp_globals.logsFileName;
        globals["__awaitLogs"] = {"content":null, "timeout":null, "init_time":null, "wait_time":0};
        globals["intervals"] = {};
        globals["timeouts"] = {}; //may contain arrays of timeouts
        globals["modularCommands"] = {};
        globals["modularReactables"] = {}; 
        globals["blocking_built_in_funcs"] = blocking_built_in_funcs;
        globals["nonblocking_built_in_funcs"] = nonblocking_built_in_funcs;
        globals["queueLength"] = temp_globals.queueLength;
        globals["botEventEmitter"] = botEventEmitter;
        globals["_shutdown"] = {}; //add functions (params: (globals)) to run on shutdown
        globals["_requisites"] = {
            "commands" : {/*"example_req_command": ["requester_cmd_1", ...] ...*/},
            "startups" : {/*"normalized_path/fileName.js": ["requester_1, ..."] ...*/}
        };
        await utils.util_startup(globals);
        acquireConfigs();
        setupLogs();
        acquireCommands();
        acquireReactables();
        await runStartupFunctions();
        botEventEmitter.emit('botSoftRestart2');
    }
    catch (err){
        console.log(err);
        if (msg) {
            msg.react('❌');
            msg.reply("An error occured during restart, bot will shutdown.  Please contact sys-admin");
        }
        if (press_enter_to_exit)  await enterToExit();
        process.exit();
    }
}



let exitCount = 0;
function set_exit_handler (){
    if (process.platform === "win32") {
        let rl = require("readline").createInterface({
          input: process.stdin,
          output: process.stdout
        });
      
        rl.on("SIGINT", function () {
          process.emit("SIGINT");
        });
    }
      
    process.on("SIGINT", async function () {
        exitCount++;
        if (exitCount == 5){
            console.log("FORCING EXIT");
            process.exit(); //force exit
        }
        if (exitCount > 1){
            console.log("\nRepeat EXIT another "+(5-exitCount)+" times to force close\n");
            return;
        }
        console.log('\n\nProcess interrupted [SIGINT]\n\n');
        await shutdown();
        //console.log("\n\nProcess will exit in 3 seconds.\n\n");
        //await utils.sleep(3000);
        process.exit();
    });
    process.on('SIGHUP', async function() {
        exitCount++;
        if (exitCount == 5){
            console.log("FORCING EXIT");
            process.exit(); //force exit
        }
        if (exitCount > 1){
            console.log("\nRepeat EXIT another "+(5-exitCount)+" times to force close\n");
            return;
        }
        console.log('\n\nWindow about to close [SIGHUP]\n\n');
        await shutdown();
        console.log("\n\nWindow will close in 5 seconds.\n\n");
        await utils.sleep(5000);
        process.exit();
    });
    process.on('SIGTERM', async function() { 
        exitCount++;
        if (exitCount == 5){
            console.log("FORCING EXIT");
            process.exit(); //force exit
        }
        if (exitCount > 1){
            console.log("\nRepeat EXIT another "+(5-exitCount)+" times to force close\n");
            return;
        }
        console.log('\n\nProcess about to terminate [SIGTERM]\n\n');
        await shutdown();
        process.exit();
    });
}


function enterToExit () {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question("Press Enter to exit.", _ => {
        console.log("EXITING");
        rl.close();
        resolve();
        //process.exit();
    }));
}



function clearGlobals (){
    for (let key in globals) {
        delete globals[key];
    }
}
function getGlobals (){ //should get on botReady if needed
    return globals;
}



//set_exit_handler();
//init(); 

module.exports = {
    init, 
    restart,
    soft_restart,
    shutdown,
    set_exit_handler,
    commandHandler,
    getGlobals,
    botEventEmitter
}



