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

const logsPath = "logs/"; //should end with '/'

const package = require('./package.json');

const Discord = require('discord.js');
//const client = new Discord.Client();
const { promisify } = require('util');


const token = require('./auth.json').token;
const configs = require('./configs.json');
const prefix = configs.prefix;
const googleEnabled = configs.googleEnabled;


const utils = require('./utils.js');
const fs = require('fs'); 
const EventEmitter = require('events');
const luxon = require('luxon');
const reactroles_functions = require('./ReactRoles.js');
const condroles_functions = require('./ConditionedRoles.js');
const dump_functions = require('./DocumentDump.js');

if (googleEnabled) {
    require("./googleClientSecret.json"); //fixed name
    require('google-spreadsheet');
}




var globals = {};
var reactroles = {};
globals["client"] = null; //set in initializeClient
globals["doc"] = null; //set in connectGoogle
globals["bot_id"] = null; //set on ready
globals["busy"] = true;
globals["configs"] = configs;
globals["logsPath"] = logsPath;
globals["logsFileName"] = "LOGS.txt"; //default
globals["timers"] = [];
globals["luxon"] = luxon;
globals["reactroles"] = reactroles;
globals["modularFunctions"] = {};
globals["modularReplies"] = {}; 


/*for (customCommand of configs.modularFunctions){
    globals.modularFunctions[customCommand] = require("./modularFunctions/"+customCommand+".js");
}*/

//console.log("modularFuncs");
fs.readdirSync("./modularFunctions").forEach(file => {
    //console.log("--  "+file);
    if (file.endsWith('.js')){
        var jsFile = require("./modularFunctions/"+file);
        if (jsFile.hasOwnProperty("func") && jsFile.hasOwnProperty("manual")){
            globals.modularFunctions[file.substr(0,file.length-3)] = jsFile; 
            //console.log("----included");
        }
        //else console.log("----not included");
    }
    //else console.log("----not included");
});

//console.log("modularReplies");
fs.readdirSync("./modularReply").forEach(file => {
    //console.log("--  "+file);
    if (file.endsWith('.js')){
        var jsFile = require("./modularReply/"+file);
        if (jsFile.hasOwnProperty("replies") || jsFile.hasOwnProperty("contains")){
            globals.modularReplies[file.substr(0,file.length-3)] = jsFile; 
            //console.log("----included");
        }
        //else console.log("----not included");
    }
    //else console.log("----not included");
});




const workLockEmitter = new EventEmitter();
globals["workLockEmitter"] = workLockEmitter;



async function logInterval(globals){
    try{
        //check if busy, if so wait till free
        while (globals.busy) {
            utils.botLogs(globals,"* work lock still active, waiting for unlock to fufill log newfile *");
            await new Promise(resolve => workLockEmitter.once('unlocked', resolve));
        }
        utils.work_Lock(globals);
        utils.botLogs(globals,"* obtaining work lock for log newfile *");

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
        if (globals.busy){
            utils.botLogs(globals,"* releasing work lock for log newfile *");
            utils.work_Unlock(globals);
        }
    }
}

function setupLogs(){
    if ((configs.logsFileMode !== "none") || (configs.logsFileMode !== "")){
        console.log("--logsFileMode:  "+configs.logsFileMode);
        if (!fs.existsSync(logsPath)){
            console.log("----creating ["+logsPath+"] dir(s)");
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
            fs.writeFileSync(logsPath+globals.logsFileName, "\n\n\n\n\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\n\n\n\n");
        }
        else if (configs.logsFile === "overwrite"){
            fs.writeFileSync(logsPath+globals.logsFileName, "\n\n\n\n\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\n\n\n\n");
        }
        else {
            if (configs.logsFile !== "append"){
                console.log("--invalid logsFileMode; defaulting to [append] mode");
            }
            fs.appendFileSync(logsPath+globals.logsFileName, "\n\n\n\n\n["+package.name+"] started "+utils.getDateTimeString(globals)+"\n\n\n\n");
        }
        fs.appendFileSync(logsPath+globals.logsFileName, "--logsFileMode:  "+configs.logsFileMode);
    }
    else globals["LogsToFile"] = false;
}




function clientSetup(){
    console.log("Setting up client event handlers");
    client.on('ready', () => {
        //console.log(client);
        utils.change_status(client, 'idle', configs.startupStatusText).catch();

        console.log(`Logged in as ${client.user.tag}!`);
        globals.bot_id = client.user.id;
        console.log("  bot client id: "+globals["bot_id"]); //bot_id);
        console.log("  -- use the '--help' or '--commands' command for info");
        botReady = true;
        if (consoleGap && (botReady && googleDone && loginDone)) { consoleGap = false; console.log("\n\n\n"); }
        globals["busy"] = false;
    });


    client.on('message', async (msg) => {
        //console.log(msg);
        
        if (msg.content === 'ping') {
            if (!globals.busy){ //MAYBE consider simplifying
                msg.member.fetch()
                .then(member => {
                    if (configs.authorizedRoles.length > 0)
                        if (checkMemberAuthorized(member, false)){
                            utils.botLogs(globals,'\n\ni ponged, i big bot now!');
                            utils.work_Lock(globals);
                            msg.reply('pong\ni see ping, i send pong!');
                            utils.status_blink(globals).then(_ => { utils.botLogs(globals,  "ping --blink done"); utils.work_Unlock(globals); });
                        }
                })
                .catch(err => { utils.botLogs(globals,"## Err in member fetch [ping] ::  "+err); utils.work_Unlock(globals); });   
            }
        } 
        
        //to get emotes post "\:emote:" and copy the resulting unicode char
        if (msg.content === '👍') 
            msg.react('👍');

        else if (msg.content.toLowerCase() === 'ook')
            msg.react('🍌');

        else if (msg.content === "┬─┬ノ(ಠ_ಠノ)")
            msg.channel.send("(╯°Д°）╯︵ /(.□ . \\\\)  ┻━┻");


        
        
        /*** bot commands ***/
        else if (msg.content.startsWith(prefix)) {
            msg.member.fetch()
            .then(member => {
                //there is a role restriction
                if (configs.authorizedRoles.length > 0){
                    if (checkMemberAuthorized(member, true))
                        handleRequest(msg, member);
                }

                // no role restrictions
                else handleRequest(msg, member);
            })
            .catch(err => { 
                console.logs(globals,"## ERR during member fetch [command] ::  "+err); 
                msg.reply("An error occurred ::  "+err);
            });
        }

        
        else {
            for (_replyFile in globals.modularReplies){
                var replyFile = globals.modularReplies[_replyFile];
                if (replyFile.hasOwnProperty("replies")){
                    if (replyFile.replies.hasOwnProperty(msg.content)){
                        if (replyFile.replies[msg.content].hasOwnProperty("reply")){
                            var directed = true;
                            if (replyFile.replies[msg.content].hasOwnProperty("directed"))
                                directed = replyFile.replies[msg.content].directed;
                            if (directed)
                                await msg.reply(replyFile.replies[msg.content].reply);
                            else 
                                await msg.channel.send(replyFile.replies[msg.content].reply);
                        }
                        if (replyFile.replies[msg.content].hasOwnProperty('reactions')){
                            for (reaction of replyFile.replies[msg.content].reactions){
                                await msg.react(reaction);
                            }
                        }
                        return; //if msg.content in replies then no need to check contains
                    }
                }

                if (replyFile.hasOwnProperty("contains")){
                    for (subphrase in replyFile.contains){
                        if (msg.content.includes(subphrase)){
                            if (replyFile.contains[subphrase].hasOwnProperty("reply")){
                                var directed = true;
                                if (replyFile.contains[subphrase].hasOwnProperty("directed"))
                                    directed = replyFile.contains[subphrase].directed;
                                if (directed)
                                    await msg.reply(replyFile.contains[subphrase].reply);
                                else 
                                    await msg.channel.send(replyFile.contains[subphrase].reply);
                            }
                            if (replyFile.contains[subphrase].hasOwnProperty('reactions')){
                                for (reaction of replyFile.contains[subphrase].reactions){
                                    await msg.react(reaction);
                                }
                            }
                        }
                    }
                }
            }
        }


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


function checkMemberAuthorized(member, printlog){
    if(!printlog) printlog = false;
    var authorizedRole = null;
    var isAuthorized = false;
    for (roleID of configs.authorizedRoles){
        //check if any is authorized
        var hasRole = member.roles.cache.has(roleID);
        isAuthorized = isAuthorized || hasRole; //if member has any authorized role, then they can use commands
        if (hasRole) authorizedRole = member.roles.cache.get(roleID);
    }
    if (isAuthorized) {
        if (printlog && !globals.busy) 
            utils.botLogs(globals,"\n\n\n-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] has permission to use commands through the ["+authorizedRole.name+":"+authorizedRole.id+"] role");
        return true;
    }
    else {
        if (printlog && !globals.busy)
            utils.botLogs(globals,"\n\n\n-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] doesn't have permission to use commands");
        return false;
    }
}


function handleRequest(msg, member){
    var requestBody = msg.content.substring(prefix.length);
    if (requestBody.includes(' ')){
        var command = requestBody.substr(0,requestBody.indexOf(' '));
        var content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
    }
    else {
        var command = requestBody.trim();
        var content = "{}";
    }

    if (!globals.busy)
        utils.botLogs(globals,"\nrequestBody:: "+requestBody+"\n__command:: "+command+"\n__content:: "+content);

    commandHandler(msg, member, command, content, false); 
}


function commandHandler(msg, member, command, content, isRepeat){
    //console.log("isRepeat? "+isRepeat);

    if (command === '--version'){
        utils.botLogs(globals,"\nreceived version query\n["+package.name+"]   version -- "+package.version+"\n\n"); 
        msg.reply("["+package.name+"]   version -- "+package.version); 
        return;
    }




    //commands lower than this block further requests and set status to busy

    if (globals.busy){
        msg.react('❌');
        msg.reply("I'm currently busy working on something.  Please try again later");
        return;
    }
    else { //request received
        msg.react('👌');
    }

    utils.work_Lock(globals);
    utils.change_status(client, 'dnd', "[working for "+member.displayName+"#"+member.user.discriminator+"]")
    .then(_ => {
        try{

            /* Display a post with all available commands */
            if (command === '--help' || command === '--commands'){
                utils.botLogs(globals,"received request [help] or [commands]");
                utils.botLogs(globals,"received request [help] or [commands]");
                var reply = "The bot built-in commands are as follows, \n"+
                ".  ***commandName  ->  arguments*** \n"+
                ".    any quotation marks, curly brackets, or square brackets are necessary are necessary\n"+
                ".    `...` (ellipsis) implies that you can input more than one\n"+
                ".    encapsulating with `<` and `>` like `\"< args >\"` implies the argument is optional\n"+
                //".    encapsulating with single quotations like `\'(args)\'` implies the argument is what is mentioned.\n"+
                ".    do not include elipses, <, >, or single quotations in the command \n"+
                ".    do not use double quotations in a key value pair as it is used to encapsulate the key or value;  instead use single quotations or escaped double quotations for example, for example\n"+
                ".    `{\"message\": \"i quote, \"something\" and it failed :<\"}`\n"+
                ".    `{\"message\": \"i quote, 'something' and it succeeded :>\"}`\n"+
                ".    `{\"message\": \"i quote, \\\"something\\\" and it succeeded :>\"}`\n"+
                "================================";
            var reply2 = "" +
                //"**--**  ->  ``\n" +
                //".     *description* \n" +
                //"- - - - - - - - - \n"+
                "**--shutdown**  ->  \*none\*\n" +
                ".     * close all listening instances of the discord bot* \n" +
                "- - - - - - - - - ";
            var reply3 = "" +
                "**--create-reactrole-any**  ->  `{\"message\": \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }` \n" +
                ".     *Create a post with reactions that will assign roles like checkboxes.  Each reaction can freely assign/remove a role.  However newlines must be entered as \\n.* \n" +
                "*--create-reactrole-any*  ->  `{\"reactions\": {\"emote\": \"roleName\" ,  ...} } --+o+--MessageText--+o+-- '`message_to_post`'` \n" +
                ".     *Similar to above, but the message if parsed separately, so literal newlines can be used. (no need for \\n)* \n" +
                "- - - - - - - - - \n"+
                "**--create-reactrole-switch**  ->  `{\"message\": \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }` \n" +
                ".     *Create a post with reactions that will assign roles like a radio button (switching logic).  Only one reaction at a time, reacting to any others in this group will result in removal of the existing role and reaction then adding the new role (react on B removes role A and react on A, then gives role B)* \n" +
                "*--create-reactrole-switch*  ->  `{\"reactions\": {\"emote\": \"roleName\" ,  ...} } --+o+--MessageText--+o+-- '`message_to_post`'` \n" +
                ".     *Similar to above, but the message if parsed separately, so literal newlines can be used. (no need for \\n)* \n" +
                "- - - - - - - - - ";
            var reply4 = "" +
                "**--give-role-conditioned**  ->  `{\"give-role\": [\"roleName\", ...] <, \"target\": \"roleName\"> <,  \"has-role\": [\"roleName\", ...]> <,  \"missing-role\": [\"roleName\", ...]>  }` \n" +
                ".     *Give role(s) to a user in the server if they have or doesn't have some role.  If a target role is given then it will only look at the list of users who have that role.  Must give at least one \"give-role\", but \"has-role\" and \"missing-role\" are optional. Give a target role for better performance.*  \n" +
                "- - - - - - - - - \n"+
                "**--give-role-conditioned2**  ->  `{\"give-role\": [\"roleName\", ...] <, \"target\": \"roleName\"> <,  \"missing-role\": [[\"group1role\", ...], [\"group2role\", ...], ...]> }` \n" +
                ".     *Similar to the prior, but checks if the member is missing at least* ***one*** *role from each role-group from 'missing-role'*  \n" +
                "- - - - - - - - - \n"+
                "**--remove-role-conditioned**  ->  `{\"remove-role\": [\"roleName\", ...] <, \"target\": \"roleName\"> <,  \"has-role\": [\"roleName\", ...]> <,  \"missing-role\": [\"roleName\", ...]>  }` \n" +
                ".     *Remove role(s) from a user in the server if they have or doesn't have some role.  If a target role is given then it will only look at the list of users who have that role.  Must give at least one \"remove-role\", but \"has-role\" and \"missing-role\" are optional. Give a target role for better performance.*  \n" +
                "- - - - - - - - - \n"+
                "**--remove-role-conditioned2**  ->  `{\"remove-role\": [\"roleName\", ...] <, \"target\": \"roleName\"> <,  \"has-role\": [[\"group1role\", ...], [\"group2role\", ...], ...]> }` \n" +
                ".     *Similar to the prior, but checks if the member has at least* ***one*** *role from each role-group from 'has-role'*  \n" +
                "- - - - - - - - - \n";
            var reply5 = "" +
                "**--document-reacts**  ->  `message_link` \n" +
                ".     *Dumps the reaction information of a specified post (via message link) into a specified google sheet* \n" +
                "- - - - - - - - - \n"+
                "**--document-reacts2**  ->  `message_link` `roleName` \n" +
                ".     *Similar to above but lists all of roleName with true/false values for each reaction and another column for no reaction.  A role must be specified* \n" +
                "- - - - - - - - - \n"+
                "**--document-reacts3**  ->  `message_link` `roleName` \n" +
                ".     *Similar to v2 but instead lists names for each reaction column.  A role must be specified* \n" +
                "- - - - - - - - - \n";
                var reply6 = "" +
                "**--document-voice**  ->  `channel_id` \n" +
                ".     *Dumps the member information (names) that are in a specified voice channel (via ID) into a specified google sheet* \n" +
                "- - - - - - - - - \n"+
                "**--document-voice2**  ->  `channel_id` `roleName` \n" +
                ".     *Similar to above but lists all of roleName with true/false values for voice channel participation.  A role must be specified* \n" +
                "- - - - - - - - - \n"+
                "**--document-voice3**  ->  `channel_id` `roleName` \n" +
                ".     *Similar to v2 instead lists names for participation or not.  A role must be specified* \n" +
                "- - - - - - - - - ";
                //TODO repeat events for schedule,  maybe --schedule-repeat {time} --*event to repeat* *event args*
                msg.channel.send(reply);
                msg.channel.send(reply2);
                msg.channel.send(reply3);
                msg.channel.send(reply4);
                msg.channel.send(reply5);
                msg.channel.send(reply6);

                if (configs.modularFunctions.length > 0){
                    msg.channel.send("__\n__\n================================\n"
                        +"---= modular command manual =---\n"
                        +"================================\n__\n__");
                    for (var customCommand of configs.modularFunctions){
                        //obtain from the <command>.js the manual
                        msg.channel.send(globals.modularFunctions[customCommand].manual);
                        msg.channel.send("- - - - - - - - - ");
                    }
                }

                msg.react('✅');
                utils.change_status(client, 'idle', configs.idleStatusText)
                .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                .finally(_ => { utils.work_Unlock(globals); });

            }

            else if (command === '--ping'){
                utils.botLogs(globals,"received request [ping]");
                msg.reply("pong");
                utils.status_blink(globals).then(_ => { utils.botLogs(globals,  "--blink done"); utils.work_Unlock(globals); msg.react('✅'); });
            }

            else if (command === '--sleep'){ //in seconds
                utils.botLogs(globals,"received request [sleep]");
                msg.react('😴');
                msg.react('🛌');
                var sleepTime = parseInt(content)
                if (isNaN(sleepTime) || sleepTime > 30) sleepTime = 10; //max of 30sec
                utils.botLogs(globals,"--sleeping for "+sleepTime+" seconds");
                utils.sleep(sleepTime*1000).then(_ => { 
                    msg.react('😪');
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .then(_ => { msg.react('✅'); })
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* "checkbox" reactions post */
            else if (command === '--create-reactrole-any'){
                utils.botLogs(globals,"received request [create-reactrole-any]");
                msg.reply("received and processing request [create-reactrole-any]");
                reactroles_functions.reactRoles_Any(globals, msg, content, reactroles)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
                //console.log(reactroles);
            }



            /* "radio button" reactions post */
            else if (command === '--create-reactrole-switch'){
                utils.botLogs(globals,"received request [create-reactrole-switch]");
                msg.reply("received and processing request [create-reactrole-switch]");
                reactroles_functions.reactRoles_Switch(globals, msg, content, reactroles)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
                //console.log(reactroles);
            }



            /* give a role if members have certain roles or are missing certain roles */
            else if (command === '--give-role-conditioned'){ //for all users
                utils.botLogs(globals,"received request [give-role-conditioned]");
                msg.reply("received and processing request [give-role-conditioned]");
                condroles_functions.giveRoles(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* remove a role if members have certain roles or are missing certain roles */
            else if (command === '--remove-role-conditioned'){ //for all users
                utils.botLogs(globals,"received request [remove-role-conditioned]");
                msg.reply("received and processing request [remove-role-conditioned]");
                condroles_functions.removeRoles(globals, msg , content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* give a role if members have certain roles or are missing certain roles */
            else if (command === '--give-role-conditioned2'){ //for all users
                utils.botLogs(globals,"received request [give-role-conditioned2]");
                msg.reply("received and processing request [give-role-conditioned2]");
                condroles_functions.giveRoles_v2(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  });
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* remove a role if members have certain roles or are missing certain roles */
            else if (command === '--remove-role-conditioned2'){ //for all users
                utils.botLogs(globals,"received request [remove-role-conditioned2]");
                msg.reply("received and processing request [remove-role-conditioned2]");
                condroles_functions.removeRoles_v2(globals, msg , content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* dump reacts of a post to a doc */
            else if (command === '--document-reacts'){
                utils.botLogs(globals,"received request [document-reacts]");
                msg.reply("received and processing request [document-reacts]");
                if (!googleEnabled){
                    utils.botLogs(globals,"---google not enabled");
                    msg.reply("Google has not been enabled, contact sys-admin to set up");
                    utils.work_Unlock(globals);
                    return;
                }
                dump_functions.documentReactions(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* dump names of members in voice channel to a doc */
            else if (command === '--document-voice'){
                utils.botLogs(globals,"received request [document-voice]");
                msg.reply("received and processing request [document-voice]");
                if (!googleEnabled){
                    utils.botLogs(globals,"---google not enabled");
                    msg.reply("Google has not been enabled, contact sys-admin to set up");
                    utils.work_Unlock(globals);
                    return;
                }
                dump_functions.documentVoice(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* dump reacts of a post to a doc */
            else if (command === '--document-reacts2'){
                utils.botLogs(globals,"received request [document-reacts2]");
                msg.reply("received and processing request [document-reacts2]");
                if (!googleEnabled){
                    utils.botLogs(globals,"---google not enabled");
                    msg.reply("Google has not been enabled, contact sys-admin to set up");
                    utils.work_Unlock(globals);
                    return;
                }
                dump_functions.documentReactions_v2(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* dump names of members in voice channel to a doc */
            else if (command === '--document-voice2'){
                utils.botLogs(globals,"received request [document-voice2]");
                msg.reply("received and processing request [document-voice2]");
                if (!googleEnabled){
                    utils.botLogs(globals,"---google not enabled");
                    msg.reply("Google has not been enabled, contact sys-admin to set up");
                    utils.work_Unlock(globals);
                    return;
                }
                dump_functions.documentVoice_v2(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* dump reacts of a post to a doc */
            else if (command === '--document-reacts3'){
                utils.botLogs(globals,"received request [document-reacts3]");
                msg.reply("received and processing request [document-reacts3]");
                if (!googleEnabled){
                    utils.botLogs(globals,"---google not enabled");
                    msg.reply("Google has not been enabled, contact sys-admin to set up");
                    utils.work_Unlock(globals);
                    return;
                }
                dump_functions.documentReactions_v3(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* dump names of members in voice channel to a doc */
            else if (command === '--document-voice3'){
                utils.botLogs(globals,"received request [document-voice3]");
                msg.reply("received and processing request [document-voice3]");
                if (!googleEnabled){
                    utils.botLogs(globals,"---google not enabled");
                    msg.reply("Google has not been enabled, contact sys-admin to set up");
                    utils.work_Unlock(globals);
                    return;
                }
                dump_functions.documentVoice_v3(globals, msg, content)
                .then(_ => {
                    utils.botLogs(globals,"\nCompleted request\n");
                    msg.react('✅');
                })
                .catch(err => {  
                    utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                    msg.reply("An error occured\n"+err);
                    msg.react('❌'); 
                })
                .finally(_ => {
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                    .finally(_ => { utils.work_Unlock(globals); });
                });
            }



            /* schedule timed events TODO-later */
            /*else if (command === '--repeat'){  // !! ENSURE no lock or scope errors
                //--repeat mode time +--event_to_schedule args
                utils.botLogs(globals,"received request [repeat]");
                msg.reply("received and processing request [repeat]");
                if (isRepeat){//shouldn't repeat a repeat!
                    utils.botLogs(globals,"--double repeat -> invalid");
                    msg.reply("repeating a repeat is not allowed!");
                    return;
                }
                repeatEventHandler(msg, member, command, content);
            }*/



            /*  *//*
            else if (command === '--'){
                //
                //JSON.parse(content)
            }*/



            /* shutdown the bot */
            else if (command === '--shutdown'){
                msg.react('👋').then(_ => {
                    utils.change_status(client, 'dnd', configs.shutdownStatusText)
                    .then(_ => {
                        msg.channel.send("i must go, my pepol call me!")
                        .then(_ => { client.destroy(); utils.sleep(5000); } )
                        .catch(err => { utils.botLogs(globals,'\n\n# ERR shutting down [0]  \n'+err); });
                    })
                    .catch(err => { utils.botLogs(globals,'\n\n# ERR shutting down [1]  \n'+err); });
                })
                .catch(err => { utils.botLogs(globals,'\n\n# ERR shutting down [2]  \n'+err); });
                
                utils.botLogs(globals,'--bot shutting down');
            }   



            else {
                if(globals.modularFunctions.hasOwnProperty(command)){
                //if (configs.modularFunctions.includes(command)){  //custom command (modular)
                    utils.botLogs(globals,"received request for modular function ["+command+"]");
                    globals.modularFunctions[command].func(globals, msg, content)
                    .then(_ => {
                        utils.botLogs(globals,"\nCompleted request\n");
                        msg.react('✅');
                    })
                    .catch(err => {  
                        utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
                        msg.reply("An error occured\n"+err);
                        msg.react('❌'); 
                    })
                    .finally(_ => {
                        utils.change_status(client, 'idle', configs.idleStatusText)
                        .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'.");  })
                        .finally(_ => { utils.work_Unlock(globals); });
                    });
                }

                else{ //unknown command
                    msg.react('🤔');
                    msg.reply("`"+prefix+command+"` command unknown, try --help or --commands for a list of commands and short documentation");
                    utils.change_status(client, 'idle', configs.idleStatusText)
                    .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); msg.channel.send("Error ::  "+err + ";   my status should be 'idle'."); })
                    .finally(_ => { utils.work_Unlock(globals); });
                }
            }
        }


        catch (err){
            utils.botLogs(globals,"\nERROR in handling command\n"+err.stack);
            msg.reply("An error occured\n"+err);
            msg.react('❌'); 
            utils.work_Unlock(globals); 
        }
    })
    .catch(err => { msg.channel.send("\nERR occurred when changing status: "+err); msg.react('❌'); utils.work_Unlock(globals); });
}




function repeatEventHandler(msg, member, command, content){
    //--repeat configs +--event_to_schedule args
    /* configs {mode: x, settings: {~~}}
    *
    * modes: < seconds || minutes || days || weekly > 
    *  \seconds: repeat
    *       settings= {}
    *  \minutes:  
    *       settings= {}
    *  \days:  repeat after an amount of days.  can set a preferred time
    *       settings= {}
    *  \weekly:  repeat weekly at a certain time of day 
    *       settings= {schedule: [0~6, ...], timeOfDay: "HH:MM"}
    *         [0-6] where 0 is sunday, 1 is monday ... 6 is saturday
    *         timeOfDay must be 24hour clock, 12hour clock isn't supported
    *  
    * 
    * */
    
    /*
    if seconds or minutes then just create interval event 
    otherwise if days or weekly
    create an timeout event from time of creation to the event time of day (like noon)
     then create interval event 
     */

    //commandHandler(msg, member, command, content, true);
    //var set = new Set(A);
    /*
    var requestBody = msg.content.substring(prefix.length);
    utils.botLogs(globals,"\nrequestBody:: "+requestBody);
    if (requestBody.includes(' ')){
        var command = requestBody.substr(0,requestBody.indexOf(' '));
        var content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
    }
    else {
        var command = requestBody.trim();
        var content = "{}";
    }
    utils.botLogs(globals,"__command:: "+command);
    utils.botLogs(globals,"__content:: "+content);
    */
   msg.reply("this function is not supported yet");
}



/***   scheduled reactroles garbage collection   ***/
var maintenance_interval = 24*60*60*1000; // 24 hours
setInterval(garbage_collection, maintenance_interval); 
async function garbage_collection(){ //(not tested)
    while (globals.busy) {
        utils.botLogs(globals,"* work lock still active, waiting for unlock to fufill maintenance interval *");
        await new Promise(resolve => workLockEmitter.once('unlocked', resolve));
    }
    utils.work_Lock(globals);
    utils.botLogs(globals,"* obtaining work lock for maintenance interval *");

    utils.change_status(client, 'dnd', "[doing maintenance]")
    .then(async (_) => {
        utils.botLogs(globals,"\nBeginning reactrole garbage collection");
        try{
            for(_server in reactroles){
                var server = client.guilds.resolve(_server);
                if (server.deleted){
                    utils.botLogs(globals,"--server "+server.name+":"+server.id+" DELETED");
                    delete reactroles[_server];
                }
                else {
                    utils.botLogs(globals,"--server "+server.name+":"+server.id+" \\");
                    for (_channel in reactroles[_server]){
                        var channel = server.channels.resolve(_channel);
                        if (channel.deleted){
                            utils.botLogs(globals,"----channel "+channel.name+":"+channel.id+" DELETED");
                            delete reactroles[_server][_channels];
                        }
                        else {
                            utils.botLogs(globals,"----channel "+channel.name+":"+channel.id+" \\");
                            for (_message in reactroles[_server][_channel]){
                                await channel.messages.fetch(_message)
                                .then(message => {
                                    if (message.deleted){
                                        utils.botLogs(globals,"------message "+message.id+" DELETED");
                                        delete reactroles[_server][_channels][_message];
                                    } else utils.botLogs(globals,"------message "+message.id+" >>|");
                                })
                                .catch(err => utils.botLogs("### ERR during maintenance ::  "+ err));
                            }
                            utils.botLogs(globals,"--completed all message entries for reactroles in server ["+server.name+":"+server.id+"] channel ["+channel.name+":"+channel.id+"]\n");
                        }
                    }
                    utils.botLogs(globals,"--completed all channel entries for reactroles in server ["+server.name+":"+server.id+"]\n");        
                }
            }
            utils.botLogs(globals,"--completed all servers entries for reactroles\nMaintenance Complete\n");
            utils.change_status(client, 'idle', configs.idleStatusText)
            .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); })
            .finally(_ => { utils.work_Unlock(globals); });
        }
        catch (err){
            utils.botLogs(globals,"\n\n\nAn Error occurred\n"+err+"\n\n\n");
            utils.work_Unlock(globals);
        }
    })
    .catch(err => { utils.work_Unlock(globals); msg.channel.send("ERR occurred when changing status: "+err); });
}


/***   google connect   ***/
async function connectGoogle(configs){
    if (!googleEnabled)
        return null;
    const { GoogleSpreadsheet } = require('google-spreadsheet');
    const doc = new GoogleSpreadsheet(configs.googleSheetsId);
    await doc.useServiceAccountAuth(require("./googleClientSecret.json"))
    .then(x => {
        console.log("successfully connected to Google Sheets");
        doc.loadInfo()
        .then(x => {
            console.log("Sheets title: ["+doc.title+"]");
            googleDone = true;
            if (consoleGap && (botReady && googleDone && loginDone)) { consoleGap = false; console.log("\n\n\n"); }
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


function checkBotAlreadyOnline(){
    //client  configs.bot_id
    return false;
}

function initializeClient(){
    console.log("Initializing client");
    clientSetup();
    console.log("Logging in to client via token");
    client.login(token)
    .then(used_token => {
        console.log("--login complete");
        loginDone = true;
        if (googleEnabled && consoleGap && (botReady && googleDone && loginDone)) { consoleGap = false; console.log("\n\n\n"); }
        else if (!googleEnabled)  console.log("\n\n\n");
    })
    .catch(err => {console.log("--ERROR [LOGIN] ::  "+err); throw new Error("\nError occurred during login");});
    globals["client"] = client;
}




const client = new Discord.Client();
var doc = null;
var consoleGap = true;
var botReady = false;
var googleDone = false;
var loginDone = false;



console.log("\n\n["+package.name+"]   version -- "+package.version+"\n\n");
setupLogs();    

connectGoogle(configs)
.then(_doc => {
    doc = _doc;
    globals["doc"] = doc;
    initializeClient();
})
.catch(err => {
    console.log(err.stack);
    throw new Error("\nError occurred during Google Sheets connection");   
});





