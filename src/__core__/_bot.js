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

// Do NOT import this file nor modify (unless bugged or upgrading)
//  import utils.js for any required utility functions


/** path relative to CWD (main.js) */
const commandsPath = "./_commands/";
/** path relative to CWD (main.js) */
const reactablesPath = "./_reactables/";
/** path relative to CWD (main.js) */
//const customUtilsPath = "./_utils/"; 
/** path relative to CWD (main.js) */
//const customConfigsPath = "./_configs/";
/** path relative to CWD (main.js) */
//const privatePath = "./_private/";
/** path relative to CWD (main.js) */
const startupPath = "./_startup/";
/** path relative to CWD (main.js) */
const configsPath = './configs.json';



const DEFAULT_INIT_OPTIONS = {
    press_enter_to_exit: false,
};

const DEFAULT_QUEUE_CAP = 10;
const DEFAULT_SCAN_DEPTH = 2;

const DEFAULT_START_STATUS_TEXT = "[started]";
const DEFAULT_IDLE_STATUS_TEXT = "[idle]";
const DEFAULT_SHUTDOWN_STATUS_TEXT = "[shutdown]";

const DEFAULT_AUTH_LEVEL = Number.MAX_VALUE; //effectively admin only, if enabled
const DEFAULT_AUTH_ADMIN_BYPASS = false;
const DEFAULT_CHANNEL_AUTH_STRICT = false;



const fs = require('fs'); 
const path = require('path');

const readline = require('readline'); //for enterToExit()
const { DateTime } = require('luxon');

const Discord = require('discord.js');
const { Intents } = Discord;


const _package = require('../package.json');


//__core__ imports
const { Globals, BotConfigs } = require('./_typeDef.js');
const { botEventEmitter } = require('./BotEventEmitter.js');
const workLock = require('./WorkLock.js');
const auth = require('./BotAuth.js');
const miscUtils = require('./MiscUtils.js');
const timeUtils = require('./DateTimeUtils.js');
const utils = require('./DiscordUtils.js');

//__core__ imports with startup/shutdown tasks
const logging = require('./BotLogging.js');
const interactables = require('./Interactables.js');
const listeners = require('./BotListeners.js');
const timers = require('./BotTimers.js');
const { getGlobals, initGlobals, clearGlobals, destroyGlobals, freezeGlobal, unfreezeGlobal } = require('./_Globals');


//startup/shutdown tasks for __core__
let __core__ = { 
    "Logging": logging, 
    "Interactables": interactables,
    "Listeners": listeners,
    "Intervals & Timeouts": timers,
};







//LOCAL
/** @type {Globals} */
let globals = null;
/** @type {Discord.Client|null} */
let client = null;
/** @type {BotConfigs} */
let configs = null;

let queueLength = 0;
let queueCapacity = DEFAULT_QUEUE_CAP;
let scanDepth = DEFAULT_SCAN_DEPTH;

let _requisites = {
    /** @type {{[requiredCommand: String]: String[]}} */
    commands: {
        /* "example_req_command": ["requester_cmd_1", ...] , ... */
    },
    /** @type {{[task: String]: String[]|Array<(globals: Globals) => void|Promise<void>>}} */
    startupTasks: {
        /*( "normalized_path/fileName.js": ["requester_1, ..."] 
         OR "'groupName'|func": [taskFunction, ...] ), ...*/
    },
    /** @type {{[taskGroupName: String]: Array<(globals: Globals) => void|Promise<void>>}} */
    shutdownTasks: {
        /* "'groupName'|func": [taskFunction, ...] ), ...*/
    }
};
/** @type {{[command: String]: String[]}} */
let _requesters = {}


/** @typedef {"g"|"d"|"i"|"m"|"s"|"u"|"y"} regexFlags */
/** 
 * @type {{[fileName: String]: {
 *      targetServers? : Discord.Snowflake[],
 *      exact? : {[content: String]: {
 *          case_insensitive? : Boolean,
 *          directed? : Boolean,
 *          reply? : String,
 *          reactions? : String[]
 *      }}
 *      contains? : {[content: String]: {
 *          case_insensitive? : Boolean,
 *          directed? : Boolean,
 *          reply? : String,
 *          reactions? : String[]
 *      }}
 *      regex? : {[content: String]: {
 *          case_insensitive? : Boolean,
 *          directed? : Boolean,
 *          reply? : String,
 *          reactions? : String[]
 *          flags? : regexFlags[]
 *      }}
 * }}} 
 */
let modularReactables = {};
/** 
 * @type {{[fileName: String]: {
 *      version : Number,
 *      auth_level? : Number,
 *      manual : String,
 *      func: (globals: Globals, msg: Discord.Message, args: String) => void|String|Promise<void>|Promise<String>
 *      requisites? : {
 *          commands? : String[],
 *          startupTasks? : {
 *              files? : String[],
 *              functions? : [(globals: Globals) => void|Promise<void> | {
 *                      title? : String,
 *                      func : (globals: Globals) => void|Promise<void>
 *              }]
 *          }
 *          shutdownTasks? : [(globals: Globals) => void|Promise<void> | {
 *              title? : String,
 *              func : (globals: Globals) => void|Promise<void>
 *          }]
 *      }
 * }}} 
 */
let modularCommands = {};




let command_description = "The command manual *should* follow the following conventions: \n"+
    "**commandName**  ->  *arguments* \n"+
    "~~**•** >~~  any quotation marks, curly brackets, or square brackets are necessary\n"+
    "~~**•** >~~  any regular brackets indicate a grouping, intended for alternative arg groups\n"+
    "~~**•** >~~  any args italicized mean to refer to placeholder text for instruction, for example *roleResolvable* means to replace with a role resolvable\n"+
    "~~**•** >~~  any grey blocks imply a literal word input\n"+
    "~~**•** >~~  any args underlined will usually imply a web link\n"+
    "~~**•** >~~  `...` (ellipsis) implies that you can input more than one, usually using a comma\n"+
    "~~**•** >~~  encapsulating with `<` and `>` like `\"< args >\"` implies the argument is optional\n"+
    "~~**•** >~~  do not include elipses, <, >, or single quotations in the command request body\n__Terms used__:```"+
    "memberResolvable:   a member username or nickname, id, or mention/ping\n"+
    "roleResolvable:   a role name, id, or mention\n"+
    "channelResolvable:   (unless specified otherwise) a text channel name, id, or mention\n"+
    "voice/comms/category Resolvable:   a channel/category name, or id\n"+
    "```================================";


const upwardTraversalRegex = /(^\s*\.{2,}\s*$|(\\|\/)\s*\.{2,}\s*(\\|\/)|(^[^\w-\.]|\\|\/)\s*\.{2,}\s*$|^\s*\.{2,}\s*([^\w-\.]$|\\|\/))/g;


/**
 * Return the path string as a path relative to this file (bot.js) location
 * @param {String} _path 
 * @returns {String} resolved path
 */
function relativePath(_path){
    return "./"+path.relative(__dirname, path.normalize(_path));
}




//================================================================
// Process
//----------------------------------------------------------------
//#region Process

let _enterToExit = DEFAULT_INIT_OPTIONS.press_enter_to_exit; //default false

/** 
 * @typedef initOptions 
 * @property {Boolean} press_enter_to_exit whether to enable enterToExit on critical error
 */
/**
 * Start the bot.
 * Setup, login, and initilize all startup tasks
 * @param {initOptions} options
 */
async function init (options){
    if (typeof options?.press_enter_to_exit === "boolean") _enterToExit = options.press_enter_to_exit;

    botEventEmitter.emit('Init');
    if (!client) client = new Discord.Client({
        intents: [
            Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, 
            Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES,
            Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.DIRECT_MESSAGES
        ]
        //,fetchAllMembers: true
        //,partials: ['MESSAGE','REACTION']
        ,failIfNotExists: false
    });
    console.log("\n\n["+_package.name+"]   version -- "+_package.version+"\n");
    process.title = "["+_package.name+"]   version -- "+_package.version;
    try{
        globals = initGlobals({
            client: client,
            botEventEmitter: botEventEmitter,
            blocking_built_in_funcs: blocking_built_in_funcs,
            nonblocking_built_in_funcs: nonblocking_built_in_funcs
        });
        acquireConfigs();

        logging.setupLogger(globals, configs);
        acquireCommands();
        acquireReactables();
        await initializeClient();
        await new Promise((resolve, reject) => {
            botEventEmitter.once('ready', resolve);
            setTimeout(reject, 60000);
        }); //waits until bot ready before proceeding, or error on 1 min timeout 
    }
    catch (err){
        console.log(err);
        if (_enterToExit)  await enterToExit();
        process.exit();
    }    
}


/**
 * Shutdown the bot.
 * Perform all shutdown tasks, destroy the client, and clear any variables
 */
async function shutdown (){
    botEventEmitter.emit('shutdown');
    if (!globals) process.exit();

    logging.isReady() ? logging.log(globals, "Shutdown requested") : console.log("Shutdown requested");
    await shutdownTasks();
    
    try { 
        //client.off('ready', onReady);
        client.off('messageCreate', onMessage);
        client.off('error', onError);
        client.off('rateLimit', onRateLimit);
        client.off('shardReady', onShardReady);
        client.off('shardError', onShardError);
        client.off('shardReconnecting', onShardReconnecting);
        client.off('shardResume', onShardResume);
        client.off('shardDisconnect', onShardDisconnect);
        client.destroy(); 
    }
    catch (err){ logging.isReady() ? logging.log(globals, "ERROR when destroying client\n"+err) : console.error("ERROR when destroying client\n"+err); }
    logging.isReady() ? logging.log(globals, "Bot Shutdown\n    "+timeUtils.getDateTimeString(globals)+"\n") : console.log("Bot Shutdown\n    "+timeUtils.getDateTimeString(globals)+"\n");
    logging.destroyLogger();
    modularCommands = {};
    modularReactables = {}; 
    _requisites = {commands:{}, startupTasks:{}, shutdownTasks:{}}
    _requesters = {}
    globals = destroyGlobals();
    console.log("--------------------------------------------------------------------------------\n");
    botEventEmitter.emit('exit');
}


/**
 * Restart the bot by full shutdown and init.
 */
async function restart (){
    botEventEmitter.emit('restart');
    if (globals) {
        await shutdown();
        console.log("\n\n\nRestarting\n\n\n");
    }
    await init();
    botEventEmitter.emit('restartComplete');
}


/**
 * Restart the bot by partial shutdown and startup.
 * The discord client is not destroyed during this process.
 * @param {Discord.Message|undefined|null} [msg]
 */
async function soft_restart (msg){
    //dont destroy the client, but do a partial shutdown and partial init 
    //(if msg provided, return reply on failure)
    botEventEmitter.emit('softRestart');
    logging.log(globals, "Soft restart requested");
    await shutdownTasks();
    
    let press_enter_to_exit = initArg;
    try{
        globals = initGlobals({
            client: client,
            botEventEmitter: botEventEmitter,
            blocking_built_in_funcs: blocking_built_in_funcs,
            nonblocking_built_in_funcs: nonblocking_built_in_funcs
        });
        globals["bot_id"] = client.user.id;
        freezeGlobal("bot_id");
        acquireConfigs();
        logging.setupLogger(globals, configs);
        acquireCommands();
        acquireReactables();
        await startupTasks();
        botEventEmitter.emit('softRestartComplete');
    }
    catch (err){
        console.log(err);
        if (msg) {
            msg.react('❌');
            msg.reply("An error occured during restart, bot will shutdown.  Please contact sys-admin");
            if (press_enter_to_exit)  await enterToExit();
            process.exit();
        }
        else throw (err);
    }
}

//#endregion Process



//================================================================
// Client
//----------------------------------------------------------------
//#region Client

/** setup the client and login */
async function initializeClient (){
    console.log("\nInitializing client");
    clientSetup();

    await startupTasks();

    botEventEmitter.emit('login');
    console.log("\nLogging in via client token");
    client.login(require(relativePath(configs.DiscordAuthFilePath)).token)
    .catch(err => {
        console.log("--ERROR [LOGIN] ::  "+err); 
        botEventEmitter.emit('loginError', err);
        throw new Error("\nError occurred during login");
    });
}



/** Setup the client event handlers */
function clientSetup (){
    console.log("\nSetting up client event handlers");
    client.once('ready', onReady);
    client.on('messageCreate', onMessage);
    client.on('error', onError);
    client.on('rateLimit', onRateLimit);

    client.on('shardReady', onShardReady);
    client.on('shardError', onShardError);
    client.on('shardReconnecting', onShardReconnecting);
    client.on('shardResume', onShardResume);
    client.on('shardDisconnect', onShardDisconnect);

}


/** on ready event, finalize setup, emit botReady and initiate post-start  */
function onReady (){
    utils.change_status(client, 'idle', configs.startupStatusText).catch(err => logging.log(globals, err));
    process.title = `${client.user.tag}  [${_package.name}]   version -- ${_package.version}`;

    console.log(`\nLogged in as ${client.user.tag}!`);
    globals["bot_id"] = client.user.id;
    freezeGlobal("bot_id");
    console.log("  bot client id: "+globals.bot_id); //bot_id);
    console.log("  -- use the '--help' or '--commands' command for info");

    console.log("\nBot Ready\n    "+timeUtils.getDateTimeString(globals)+"\n\n"); 
    botEventEmitter.emit('ready');
}
/**
 * on message event, handle it
 * @param {Discord.Message} msg 
 */
async function onMessage (msg) {
    if ( !msg.guild || msg.partial || msg.system || msg.webhookId ) 
        return;  //skip all partial messages, system messages, and webhook (includes ephemeral) messages 
    if ( (msg.channel.type !== "GUILD_TEXT" && !msg.channel.isThread()) ) 
        return; //ignore DMs, News

    /* check channel auth */
    let channelAuth = auth.checkChannelAuthorized(globals, msg.guildId, msg.channelId, msg.author.id);

    /*** bot commands ***/
    if (!msg.author.bot && channelAuth.commands &&(msg.content.startsWith(configs.prefix) || msg.content.startsWith("<@"+globals.bot_id+">") || msg.content.startsWith("<@!"+globals.bot_id+">"))) {
        handleRequest(msg);
    }

    /***  bot reactables  ***/
    else if (channelAuth.reactables) {
        handleReactables(msg);
    }
}
/**
 * on error event, dump to logs and attempt to continue
 * @param {Error} err 
 */
function onError (err){
    botEventEmitter.emit('error', err)
    logging.log(globals,"\n\n________________________________________________________________________________\n"
    +"BOT ERROR OCCURRED\n\n"+err
    +"\n________________________________________________________________________________\n\n");
    //process.exit();
}
/**
 * on rateLimit event, log the info
 * @param {Discord.rateLimitInfo} rateLimitInfo 
 */
function onRateLimit (rateLimitInfo){
    console.log("<< Request rate limited for "+(rateLimitInfo.timeout/1000.0)+"s >>");
}
/**
 * on shardReady event, log the info
 * @param {Number} id 
 * @param {Set<Discord.Snowflake>} unavailableGuilds 
 */
function onShardReady (id, unavailableGuilds){
    console.log( "\n"+ timeUtils.getTimeString(globals) + "\n<< Shard "+id+" ready >>"+ (unavailableGuilds ? "\nUnavailable servers (id): "+unavailableGuilds: ""));
    //utils.change_status(client, 'idle', configs.startupStatusText).catch(err => logging.log(globals, err));
}
/**
 * on shardReconnecting event, log the info
 * @param {Number} id 
 */
function onShardReconnecting (id){
    console.log( "\n"+ timeUtils.getTimeString(globals) + "\n<< Shard "+id+" reconnecting... >>");
}
/**
 * on shardResume event, log the info
 * @param {Number} id 
 * @param {Number} replayedEvents 
 */
function onShardResume (id, replayedEvents){
    console.log( "\n"+ timeUtils.getTimeString(globals) + "\n<< Shard "+id+" connection resumed; "+replayedEvents+" events replaying >>");
    //utils.change_status(client, 'idle', "reconnected shard "+id).catch(err => logging.log(globals, err));
}
/**
 * on shardDisconnect event, log the info
 * @param {Number} closeEvent 
 * @param {Number} id 
 */
function onShardDisconnect (closeEvent, id){
    console.log( "\n"+ timeUtils.getTimeString(globals) + "\n<< Shard "+id+" disconnected >>\ncode: "+closeEvent.code+"  (wasClean: "+closeEvent.wasClean+")\nreason: "+closeEvent.reason);
}
/**
 * on shardError event, log the info
 * @param {Error} error 
 * @param {Number} shardId 
 */
function onShardError (error, shardId){
    console.log( "\n"+ timeUtils.getTimeString(globals) + "\n<< Shard "+shardId+" encountered an error >>\n");
    console.error(error);
}

//#endregion Client



//================================================================
// Acquire / Import
//----------------------------------------------------------------
//#region Acquire


//#region commands
/**
 * import all modular commands (excluding those in a directory prefixed with "_")
 */
function acquireCommands (){
    logging.log(globals, "\nAcquiring _commands");
    if (fs.existsSync(commandsPath)) {
        scanCommandDirectories( commandsPath, scanDepth-1 );
    }
    else logging.log(globals, "--directory not found");

    
    /** acquire list of requisites from each command **/
    for ( let cmd in modularCommands ){
        acquireRequisites( cmd, modularCommands[cmd] );        
    }

    /** search and import requisites from the list **/
    importRequisiteCommands();

    botEventEmitter.emit('acquiredCommands');
}

/**
 * recursively scan and import command files
 */
function scanCommandDirectories (path, depth){//recursive, returns list
    logging.log(globals, "--scanning directory ["+path+"]: ");
    let files = fs.readdirSync(path);
    let innerDirs = [];

    /* scan path dir */
    let count_f = 0;
    for ( let file of files ){
        botEventEmitter.emit('acquiringCommand', count_f++, path+file);
        if ((file.startsWith("_")) ||  (file === "README.txt"))  continue;
        if (file.endsWith('.js')){
            let jsFile = require(relativePath(path+file));
            if ( jsFile.hasOwnProperty("func") && jsFile.hasOwnProperty("manual") ){
                if (!jsFile.hasOwnProperty("auth_level")) jsFile['auth_level'] = Number.MAX_VALUE;
                jsFile["__filePath"] = path+file;
                let commandName = file.substring(0,file.length-'.js'.length);
                if (modularCommands.hasOwnProperty(commandName)){
                    logging.log(globals, "!!  \""+file+"\"  conflict name '"+commandName+"';  taking newest file");
                }
                modularCommands[commandName] = jsFile; 
                logging.log(globals, "    \""+file+"\" "+(jsFile.version ? " (v"+jsFile.version+") " : "")+"  included  [Lv."+jsFile.auth_level+"]");
            }
            else logging.log(globals, "    \""+file+"\"  not included");
        }

        else if ( fs.lstatSync(path+file).isDirectory() ){
            innerDirs.push(file+"/");
        }

        else logging.log(globals, "    \""+file+"\"  not included");
    }
    botEventEmitter.emit('acquiringCommand', files.length, null);

    /* scan inner dirs */
    if (depth > 0){ //recursion if depth > 0
        for (let inner_dir of innerDirs){
            scanCommandDirectories( path+inner_dir, depth-1 );
        }
    }
}


/**
 * determine any requisite files or functions
 * @param {String} cmd the command requiring additional files
 * @param {Object} jsFile the command file
 */
function acquireRequisites (cmd, jsFile){
    if ( jsFile.hasOwnProperty("requisites") ){
        if ( jsFile.requisites.hasOwnProperty("commands") ){
            for ( let cmd_req of jsFile.requisites.commands ){
                let filePath = path.normalize( commandsPath + cmd_req );
                if (filePath.match(upwardTraversalRegex)) throw new Error("Illegal path;  Path includes upward traversal beyond scope ::   "+filePath);
                if ( !_requisites.commands.hasOwnProperty(filePath) )
                    _requisites.commands[filePath] = [];
                logging.log(globals, "--command ["+cmd+"] required command at file path:  "+filePath);
                _requisites.commands[filePath].push(cmd);

                let targetName = path.basename(filePath, '.js');
                if ( !_requesters.hasOwnProperty(targetName))
                    _requesters[targetName] = [];
                _requesters[targetName].push(cmd);
            }
        }
        if ( jsFile.requisites.hasOwnProperty("startupTasks") ){
            if ( jsFile.requisites.startupTasks.hasOwnProperty("files") ){
                for ( let start_req of jsFile.requisites.startupTasks.files ){
                    let filePath = path.normalize( startupPath + start_req );
                    if (filePath.match(upwardTraversalRegex)) throw new Error("Illegal path;  Path includes upward traversal beyond scope ::   "+filePath);
                    if ( !_requisites.startupTasks.hasOwnProperty(filePath) ){
                        _requisites.startupTasks[filePath] = [];
                    }
                    logging.log(globals, "--command ["+cmd+"] required startup at file path:  "+filePath);
                    _requisites.startupTasks[filePath].push(cmd);
                }
            }
            if ( jsFile.requisites.startupTasks.hasOwnProperty("functions") ){
                for ( let start_req of jsFile.requisites.startupTasks.functions ){
                    let groupName;
                    let func;
                    if (typeof start_req !== "function"){
                        groupName = jsFile.__filePath +"|"+ (start_req.title ?? "_") + "|func";
                        if (start_req.hasOwnProperty("func") && typeof start_req.func === "function")
                            func = start_req.func;
                        else {
                            logging.log(globals, "--SKIPPED ::  command ["+cmd+"] required startup task but failed on error:  Invalid function");
                            continue;
                        }
                        if (!_requisites.startupTasks.hasOwnProperty(groupName)) 
                            _requisites.startupTasks[groupName] = [];
                        _requisites.startupTasks[groupName].push(func);
                    }
                    else if (typeof start_req === "function"){
                        groupName = jsFile.__filePath + "|_|func";
                        if (!_requisites.startupTasks.hasOwnProperty(groupName)) 
                            _requisites.startupTasks[groupName] = [];
                        _requisites.startupTasks[groupName].push(start_req);
                    }
                    else {
                        logging.log(globals, "--SKIPPED ::  command ["+cmd+"] required startup task but failed on error:  Invalid task");
                        continue;
                    }
                }
            }
        }
        if ( jsFile.requisites.hasOwnProperty("shutdownTasks") ){
            let temp = {}
            for ( let shutdown_task of jsFile.requisites.shutdownTasks ){
                let groupName;
                let func;
                if (typeof shutdown_task !== "function"){
                    groupName = jsFile.__filePath +"|"+ (shutdown_task.title ?? "_") + "|func";
                    if (shutdown_task.hasOwnProperty("func") && typeof shutdown_task.func === "function")
                        func = shutdown_task.func;
                    else {
                        logging.log(globals, "--SKIPPED ::  command ["+cmd+"] required shutdown task but failed on error:  Invalid function");
                        continue;
                    }
                    if (!temp.hasOwnProperty(groupName)) 
                        temp[groupName] = [];
                    temp[groupName].push(func);
                }
                else if (typeof shutdown_task === "function"){
                    groupName = jsFile.__filePath + "|_|func";
                    if (!temp.hasOwnProperty(groupName)) 
                        temp[groupName] = [];
                    temp[groupName].push(shutdown_task);
                }
                else {
                    logging.log(globals, "--SKIPPED ::  command ["+cmd+"] required shutdown task but failed on error:  Invalid task");
                    continue;
                }
            }
            for (let groupName in temp){ //overwrite any existing tasks
                _requisites.shutdownTasks[groupName] = temp[groupName];
            }
        }
    }
}


/**
 * import any requisite commands
 */
function importRequisiteCommands (){
    //as imported, check imports for new requisites and add to list
    logging.log(globals, "--importing requisite commands");
    let commands_to_import = Object.keys(_requisites.commands);
    let count_i = 0;
    let total_i = commands_to_import.length;
    while ( commands_to_import.length > 0 ){
        let filePath = commands_to_import.splice(0,1)[0];
        if (++count_i > total_i){
            logging.log(globals,"--reattempting import on "+filePath);
        }
        let requesters = _requisites.commands[filePath];
        let commandName = path.basename(filePath, ".js");
        if ( modularCommands.hasOwnProperty(commandName) ){
            logging.log(globals, "--requisite command ["+commandName+"] already found in command list\n----requested file path: ["+filePath+"]\n----requesters: ["+requesters+"]");
            delete _requisites.commands[filePath];
        }
        else { //not yet imported
            logging.log(globals, "--importing ["+commandName+"] via path: "+filePath);
            try {
                let imported = require(relativePath('./'+filePath));
                modularCommands[commandName] = imported;
                modularCommands[commandName]["__filePath"] = './'+filePath;
                acquireRequisites(commandName, modularCommands[commandName]);
            }
            catch (err){
                logging.log(globals, "----failed to import ["+commandName+"] via path: "+filePath+"\nERROR ::  "+ err);
            }
            finally {
                if (count_i++ >= total_i) delete _requisites.commands[filePath];
                else commands_to_import.push(filePath); //reattempt it later
            }
        }
    }
}
//#endregion commands


/**
 * import all modular reactable files
 */
function acquireReactables (){ 
    logging.log(globals, "\nAcquiring _reactables");
    if (fs.existsSync(reactablesPath)) {
        let files = fs.readdirSync(reactablesPath);
        botEventEmitter.emit('acquiringReactables', files.length, reactablesPath);
        logging.log(globals, "--scanning _reactables directory: ");
        let count_f = 0;
        for ( let file of files ){
            botEventEmitter.emit('acquiringReactable', count_f, reactablesPath+file);
            if ((file.startsWith("_")) ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                let jsFile = require(relativePath(reactablesPath+file));
                if (jsFile.hasOwnProperty("exact") || jsFile.hasOwnProperty("contains") || jsFile.hasOwnProperty("regex")){ 
                    for (let elem in jsFile.exact){ //fix reaction by removing any < or >
                        if (jsFile.exact[elem].hasOwnProperty('reactions')) 
                            jsFile.exact[elem].reactions = jsFile.exact[elem].reactions.map(react => react.replace(/<|>/g,""));
                    }
                    for (let elem in jsFile.contains){
                        if (jsFile.contains[elem].hasOwnProperty('reactions')) 
                            jsFile.contains[elem].reactions = jsFile.contains[elem].reactions.map(react => react.replace(/<|>/g,""));
                    }
                    for (let elem in jsFile.regex){
                        if (jsFile.regex[elem].hasOwnProperty('reactions')) 
                            jsFile.regex[elem].reactions = jsFile.regex[elem].reactions.map(react => react.replace(/<|>/g,""));
                        //create RegExp from key and flags
                        let flags = "";
                        if (jsFile.regex[elem].hasOwnProperty('flags')) 
                            flags = jsFile.regex[elem].flags.filter(item => ["g","d","i","m","s","u","y"].includes(item)).join("");
                        jsFile.regex[elem]["re"] = new RegExp(elem, flags);
                    }
                    jsFile["__filePath"] = reactablesPath+file;//store the orgin path
                    modularReactables[file.substring(0,file.length-'.js'.length)] = jsFile; 
                    logging.log(globals, "    \""+file+"\" included");
                }
                else  logging.log(globals, "    \""+file+"\" not included");
            }
            else  logging.log(globals, "    \""+file+"\" not included");
        }
        botEventEmitter.emit('acquiringReactable', files.length, null);
    }
    else  logging.log(globals, "--directory not found");
    botEventEmitter.emit('acquiredReactables');
}


/**
 * import and parse the configs
 * @param {String|undefined} [newConfigsPath] if a path is provided then bot will try to import file found at path as configs 
 ** relative to current working directory
 */
function acquireConfigs (newConfigsPath){ 
    botEventEmitter.emit('verifyConfigs');
    if (!newConfigsPath) newConfigsPath = configsPath;
    if (!fs.existsSync(newConfigsPath)){
        botEventEmitter.emit('configsError', "Invalid configs path");
        console.log("Invalid configs path");
        throw new Error("Invalid configs path ::  configs not found on path ["+newConfigsPath+"]");
    }
    configs = require(relativePath(newConfigsPath));
    delete require.cache[require.resolve(relativePath(newConfigsPath))]; //prevent configs caching
    console.log("\nParsing configs.json");
    let invalid = false;
    let missing = [];
    let incorrect = [];
    if ( !configs.hasOwnProperty("prefix") ){ invalid = true; missing.push("prefix"); }
    else if ( typeof configs.prefix !== "string" ){ invalid = true; incorrect.push("prefix"); }
    
    if ( !configs.hasOwnProperty("authorization") ){ configs['authorization'] = {}; missing.push("authorization"); }
    else if ( typeof configs.authorization !== "object" ){ invalid = true; incorrect.push("authorization"); }
    else if ( !configs.authorization.hasOwnProperty("authorizedRoles") ){ configs.authorization["authorizedRoles"] = {}; missing.push("authorization.authorizedRoles"); }
    else if ( !configs.authorization.hasOwnProperty("authorizedUsers") ){ configs.authorization["authorizedUsers"] = {'_':{}}; missing.push("authorization.authorizedUsers"); }
    else if ( !configs.authorization.authorizedUsers.hasOwnProperty("_") ){ configs.authorization.authorizedUsers['_'] = {}; missing.push("authorization.authorizedUsers._"); }
    else if ( typeof configs.authorization.authorizedRoles !== "object" || !(Object.values(configs.authorization.authorizedRoles).map(val => typeof val === "object").reduce((acc, next) => acc && next)) || !(Object.values(configs.authorization.authorizedRoles).map(val => Object.values(val)).flat().map(elem => typeof elem === "number").reduce((acc, next) => acc && next)) ){ invalid = true; incorrect.push("authorization.authorizedRoles"); }
    else if ( typeof configs.authorization.authorizedUsers !== "object" || !(Object.values(configs.authorization.authorizedUsers).map(val => typeof val === "object").reduce((acc, next) => acc && next)) || !(Object.values(configs.authorization.authorizedUsers).map(val => Object.values(val)).flat().map(elem => typeof elem === "number").reduce((acc, next) => acc && next)) ){ invalid = true; incorrect.push("authorization.authorizedUsers"); }
    if ( !configs.authorization.hasOwnProperty("adminBypass") ){ configs.authorization['adminBypass'] = DEFAULT_AUTH_ADMIN_BYPASS; missing.push("authorization.adminBypass") }
    else if ( typeof configs.authorization.adminBypass !== "boolean" ){ configs.authorization.adminBypass = DEFAULT_AUTH_ADMIN_BYPASS; incorrect.push("authorization.adminBypass"); }

    if ( !configs.hasOwnProperty("channelAuth") ){ configs['channelAuth'] = {}; missing.push("channelAuth"); }
    for (let serverID in configs.channelAuth){
        if ( !configs.channelAuth[serverID].hasOwnProperty('adminBypass') ){ missing.push('channelAuth.'+serverID+'.adminBypass'); }
        if ( !configs.channelAuth[serverID].hasOwnProperty('commandAllowList') ){ missing.push('channelAuth.'+serverID+'.commandAllowList'); }
        if ( !configs.channelAuth[serverID].hasOwnProperty('reactableAllowList') ){ missing.push('channelAuth.'+serverID+'.reactableAllowList'); }
        if ( !configs.channelAuth[serverID].hasOwnProperty('listForCommands') ){ missing.push('channelAuth.'+serverID+'.listForCommands'); }
        if ( !configs.channelAuth[serverID].hasOwnProperty('listForReactables') ){ missing.push('channelAuth.'+serverID+'.listForReactables'); }
        if ( configs.channelAuth[serverID].hasOwnProperty('adminBypass') && typeof configs.channelAuth[serverID].adminBypass !== "boolean" ){  configs.channelAuth[serverID]['adminBypass'] = DEFAULT_AUTH_ADMIN_BYPASS; incorrect.push("channelAuth_"+serverID+".adminBypass");  }
        if ( configs.channelAuth[serverID].hasOwnProperty('commandAllowList') && typeof configs.channelAuth[serverID].commandAllowList !== "boolean" ){  configs.channelAuth[serverID]['commandAllowList'] = DEFAULT_CHANNEL_AUTH_STRICT; incorrect.push("channelAuth_"+serverID+".commandAllowList");  }
        if ( configs.channelAuth[serverID].hasOwnProperty('reactableAllowList') && typeof configs.channelAuth[serverID].reactableAllowList !== "boolean" ){  configs.channelAuth[serverID]['reactableAllowList'] = DEFAULT_CHANNEL_AUTH_STRICT; incorrect.push("channelAuth_"+serverID+".reactableAllowList");  }
        if ( configs.channelAuth[serverID].hasOwnProperty('listForCommands') && !Array.isArray(configs.channelAuth[serverID].listForCommands) ){  invalid = true; incorrect.push("channelAuth_"+serverID+".listForCommands");  }
        if ( configs.channelAuth[serverID].hasOwnProperty('listForReactables') && !Array.isArray(configs.channelAuth[serverID].listForReactables) ){  invalid = true; incorrect.push("channelAuth_"+serverID+".listForReactables");  }
    }

    if ( !configs.hasOwnProperty("built_in_AuthLevels") ){ 
        missing.push("built_in_AuthLevels");
        configs.built_in_AuthLevels = {};
    }
    else if ( typeof configs.built_in_AuthLevels !== "object" || !(Object.values(configs.built_in_AuthLevels).map(val => typeof val === "number").reduce((acc, next) => acc && next)) ){ invalid = true; incorrect.push("built_in_AuthLevels"); }
    if (!invalid){
        for (let cmd in built_in_commands){
            if ( !configs.built_in_AuthLevels.hasOwnProperty(cmd) ){ 
                configs.built_in_AuthLevels[cmd] = DEFAULT_AUTH_LEVEL;  
                //built_in_commands[cmd].auth_level = DEFAULT_AUTH_LEVEL;
                missing.push("built_in_AuthLevels."+cmd); 
            }
            //else built_in_commands[cmd].auth_level = configs.built_in_AuthLevels[cmd];
        }
    }

    if ( !configs.hasOwnProperty("DiscordAuthFilePath") ){ invalid = true; missing.push("DiscordAuthFilePath"); }
    else if ( typeof configs.DiscordAuthFilePath !== "string" ){ invalid = true; incorrect.push("DiscordAuthFilePath"); }
    else if ( !fs.existsSync(configs.DiscordAuthFilePath) ){ invalid = true; incorrect.push("DiscordAuthFilePath"); }


    //default 10
    if ( !configs.hasOwnProperty("workQueueCapacity") ){ missing.push("workQueueCapacity (default 10)"); configs["workQueueCapacity"] = DEFAULT_QUEUE_CAP; }
    else if ( typeof configs.workQueueCapacity !== "number" ){ incorrect.push("workQueueCapacity (default 10)"); configs["workQueueCapacity"] = DEFAULT_QUEUE_CAP; }
    else if ( configs.workQueueCapacity < 1 )   configs.workQueueCapacity = 1;

    //default 2
    if ( !configs.hasOwnProperty("scanDepth") ){ missing.push("scanDepth (default 2)"); configs["scanDepth"] = DEFAULT_SCAN_DEPTH; }
    else if ( typeof configs.scanDepth !== "number" ){ incorrect.push("scanDepth (default 2)"); configs["scanDepth"] = DEFAULT_SCAN_DEPTH; }
    else if ( configs.scanDepth < 1 )   configs.scanDepth = 1;

    //default false
    if ( !configs.hasOwnProperty("timestamp") ){ missing.push("timestamp (default false)"); configs["timestamp"] = logging.DEFAULT_TIMESTAMP; }
    else if ( typeof configs.timestamp !== "boolean" ){ incorrect.push("timestamp (default false)"); configs["timestamp"] = logging.DEFAULT_TIMESTAMP; }

    //default UTC
    if ( !configs.hasOwnProperty("IANAZoneTime") ){ missing.push("IANAZoneTime (default Etc/UTC)"); configs["IANAZoneTime"] = timeUtils.DEFAULT_TIMEZONE; }
    else if ( typeof configs.IANAZoneTime !== "string" ){ incorrect.push("IANAZoneTime (default Etc/UTC)"); configs["IANAZoneTime"] = timeUtils.DEFAULT_TIMEZONE; }
    else if ( !DateTime.local().setZone(configs.IANAZoneTime).isValid ){ incorrect.push("IANAZoneTime (default Etc/UTC)"); configs["IANAZoneTime"] = timeUtils.DEFAULT_TIMEZONE; }

    //default newfile
    if ( !configs.hasOwnProperty("logsFileMode") ){ missing.push("logsFileMode (default newfile)"); configs["logsFileMode"] = logging.DEFAULT_LOGS_FILE_MODE; }
    else if ( configs.logsFileMode !== "append" && configs.logsFileMode !== "daily" && configs.logsFileMode !== "newfile" && configs.logsFileMode !== "overwrite" && configs.logsFileMode !== "none" ){ incorrect.push("logsFileMode (default newfile)"); configs["logsFileMode"] = logging.DEFAULT_LOGS_FILE_MODE; }
    if ((configs.logsFileMode !== "none") && (configs.logsFileMode !== ""))  globals["LogsToFile"] = true;
    else globals["LogsToFile"] = false;

    //default "[started]"
    if ( !configs.hasOwnProperty("startupStatusText") ){ missing.push("startupStatusText (default \"[started]\")"); configs["startupStatusText"] = DEFAULT_START_STATUS_TEXT; }
    else if ( typeof configs.startupStatusText !== "string" ){ incorrect.push("startupStatusText (default \"[started]\")"); configs["startupStatusText"] = DEFAULT_START_STATUS_TEXT; }
    
    //default "[idle]"
    if ( !configs.hasOwnProperty("idleStatusText") ){ missing.push("idleStatusText (default \"[idle]\")"); configs["idleStatusText"] = DEFAULT_IDLE_STATUS_TEXT; }
    else if ( typeof configs.idleStatusText !== "string" ){ incorrect.push("idleStatusText (default \"[idle]\")"); configs["idleStatusText"] = DEFAULT_IDLE_STATUS_TEXT; }

    //default "[shutdown]"
    if ( !configs.hasOwnProperty("shutdownStatusText") ){ missing.push("shutdownStatusText (default \"[shutdown]\")"); configs["shutdownStatusText"] = DEFAULT_SHUTDOWN_STATUS_TEXT; }
    else if ( typeof configs.shutdownStatusText !== "string" ){ incorrect.push("shutdownStatusText (default \"[shutdown]\")"); configs["shutdownStatusText"] = DEFAULT_SHUTDOWN_STATUS_TEXT; }



    if (invalid){
        botEventEmitter.emit('configsCriticalError', missing, incorrect);
        throw new Error("Invalid configs.json ::  missing configs:  \n["+missing.toString().replace(/,/g, ", ")+"]   \n\nincorrect configs: \n["+incorrect.toString().replace(/,/g, ", ")+"]");
    }
        
    if (missing.length > 0){
        console.log("--configs.json used defaults for the following missing entries ::   ["+missing.toString().replace(/,/g, ", ")+"]");
    }
    if (incorrect.length > 0){
        console.log("--configs.json used defaults for the following incorrect entries ::   ["+incorrect.toString().replace(/,/g, ", ")+"]");
    }
    botEventEmitter.emit('configsError',null, missing, incorrect);


    globals["configs"] = configs;
    queueCapacity = configs.workQueueCapacity;
    scanDepth = configs.scanDepth;

    miscUtils.deepFreeze(globals.configs);
    freezeGlobal("configs");
    freezeGlobal("LogsToFile");

    botEventEmitter.emit('configsVerified');
}

//#endregion Acquire



//================================================================
// Startup Tasks
//----------------------------------------------------------------
//#region Startup Tasks

/** Run the __core__ startup tasks */
async function coreStartupTasks (){
    logging.log(globals, "\nRunning core startup tasks");
    for (let fileName in __core__){
        if (__core__[fileName].hasOwnProperty('__startup')){
            logging.log(globals, "-- running startup tasks for "+fileName);
            await __core__[fileName].__startup(globals);
        }
        else logging.log(globals, "-- no startup tasks for "+fileName);
    }
}

/**
 * run the startup (pre-start) tasks
 */
async function startupTasks (){
    await coreStartupTasks();
    logging.log(globals, "\nRunning startup tasks");

    if (fs.existsSync(startupPath)) {
        logging.log(globals, "--scanning _startup directory: ");
        let files = fs.readdirSync(startupPath);
        botEventEmitter.emit('startupTasks', files.length, startupPath);
        let innerDirs = [];
        let count_s = 0;

        /* scan startup dir */
        for ( let file of files ){
            botEventEmitter.emit('startupTask', count_s++, startupPath+file);
            if ((file.startsWith("_")) ||  (file === "README.txt"))  continue;
            if (file.endsWith('.js')){
                let jsFile = require(relativePath(startupPath+file));
                let filePath = path.normalize(startupPath+file);
                let requesters = null;
                if ( _requisites.startupTasks.hasOwnProperty(filePath) ){
                    requesters = _requisites.startupTasks[filePath];
                    delete _requisites.startupTasks[filePath];
                }
                if ( jsFile.hasOwnProperty("func")){
                    logging.log(globals, "    running  \""+file+"\""+ (requesters ? "\n      requested by: [ "+requesters.join(", ")+" ]" : "") );
                    try{ await jsFile.func(globals); }
                    catch (err){
                        botEventEmitter.emit('startupError', err);
                        console.error("ERROR during startup: "+file+" ::\n"+err);
                        throw err;
                    }
                }
            }
            else if ( fs.lstatSync(startupPath+file).isDirectory() ){ //parse 1 layer of directories, but no deeper
                innerDirs.push(file+"/");
            }
        }
        botEventEmitter.emit('startupTask', files.length, null);

        /* scan inner dirs */
        for (let inner_dir of innerDirs){
            logging.log(globals, "--scanning _startup inner directory ["+inner_dir+"]: ");
            let files = fs.readdirSync(startupPath+inner_dir);
            botEventEmitter.emit('startupTasks', files.length, startupPath+inner_dir);
            let count_inner = 0;
            
            for ( let file of files ){
                botEventEmitter.emit('startupTask', count_inner++, startupPath+inner_dir+file);
                if ((file.startsWith("_")) ||  (file === "README.txt"))  continue;
                if (file.endsWith('.js')){
                    let jsFile = require(relativePath(startupPath+inner_dir+file));
                    let filePath = path.normalize(startupPath+inner_dir+file);
                    let requesters = null;
                    if ( _requisites.startupTasks.hasOwnProperty(filePath) ){
                        requesters = _requisites.startupTasks[filePath];
                        delete _requisites.startupTasks[filePath];
                    }
                    if ( jsFile.hasOwnProperty("func")){
                        logging.log(globals, "    running  \""+file+"\""+ (requesters ? "\n      requested by: [ "+requesters.join(", ")+" ]" : "") );
                        try{ await jsFile.func(globals); }
                        catch (err){
                            botEventEmitter.emit('startupError', err);
                            console.error("ERROR during startup: "+file+" ::\n"+err);
                            throw err;
                        }
                    }
                }
            }
            botEventEmitter.emit('startupTask', files.length, null);
        }
    }
    else 
        logging.log(globals, "--directory not found");

    await runRequisiteStartupFunctions().catch(err => { throw (err) });
    botEventEmitter.emit('startupTasksComplete');
}
/**
 * run additional requisite startup (pre-start) functions
 */
async function runRequisiteStartupFunctions (){
    /** run additional requisite startup tasks **/
    let numReqs = Object.keys(_requisites.startupTasks).length;
    if ( numReqs > 0 ){
        botEventEmitter.emit('startupTasks', numReqs, "requisite startup tasks");
        logging.log(globals, "--running requisite startup tasks");
        let count_s = 0;
        let to_delete = [];
        for (let task in _requisites.startupTasks){
            botEventEmitter.emit('startupTask', count_s++, task);
            if (task.endsWith('.js')){ //task is fileName with array of requesters
                let jsFile = require(relativePath(task));
                let requesters = _requisites.startupTasks[task];
                let file = path.basename(task);
                if ( jsFile.hasOwnProperty("func")){
                    logging.log(globals, "    running  \""+file+"\""+ (requesters ? "\n      requested by: [ "+requesters.join(", ")+" ]" : "") );
                    try{ await jsFile.func(globals); }
                    catch (err){
                        botEventEmitter.emit('startupError', err);
                        console.error("ERROR during startup: "+file+" ::\n"+err);
                        throw err;
                    }
                    to_delete.push(task);
                }
            }
            else if (task.endsWith("|func")){ //task is groupName with array of func
                logging.log(globals, "    running startup tasks for  \""+task+"\"");
                for (let func of _requisites.startupTasks[task]){
                    try{ await func(globals); }
                    catch (err){
                        botEventEmitter.emit('startupError', err);
                        console.error("ERROR during startup: "+task+" ::\n"+err);
                        throw err;
                    }
                }
                to_delete.push(task);
            }
        }
        botEventEmitter.emit('startupTask', numReqs, null);
        for (let task of to_delete){ //clean up
            delete _requisites.startupTasks[task];
        }
    }
}



//#endregion Startup Tasks



//================================================================
// Shutdown Tasks
//----------------------------------------------------------------
//#region Shutdown Tasks

let count_sdt = 0;

/** Run the __core__ shutdown tasks */
async function coreShutdownTasks (){
    let logger =  (logging.isReady() ? (str) => { logging.log(globals, str) } : (str) => console.log(str));
    logger("\nRunning core shutdown tasks");
    for (let fileName in __core__){
        botEventEmitter.emit('shutdownTask', count_sdt++, fileName);
        if (__core__[fileName].hasOwnProperty('__shutdown')){
            logger("-- running shutdown tasks for "+fileName);
            await __core__[fileName].__shutdown(globals);
        }
        else logger("-- no shutdown tasks for "+fileName);
    }
}


/**
 * Perform all shutdown tasks.
 * clear all timeouts, intervals, and shutdown functions
 */
 async function shutdownTasks (){
    let logger =  (logging.isReady() ? (str) => { logging.log(globals, str) } : (str) => console.log(str));
    let errLogger = (logging.isReady() ? (str) => { logging.log(globals, str) } : (str) => console.error(str));
    count_sdt = 0;
    let numShutdownFuncs = Object.keys(_requisites.shutdownTasks).map(group => _requisites.shutdownTasks[group].length);
    if (numShutdownFuncs.length == 0) numShutdownFuncs = [0];
    let totalShutdownTasks = Object.keys(__core__).map(f => __core__[f].hasOwnProperty('__shutdown')).length
        +  numShutdownFuncs.reduce((acc, next) => acc+=next);
    botEventEmitter.emit('shutdownTasks', totalShutdownTasks);

    await coreShutdownTasks();

    logger("\nRunning shutdown tasks");
    for (let shutdown_src in _requisites.shutdownTasks){
        logger("--running shutdown task: "+shutdown_src);
        for (let shutdown_func of _requisites.shutdownTasks[shutdown_src]){
            botEventEmitter.emit('shutdownTask', count_sdt++, shutdown_src);
            try{ await shutdown_func(globals); }
            catch(err){ errLogger("----error ::   "+err); }
        }
    }
    botEventEmitter.emit('shutdownTask', totalShutdownTasks, null);
    botEventEmitter.emit('shutdownTasksComplete');
}


/**
 * Run all related shutdown tasks for a given command name or task group name
 * @param {String} targetName name of the command 
 * @param {(content: String) => void} [logger] 
 */
async function triggerShutdownTasks (targetName, logger){
    if (!logger) logger = (content) => {logging.log(globals, content)};
    let shutdownTasks = Object.keys(_requisites.shutdownTasks).filter(taskName => taskName.startsWith(targetName+"|") || taskName === targetName);
    for ( let taskName of shutdownTasks ){
        logger(globals,"--running linked shutdown functions under task name: "+taskName);
        let shutdown_funcs = _requisites.shutdownTasks[taskName];
        for ( let shutdown_func of shutdown_funcs ){
            try{ await shutdown_func(globals); }
            catch(err){ 
                logger(globals, "----error ::   "+err); 
                console.error(err); 
                throw new Error("an error occured when trying to run shutdown functions to properly detach the command:\n"+err);
            }
        }
    }
}

//#endregion Shutdown Tasks



//================================================================
// Handle
//----------------------------------------------------------------
//#region Handle

/**
 * handle any command requests, first parsing the command and acknowledging the msg 
 * @param {Discord.Message} msg 
 */
function handleRequest (msg){
    if (!globals) return;
    let requestBody;
    if (msg.content.startsWith("<@"+globals.bot_id+">")){
        requestBody = msg.content.substring(("<@"+globals.bot_id+">").length).trim();
    }
    else if (msg.content.startsWith("<@!"+globals.bot_id+">")){
        requestBody = msg.content.substring(("<@!"+globals.bot_id+">").length).trim();
    }
    else
        requestBody = msg.content.substring(configs.prefix.length).trim();
    let command;
    let content;
    if ( requestBody.includes(' ') && 
        !(requestBody.indexOf('\n') < requestBody.indexOf(' ') && requestBody.includes('\n')) //args on newline, pass to next cond
    ){
        command = requestBody.substring(0,requestBody.indexOf(' ')).trim();
        content = requestBody.substring(requestBody.indexOf(' ')+1).trim();
    }
    else if (requestBody.includes('\n')){
        command = requestBody.substring(0,requestBody.indexOf(' ')).trim();
        content = requestBody.substring(requestBody.indexOf(' ')+1).trim();
    }
    else {
        command = requestBody.trim();
        content = "";
    }
    msg.react('👌');
    
    botEventEmitter.emit('commandAcknowledged',msg,command,content);

    commandHandler(msg, command, content)
    .catch( (/** @type {Error} */err) => {
        botEventEmitter.emit('commandError',err);
        msg.react('❌');
        logging.log(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
        msg.reply(err.toString());
    }); 
}



/**
 * handle a command with given args
 * @param {Discord.Message} msg 
 * @param {String} command the command name
 * @param {String} content content/args of the command
 * @param {{
 *      ignoreQueue: Boolean,
 *      reactResult: Boolean,
 *      replyBusy: Boolean,
 * }} [options] 
 ** ignoreQueue :  whether to ignore the queue (still adds to queue count if blocking)
 ** reactResult :  whether to react with the result of the request
 ** replyBusy :  whether to reply when busy with stuff
 */
async function commandHandler(msg, command, content, options){
    if (!globals) return;

    let ignoreQueue = (options?.ignoreQueue ?? false);
    let reactResult = (options?.reactResult ?? true);
    let replyBusy = (options?.replyBusy ?? true);

    let member = msg.member;

    /* modular  and  blocking built-in  commands */
    if ( modularCommands.hasOwnProperty(command) || blocking_built_in_funcs.includes(command) ){
        let requiredAuthLevel;
        if ( blocking_built_in_funcs.includes(command) ){
            requiredAuthLevel = configs.built_in_AuthLevels[command]; //built_in_commands[command].auth_level;
        }
        else  requiredAuthLevel = modularCommands[command].auth_level; 

        if ( !(await auth.checkMemberAuthorized(globals, member, requiredAuthLevel, msg.guild.id, false).catch(err =>{ throw (err) }) ) ){
            botEventEmitter.emit('commandError',"Insufficient permissions to run ["+command+"]");
            if (reactResult) msg.react('❌');
            logging.log(globals,"--Insufficient permissions to run ["+command+"] ::  lv. "+requiredAuthLevel+" required");
            msg.reply("Insufficient permissions to run ["+command+"]");
            return;
        }
        //console.log("DEBUG current queue :  "+queueLength+" / "+queueCapacity);
        if ( (queueLength >= queueCapacity) && !ignoreQueue ){
            console.log("## Queue capacity reached, ignoring command ["+command+"] from "+member.displayName+"#"+member.user.discriminator);
            botEventEmitter.emit('commandError',"Queue capacity reached, ignoring command ["+command+"] from "+member.displayName+"#"+member.user.discriminator);
            if (reactResult) msg.react('❌');
            msg.reply("Too many commands queued, try again later");
            return;
        }
        queueLength ++;
        if ( workLock.isBusy() && replyBusy ){
            msg.reply("I'm busy with something at the moment\n Please wait and I'll get back to your request in a moment");
        }
        
        let content_line = content.replace(/\n/g, ' `\\n` ');
        await workLock.acquire("["+command/*+"  "+content_line*/+"] req from "+member.displayName+"#"+member.user.discriminator);
        logging.log(globals,"\n\n"+(globals.configs.timestamp ? "("+timeUtils.getTimeString(globals)+")\n" :"")+"Processing command ["+command+"]\n  from "+member.displayName+"#"+member.user.discriminator+"\n    in channel #"+msg.channel.name+":"+msg.channel.id+" of server ["+msg.guild.name+":"+msg.guild.id+"]\n  with args ::   "+content_line);
        
        if ( await auth.checkMemberAuthorized(globals, member, requiredAuthLevel, msg.guild.id, true).catch(err =>{ throw (err) }) ){ //recheck auth in case changed while waiting
            msg.reply("processing request ["+command+"]");
            await utils.change_status(client, 'dnd', "[working for "+member.displayName+"#"+member.user.discriminator+"]")
            .catch(err =>{
                logging.log(globals,"## err occured on setting status: "+err); //catch but continue on
            });

            /* handle built-in (blocking) command  OR  handle modularCommand */
            (blocking_built_in_funcs.includes(command) ? built_in_commands[command].func(msg, content, command) : modularCommands[command].func(globals, msg, content))
            .then(completionMessage => {
                botEventEmitter.emit('commandComplete',command);
                if (reactResult) msg.react('✅');
                logging.log(globals, (globals.configs.timestamp ? "\n("+timeUtils.getTimeString(globals)+")" :"")+"\nCompleted request\n");
                if (completionMessage) msg.reply(completionMessage); //send if one is given       
            })
            .catch(err => {
                botEventEmitter.emit('commandError',err);
                if (reactResult) msg.react('❌');
                logging.log(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
                msg.reply(err.toString());
                return;
            })
            .finally(_ =>{ 
                queueLength --; 
                utils.change_status(client, 'idle', configs.idleStatusText)
                .catch(err => { 
                    logging.log(globals,"## err occured on returning status: "+err); 
                    msg.channel.send("Error ::  "+err + "\n\nMy status should be 'idle'."); 
                    return;
                })
                .finally(_ => {
                    workLock.release("["+command/*+"  "+content_line*/+"] req from "+member.displayName+"#"+member.user.discriminator);
                });
            });
        }
        else{ // insufficient permissions when handling the command
            workLock.release("insufficient auth on ["+command+"] req from "+member.displayName+"#"+member.user.discriminator);
            botEventEmitter.emit('commandError',"Insufficient permissions to run ["+command+"]");
            if (reactResult) msg.react('❌');
            msg.reply("Insufficient permissions to run ["+command+"]");
        }
    }

    /* non-blocking built-in commands */
    else if ( nonblocking_built_in_funcs.includes(command) ){
        let requiredAuthLevel = configs.built_in_AuthLevels[command]; //built_in_commands[command].auth_level;
        if ( !(await auth.checkMemberAuthorized(globals, member, requiredAuthLevel, msg.guild.id, false).catch(err =>{ throw (err) }) ) ){
            botEventEmitter.emit('commandError',"Insufficient permissions to run ["+command+"]");
            if (reactResult) msg.react('❌');
            msg.reply("Insufficient permissions to run ["+command+"]");
            return;
        }
        built_in_commands[command].func(msg, content, command)
        .then(completionMessage => {
            botEventEmitter.emit('commandComplete',command);
            if (reactResult) msg.react('✅'); 
            logging.awaitLog(globals,(globals.configs.timestamp ? "\n("+timeUtils.getTimeString(globals)+")" :"")+"\nCompleted request\n", logging.DEFAULT_AWAIT_LOGS_TIME);
            if (completionMessage) msg.reply(completionMessage); //send if one is given
        })
        .catch(err => {
            logging.awaitLog(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack, logging.DEFAULT_AWAIT_LOGS_TIME);
            botEventEmitter.emit('commandError',err);
            if (reactResult) msg.react('❌');
            msg.reply(err.toString());
            return;
        });
    }


    /* only prefix given */
    else if ( command === "" ){
        botEventEmitter.emit('commandComplete',command);
        if (reactResult) msg.react('🤔');
        msg.reply("Try --help or --commands for a list of commands and short documentation");
    }


    /* unknown command */
    else {
        botEventEmitter.emit('commandError',"Unknown command");
        if (reactResult) msg.react('🤔');
        msg.reply("`"+configs.prefix+command+"` command unknown, try --help or --commands for a list of commands and short documentation");
    }
}



/**
 * search message for any reactable content and handle
 * @param {Discord.Message} msg 
 * @returns 
 */
async function handleReactables (msg){ 
    if (!globals) return;
    for ( let _replyFile in modularReactables ){
        const replyFile = modularReactables[_replyFile];

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
                return; //if msg.content in exact then no need to check the rest
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
                        let directed = false;
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

        if ( replyFile.hasOwnProperty("regex") ){
            for ( let key in replyFile.regex ){
                let re = replyFile.regex[key].re;
                if (msg.content.match(re)){
                    if ( replyFile.regex[key].hasOwnProperty("reactions") ){
                        for ( let reaction of replyFile.regex[key].reactions ){
                            await msg.react(reaction);
                        }
                    }
                    if ( replyFile.regex[key].hasOwnProperty("reply") ){
                        let directed = false;
                        if ( replyFile.regex[key].hasOwnProperty("directed") )
                            { directed = replyFile.regex[key].directed; }
                        if ( directed )
                            { await msg.reply(replyFile.regex[key].reply); }
                        else 
                            { await msg.channel.send(replyFile.regex[key].reply); }
                    }
                }
            }
        }
    }
}




/**
 *  Use with caution! 
 * --
 ** behavior on fake message is not guaranteed
 ** `sendMessage` is recommended to be set `true`
 * ----
 * The bot will send a command by its own authority (intended for use via startup or GUI)
 * @param {Boolean} sendMessage whether to send a message before running the command to use as the source message, 
 * or to create a fake message to use as the source message for the command
 * @param {String} reason a reason for sending this self-command
 * @param {String} command 
 * @param {String|""} content 
 * @param {Discord.Snowflake} serverID 
 * @param {Discord.Snowflake} channelID 
 * @param {Discord.Snowflake|""|undefined} [messageID] optionally can add a message id to target an existing message 
 ** if the provided ID exists then the real message will be force fetched and cached to fix any bad caching
 ** else a snowflake will be generated via the current time
 * @throws {Error}
 */
async function selfCommand (sendMessage, reason, command, content, serverID, channelID, messageID = ""){
    botEventEmitter.emit('selfCommandReceived', serverID+"/"+channelID+"/"+messageID, reason, sendMessage, command, content);
    if (sendMessage){
        let server = client.guilds.resolve(serverID);
        if (!server) {
            botEventEmitter.emit('selfCommandError', "Invalid server id");
            logging.log(globals,"ERROR during selfCommand ::  Invalid server id");
            throw new Error("Invalid server id");
        }
        server = await server.fetch();
        let channel = server.channels.resolve(channelID);
        if (!channel) {
            botEventEmitter.emit('selfCommandError', "Invalid channel id");
            logging.log(globals,"ERROR during selfCommand ::  Invalid channel id");
            throw new Error("Invalid channel id");
        }
        if (channel.type !== "GUILD_TEXT"){
            botEventEmitter.emit('selfCommandError', "Invalid channel type: "+channel.type);
            logging.log(globals,"ERROR during selfCommand ::  Invalid channel type: "+channel.type);
            throw new Error("Invalid channel type: "+channel.type);
        }
        let msg = await channel.send("selfCommand: "+reason+"```\n"+configs.prefix+" "+command+" "+content+"```");
        await commandHandler(msg, command, content, {ignoreQueue: true, reactResult: true, replyBusy: false})
        .then(_ => botEventEmitter.emit('selfCommandComplete'))
        .catch(err => {
            botEventEmitter.emit('selfCommandError', err);
            logging.log(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
            msg.react('❌');
            msg.reply("selfCommand error ::   "+err);
            throw (err);
        });
    }
    else {
        let msg = await utils.createFakeMessage(client, channelID, serverID, content, messageID);
        if (!msg) {
            botEventEmitter.emit('selfCommandError', "Invalid server or channel id");
            logging.log(globals,"ERROR during selfCommand ::  Invalid server or channel id");
            throw new Error("Invalid server or channel id");
        }
        await commandHandler(msg, command, content, {ignoreQueue: true, reactResult: false, replyBusy: false})
        .then(_ => botEventEmitter.emit('selfCommandComplete'))
        .catch(err => {
            botEventEmitter.emit('selfCommandError', err);
            logging.log(globals,"\nERROR in handling command\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
            throw (err);
        });
    }
}

//#endregion Handle



//================================================================
// Built-in commands
//----------------------------------------------------------------
//#region Built-in


//"**--**  ->  ``\n" +
//"~~**•** >~~  *description* \n" +

//behavior when setting blocking to false is uncertain
/**
 * @type {{[build_in_command: String]: {
 *      disable : Boolean,
 *      blocking : Boolean,
 *      manual : String,
 *      func : (msg, content, cmd) => Promise<String|void>
 * }}}
 */
const built_in_commands = {
    "--version":{
        disabled: false,
        blocking: false,
        manual: "**--version**  ->  \\*none\\*\n" +
        "~~**•** >~~  *replies with the discord bot version*",
        func: _versionCommand
    },
    "--help":{
        disabled: false,
        blocking: true,
        manual: "**--help**  ->  \\*none\\* ~~  *or* ~~  all ~~  *or*  ~~ \\*commandName\\* ~~  *or*  ~~ \\**keywords*\\*\n" +
        "~~**•** >~~  *if \\*none\\* is given then it will send the help command manual*\n"+
        "~~**•** >~~  *if* **all** *is given then it will send a list of all commands*\n"+
        "~~**•** >~~  *if \\*commandName\\* is given then it will send the manual for that command*\n"+
        "~~**•** >~~  *if \\**keywords*\\* (split by a single empty space) are given then it will try to send a list of all commands that contain all of those keywords*\n",
        func: _helpCommand
    },
    "--commands":{
        disabled: false,
        blocking: null,  //will be set equal to --help
        manual: "**--commands** ->  \\*none\\*   *or*   all   *or*   \\*commandName\\*   *or*   \\**keywords*\\*\n" +
        "~~**•** >~~  *an alias for the \"--help\" command*",
        func: _helpCommand
    },
    "--ping":{
        disabled: false,
        blocking: false,
        manual: "**--ping**  ->  \\*none\\*\n" +
        "~~**•** >~~  *ping the discord bot which will reply pong and, if enabled, flash its status indicator*",
        func: _pingCommand
    },
    "--time":{
        disabled: false,
        blocking: false,
        manual: "**--time**  ->  \\*none\\*\n" +
        "~~**•** >~~  *returns the time*",
        func: _timeCommand
    },
    "--shutdown":{
        disabled: true,
        blocking: true, //MUST be true
        manual: "**--shutdown**  ->  \\*none\\*\n" +
        "~~**•** >~~  *close all listening instances of the discord bot*",
        func: _shutdownCommand
    },
    "--restart":{
        disabled: true,
        blocking: true, //MUST be true
        manual: "**--restart**  ->  \\*none\\*\n" +
        "~~**•** >~~  *soft restart all listening instances of the discord bot*",
        func: _restartCommand
    },
    "--detach":{
        disabled: false,
        blocking: true, //behavior unknown if false
        manual: "**--detach** ->  command/reactable *fileName* \n"+
        "~~**•** >~~  *unlink or remove a command or reactable module from the bot, making it unaccessible*\n"+
        "~~**•** >~~  *only the base file name should be provided, not including the extension type*",
        func: _detachCommand
    },
    "--import":{
        disabled: false,
        blocking: true, //behavior unknown if false
        manual: "**--import** ->  command/reactable *path/to/file/from/cwd/fileName.js* \n"+
        "~~**•** >~~  *import a command or reactable (or reimport if command already imported)*\n"+
        "~~**•** >~~  *if a command is imported then it will (re)import any requisite utils or commands and run any startup*\n"+
        "~~**•** >~~  *the path given should be relative to the respective directory; \"_commands\" for command files, and \"_reactables\" for emoji reaction files*\n"+
        "~~**•** >~~  *multiple commands/reactables can be imported by separating the given paths with a vertical bar character* ` | `",
        func: _importCommand
    },
    "--reimport":{
        disabled: false,
        blocking: true, //behavior unknown if false
        manual: "**--reimport** ->  configs   *and/or*   reactables\n"+
        "~~**•** >~~  *will reimport both or one of configs and/or reactables*\n"+
        "~~**•** >~~  *for example `--reimport reactables configs`*",
        func: _reimportCommand
    }
}
built_in_commands['--commands']['blocking'] = built_in_commands['--help'].blocking;
for (let f in built_in_commands){ if (built_in_commands[f].disabled) delete built_in_commands[f]; }
Object.freeze(built_in_commands);
for (let f in built_in_commands){ Object.freeze(built_in_commands[f]); }

const nonblocking_built_in_funcs = Object.keys(built_in_commands).filter(cmd => !built_in_commands[cmd].blocking);
const blocking_built_in_funcs = Object.keys(built_in_commands).filter(cmd => built_in_commands[cmd].blocking);
Object.freeze(nonblocking_built_in_funcs);
Object.freeze(blocking_built_in_funcs);

/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _versionCommand (msg, content, cmd){
    const logger = (built_in_commands[cmd].blocking ? logging.log : logging.awaitLog);
    logger(globals,"\nreceived version query\n["+_package.name+"]   version -- "+_package.version+"\n\n", logging.DEFAULT_AWAIT_LOGS_TIME); 
    if (msg) msg.reply("["+_package.name+"]   version -- "+_package.version); 
    else return "["+_package.name+"]   version -- "+_package.version;
}



/** @param {Discord.Message} msg @param {String} content @throws {Error} @returns {void|String} return string of results if no msg is given */
async function _helpCommand (msg, content, cmd){
    const logger = (built_in_commands[cmd].blocking ? logging.log : logging.awaitLog);
    logger(globals,"received request [help] or [commands]", logging.DEFAULT_AWAIT_LOGS_TIME);
        
    if ( content === "" ){
        if (msg){
            await msg.reply("This is the usage manual for searching for other usage manuals: \n"+built_in_commands["--help"].manual);
            await msg.channel.send(command_description);
            return;
        }
        else
            return "This is the usage manual for searching for other usage manuals: \n"+built_in_commands["--help"].manual+"\n\n"+command_description;
    }

    if ( content === "all" || content === "-all" || content === "--all" ){
        let all = ""
        for (let builtin of nonblocking_built_in_funcs){ all += builtin +"\n"; }
        for (let builtin of blocking_built_in_funcs){ all += builtin +"\n"; }
        for (let modularCommand in modularCommands){ all += modularCommand +"\n"; }
        if (msg) {
            utils.sendMessage(msg,all,false);
            return;
        }
        else return all;
    }
    
    if ( nonblocking_built_in_funcs.includes(content) || blocking_built_in_funcs.includes(content)) {
        let manual = built_in_commands[content].manual;
        if (msg){
            utils.sendMessage(msg,manual,true); //await msg.reply(manual);
            return;
        }
        else return manual;
    }

    if ( modularCommands.hasOwnProperty(content) ){
        let jsFile = modularCommands[content];
        let manual = jsFile.manual+"\nversion:  "+jsFile.version+"\nauthorization Lv."+jsFile.auth_level;
        if (msg){
            utils.sendMessage(msg,manual,true); //await msg.reply(manual);
            return;
        }
        else return manual;
    }

    let keywords = content.split(" "); //split by spaces
    let remaining_keywords = Array.from(keywords);
    await msg.reply("The following keywords are being used list matching command names\n["+keywords.toString().replace(/,/g, ", ")+"]");
    let matches = new Set();
    let allList = [];
    allList = allList.concat(Object.keys(built_in_commands), Object.keys(modularCommands));

    let keyword = remaining_keywords.shift();
    for (let cmd of allList){
        if ( cmd.includes(keyword) ) matches.add(cmd);
    }
    if (matches.size == 0){
        if (msg){
            await msg.reply("No matches found for the provided keywords");
            return;
        }
        else return "The following keywords are being used list matching command names\n["+keywords.toString().replace(/,/g, ", ")+"]\n"+"No matches found for the provided keywords";
    }
    
    while (remaining_keywords.length > 0){ 
        let keyword = remaining_keywords.shift();
        for ( let command_match of matches.keys() ){
            if ( !command_match.includes(keyword) ) { matches.delete(command_match); }
        }
    }
    let command_matches = [...matches.keys()].toString().replace(/,/g, "\n");
    if (msg) utils.sendMessage(msg,command_matches,false);
    else return "The following keywords are being used list matching command names\n["+keywords.toString().replace(/,/g, ", ")+"]\n"+command_matches;
}



/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _pingCommand (msg, content, cmd){
    const logger = (built_in_commands[cmd].blocking ? logging.log : logging.awaitLog);
    if (msg) msg.reply("pong");
    if (built_in_commands[cmd].blocking){ //if blocking, do status flashing
        let blink_time = 1000;
        await client.user.setStatus('online').catch(err => { console.log("## err in status_blink ::  "+err); });
        await miscUtils.sleep(blink_time);        
        await client.user.setStatus('dnd').catch(err => { console.log("## err in status_blink ::  "+err); });
        await miscUtils.sleep(blink_time);
        await client.user.setStatus('online').catch(err => { console.log("## err in status_blink ::  "+err); });
        await miscUtils.sleep(blink_time);
        await client.user.setStatus('dnd').catch(err => { console.log("## err in status_blink ::  "+err); });
        await miscUtils.sleep(blink_time);
        await utils.change_status(client, 'idle', globals.configs.idleStatusText).catch(err => { throw ("error occured on returning status in status_blink: "+err); });
        logger(globals,  "--blink done", logging.DEFAULT_AWAIT_LOGS_TIME);
    }
    
    
    return;
}


/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _timeCommand (msg, content, cmd){ 
    msg.reply(timeUtils.getDateTimeString(globals));
}



/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _shutdownCommand (msg, content, cmd){
    let shutdownCommand = async (_) => {
        logging.log(globals,'--bot shutting down');
        if (msg) await msg.react('👋').catch(err => { logging.log(globals,'\n\n# ERR shutting down [react]  \n'+err); });
    
        try { await utils.change_status(client, 'dnd', configs.shutdownStatusText); }
        catch(err){ logging.log(globals,'\n\n# ERR shutting down [status]  \n'+err); }
        finally {
            try{ if (msg) await msg.channel.send("i must go, my pepol call me!"); }
            catch (err){ console.log('\n\n# ERR shutting down [msg]  \n'+err); throw (err); }
            finally {
                await miscUtils.sleep(3000); 
                await shutdown();
                console.log("process exit in 5seconds");
                await miscUtils.sleep(5000); 
                console.log("exiting");
                if (msg) process.exit(); //hard closeEvent
                else return;
            }
        }
    }
    if (msg){
        await interactables.button_confirm(globals, {
            targetChannel: msg.channel,
            requester: "Shutdown_command["+msg.author.id+"]",
            options: {
                reply: { messageReference: msg.id }, 
                content: "Shutdown the bot ?"
            },
            window: 30, 
            authorizedUsers: [msg.author.id],
            awaitLock: built_in_commands[cmd].blocking,
            acceptCallback: shutdownCommand,
            rejectCallback: async _ => { await msg.reply("REJECTED -> shutdown abandoned"); }
        });
    }
    else return shutdownCommand();
}



/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _restartCommand (msg, content, cmd){
    let restartCommand = async (_) => {
        logging.log(globals,'--bot restarting');
        if (msg){
            await soft_restart(msg);
            return "Restart complete";
        }
        else {
            try { await soft_restart(msg); }
            catch (err){ throw (err); }
        }
    }
    if (msg){
        await interactables.button_confirm(globals, {
            targetChannel: msg.channel,
            requester: "Restart_command["+msg.author.id+"]",
            options: {
                reply: { messageReference: msg.id }, 
                content: "Restart the bot ?"
            },
            window: 30, 
            authorizedUsers: [msg.author.id],
            awaitLock: built_in_commands[cmd].blocking,
            acceptCallback: restartCommand,
            rejectCallback: async _ => { await msg.reply("REJECTED -> restart abandoned"); }
        });
    }
    else return restartCommand();
}



/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _detachCommand (msg, content, cmd){
    //const logger = (built_in_commands[cmd].blocking ? logging.log : logging.awaitLog);
    if (content === "")  throw ("No args were given");
        let import_type;
        let targetName;
        if (content.includes(' ')){
            import_type = content.substring(0,content.indexOf(' ')).trim();
            targetName = content.substring(content.indexOf(' ')+1).trim();
        }
        
        switch (import_type) {
            case "command":{
                if ( modularCommands.hasOwnProperty(targetName) ){
                    let commandDetacher = async _ => {
                        logging.log(globals,"DETACH_CONFIRM\n  Requester: "+(msg ? msg.author.tag+" : "+msg.author.id : "SYS")+"\n--detaching command ["+targetName+"]");
                        await triggerShutdownTasks(targetName);
                        delete require.cache[require.resolve( relativePath(modularCommands[targetName].__filePath) )];
                        delete modularCommands[targetName];
                        if (msg) await msg.reply("request complete;  ["+targetName+"] detached");
                        else return "request complete\n["+targetName+"] detached";
                    }
                    if (msg){
                        //let rc_message = await msg.channel.send("React with 🟢 to confirm detachment of command ["+targetName+"]\n\nOrgin: "+modularCommands[targetName].__filePath+"\nVersion: "+modularCommands[targetName].version+"\nAuth_level: "+modularCommands[targetName].auth_level).catch(err => {throw (err)});
                        await interactables.button_confirm(globals, {
                            targetChannel: msg.channel,
                            requester: "Detach_command["+targetName+"]",
                            //targetMessage: rc_message,
                            options: {
                                reply: { messageReference: msg.id }, 
                                content: "React with 🟢 to confirm detachment of command ["+targetName+"]\n\nOrgin: "+modularCommands[targetName].__filePath+"\nVersion: "+modularCommands[targetName].version+"\nAuth_level: "+modularCommands[targetName].auth_level + ((_requesters.hasOwnProperty(targetName) && _requesters[targetName].length > 0) ? "\nCommands requiring/requesting this command: ```"+ _requesters[targetName].join("\n") +"```" : "")
                            },
                            window: 30, 
                            authorizedUsers: [msg.author.id],
                            awaitLock: true,
                            acceptCallback: commandDetacher,
                            rejectCallback: async _ => { await msg.reply("REJECTED -> detach abandoned"); }
                        });
                    }
                    else {
                        try{ await commandDetacher(); }
                        catch (err){ throw (err); }
                    }
                }
                else {
                    if (msg) msg.reply(import_type+" "+targetName+" not found");
                    else throw new Error( import_type+" "+targetName+" not found" );
                }
                return;
            }
            case "reactable":{
                if ( modularReactables.hasOwnProperty(targetName) ){
                    let reactableDetacher = async _ => {
                        logging.log(globals,"DETACH_CONFIRM\n  Requester: "+(msg ? msg.author.tag+" : "+msg.author.id : "SYS")+"\n--detaching reactable ["+targetName+"]");
                        delete require.cache[relativePath(require.resolve( modularReactables[targetName].__filePath ))];
                        delete modularReactables[targetName];
                        if (msg) await msg.reply("request complete;  ["+targetName+"] detached");
                        else return "request complete\n["+targetName+"] detached";
                    }
                    if (msg){
                        //let rc_message = await msg.channel.send("React with 🟢 to confirm detachment of reactable ["+targetName+"]\n\nOrgin: "+modularCommands[targetName].__filePath).catch(err => {throw (err)});
                        await interactables.button_confirm(globals, {
                            targetChannel: msg.channel,
                            requester: "Detach_reactable["+targetName+"]",
                            //targetMessage: rc_message,
                            options: {
                                reply: { messageReference: msg.id }, 
                                content: "React with 🟢 to confirm detachment of reactable ["+targetName+"]\n\nOrgin: "+modularCommands[targetName].__filePath
                            },
                            window: 30, 
                            authorizedUsers: [msg.author.id],
                            awaitLock: true,
                            acceptCallback: reactableDetacher,
                            rejectCallback: async _ => { await msg.reply("REJECTED -> detach abandoned"); }
                        });
                    }
                    else {
                        try{ await reactableDetacher(); }
                        catch (err){ throw (err); }
                    }
                }
                else {
                    if (msg) msg.reply(import_type+" "+targetName+" not found");
                    else throw new Error( import_type+" "+targetName+" not found" );
                }
                return;
            }
            default:
                throw ("Invalid import type  ["+import_type+"]\nOnly \"command\" and/or \"reactable\"");
        }
}


const importTypes = ["command","reactable","configs"];
/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _importCommand (msg, content, cmd){
    const logger = (built_in_commands[cmd].blocking ? logging.log : logging.awaitLog);

    if (content === "")  throw ("No args were given");
    //"**--import command/reactable/configs *path/to/file/from/cwd/fileName.js*"
    let import_type;
    let originalPaths;
    if (content.includes(' ')){
        import_type = content.substring(0,content.indexOf(' ')).trim().toLowerCase();
        originalPaths = content.substring(content.indexOf(' ')+1).trim();
    }
    else {
        import_type = content.trim().toLowerCase();
        originalPaths = "";
    }
    const importTypeError = "Invalid import type  ["+import_type+"]\nOnly \"command\", \"reactable\", or \"configs\"";
    if ( !importTypes.includes(import_type) ) 
        throw new Error(importTypeError);

    let paths = [];
    let searchPaths = originalPaths.split("|").map(x => x.trim()).filter(x => x!=="");
    if (searchPaths.length == 0 && import_type === "configs")
        paths.push({"filePath": _configsPath, "targetName": "configs", "originalPath": ""});
    else {
        for ( let path of searchPaths ){
            let filePath = "./"+path.normalize( (import_type === "command" ? commandsPath : (import_type === "reactable" ? reactablesPath : "")) + path );
            if (filePath.match(upwardTraversalRegex)) {
                throw new Error("Illegal path;  Path includes upward traversal beyond scope ::   "+path);
            }
            let targetName = (path==="" ? import_type : path.basename(filePath, (import_type==="configs" ? ".json" : ".js")));
            if ( path !== "" && !fs.existsSync(filePath) ){
                throw ("Invalid path:  "+filePath.replace("\\","/"));
            }
            paths.push({"filePath": filePath, "targetName": targetName, "originalPath": path});
        }
    }

    
    switch (import_type) {
        case "command":{
            let commandImportCommand = async (_) => {
                let errors = [];
                let successes = [];
                let invalid = [];
                for (path of paths){
                    try {
                        if (path.originalPath === "") throw new Error("Must provide a filepath");
                        //trigger any linked shutdowns
                        await triggerShutdownTasks(path.targetName, (content) => {logger(globals, content, logging.DEFAULT_AWAIT_LOGS_TIME)});
                        //delete old caches and entries
                        if ( modularCommands.hasOwnProperty(path.targetName) ){ 
                            logger(globals,"--detaching command ["+path.targetName+"]", logging.DEFAULT_AWAIT_LOGS_TIME);
                            delete require.cache[relativePath(require.resolve(path.filePath))];
                            delete modularCommands[path.targetName];
                        }
                        //import file
                        logger(globals, "--importing command ["+path.filePath+"]", logging.DEFAULT_AWAIT_LOGS_TIME);
                        let jsFile = require(path.filePath);
                        if ( jsFile.hasOwnProperty("func") && jsFile.hasOwnProperty("manual") && jsFile.hasOwnProperty("auth_level") ){
                            jsFile["__filePath"] = path.filePath;
                            modularCommands[path.targetName] = jsFile;
                            logger(globals, "----\""+path.filePath+"\" "+(jsFile.version ? " (v"+jsFile.version+") " : "")+"  included  [Lv."+jsFile.auth_level+"]", logging.DEFAULT_AWAIT_LOGS_TIME);
                            successes.push(path.filePath);
                        }
                        else
                            throw ("Invalid modular command file ["+path.filePath+"]");
                        //import and run any additional requisites
                        acquireRequisites( path.targetName, jsFile );
                    }
                    catch (err){
                        invalid.push(err);
                    }
                }
                if (invalid.length > 0)
                    errors.push("ERRORS during import ::  ```"+invalid.join("\n\n")+"```");
                try {
                    importRequisiteCommands();
                    await runRequisiteStartupFunctions();
                }
                catch (err){
                    errors.push("ERROR during import ::  \n"+err);
                }
                return "Request complete.\n"+
                    ((successes.length>0) ? "successfully imported `"+import_type+"` ```"+successes.join("\n")+"```" : "")+
                    ((errors.length>0) ? "\n\n"+(successes.length>0 ? "partially " : "")+"failed to import `"+import_type+"` due to errors :: \n\n"+errors.join("\n\n") : "");
            }
            if (msg){
                await interactables.button_confirm(globals, {
                    targetChannel: msg.channel,
                    requester: "Import_command["+msg.author.id+"]",
                    options: {
                        reply: { messageReference: msg.id }, 
                        content: "Import the following commands ?```"+paths.map(path => path.filePath).join('\n')+"```"
                    },
                    window: 30, 
                    authorizedUsers: [msg.author.id],
                    awaitLock: built_in_commands[cmd].blocking,
                    acceptCallback: commandImportCommand,
                    rejectCallback: async _ => { await msg.reply("REJECTED -> command import"); }
                });
            }
            else return commandImportCommand();
            break;
        }
        case "reactable":{
            let reactableImportCommand = async (_) => {
                let errors = [];
                let successes = [];
                let invalid = [];
                for (path of paths){
                    if (path.originalPath === "") throw new Error("Must provide a filepath");
                    //delete old caches and entries 
                    if ( modularReactables.hasOwnProperty(path.targetName) ){
                        logger(globals,"--detaching reactable ["+path.targetName+"]", logging.DEFAULT_AWAIT_LOGS_TIME);
                        delete require.cache[relativePath(require.resolve(path.filePath))];
                        delete modularReactables[path.targetName];
                    }
                    //import reactable
                    let jsFile = require(path.filePath);
                    if (jsFile.hasOwnProperty("exact") || jsFile.hasOwnProperty("contains")){
                        jsFile["__filePath"] = path.filePath;
                        modularReactables[path.targetName] = jsFile; 
                        logger(globals, "--importing reactable ["+path.filePath+"]", logging.DEFAULT_AWAIT_LOGS_TIME);
                        successes.push(path.filePath);
                    }
                    else 
                        invalid.push(path.filePath);
                }
                if (invalid.length > 0)
                    errors.push("Invalid modular reactable file(s) ```\n"+invalid.join("\n")+"```");
                return "Request complete.\n"+
                    ((successes.length>0) ? "successfully imported `"+import_type+"` ```"+successes.join("\n")+"```" : "")+
                    ((errors.length>0) ? "\n\n"+(successes.length>0 ? "partially " : "")+"failed to import `"+import_type+"` due to errors :: \n\n"+errors.join("\n\n") : "");
            }
            if (msg){
                await interactables.button_confirm(globals, {
                    targetChannel: msg.channel,
                    requester: "Import_reactable["+msg.author.id+"]",
                    options: {
                        reply: { messageReference: msg.id }, 
                        content: "Import the following reactables ?```"+paths.map(path => path.filePath).join('\n')+"```"
                    },
                    window: 30, 
                    authorizedUsers: [msg.author.id],
                    awaitLock: built_in_commands[cmd].blocking,
                    acceptCallback: reactableImportCommand,
                    rejectCallback: async _ => { await msg.reply("REJECTED -> reactable import"); }
                });
            }
            else return reactableImportCommand();
            break;
        }
        case "configs":{
            let configsImportCommand = async (_) => {
                let errors = [];
                let successes = [];
                try {
                    paths[0].originalPath==="" ? _reimportConfigs() : _reimportConfigs(paths[0].filePath, !built_in_commands[cmd].blocking);
                    successes.push(paths[0].filePath);
                }
                catch (err){ errors.push(err); }
                return "Request complete.\n"+
                    ((successes.length>0) ? "successfully imported `"+import_type+"` ```"+successes.join("\n")+"```" : "")+
                    ((errors.length>0) ? "\n\n"+(successes.length>0 ? "partially " : "")+"failed to import `"+import_type+"` due to errors :: \n\n"+errors.join("\n\n") : "");
            }
            if (msg){
                await interactables.button_confirm(globals, {
                    targetChannel: msg.channel,
                    requester: "Import_configs["+msg.author.id+"]",
                    options: {
                        reply: { messageReference: msg.id }, 
                        content: "Import the following configs ?```"+paths.map(path => path.filePath).join('\n')+"```"
                    },
                    window: 30, 
                    authorizedUsers: [msg.author.id],
                    awaitLock: built_in_commands[cmd].blocking,
                    acceptCallback: configsImportCommand,
                    rejectCallback: async _ => { await msg.reply("REJECTED -> configs import"); }
                });
            }
            else return configsImportCommand();
            break;
        }
        default:
            throw new Error(importTypeError);
    }
}



/** @param {Discord.Message} msg @param {String} content @throws {Error} */
async function _reimportCommand (msg, content, cmd){
    const logger = (built_in_commands[cmd].blocking ? logging.log : logging.awaitLog);
    let args = content.split(" ");
    args = [...new Set(args)]; //remove duplicates
    let reimportCommand = async (_) => {
        logger(globals, "--reimporting:  "+args, logging.DEFAULT_AWAIT_LOGS_TIME);
        for (let arg of args){
            if ( arg !== "reactables" && arg !== "configs" )
                throw new Error(`invalid arg: [${arg}]`);
        }    
        if (args.includes("reactables")) {
            for (let modReact in modularReactables) { delete require.cache[relativePath(require.resolve(reactablesPath+modReact+'.js'))]; }
            modularReactables = {}; 
            acquireReactables();
        }
        if (args.includes("configs")) {
            _reimportConfigs();
        }
        //reimport commands not supported, just restart bot instead
        return "Request complete.  Reimported "+args;
    }
    if (msg){
        await interactables.button_confirm(globals, {
            targetChannel: msg.channel,
            requester: "reimport["+msg.author.id+"]",
            options: {
                reply: { messageReference: msg.id }, 
                content: "Reimport `"+args.join("` & `")+"` ?"
            },
            window: 30, 
            authorizedUsers: [msg.author.id],
            awaitLock: built_in_commands[cmd].blocking,
            acceptCallback: reimportCommand,
            rejectCallback: async _ => { await msg.reply("REJECTED -> reimport abandoned"); }
        });
    }
    else return reimportCommand();
}



/** 
 * @param {String|undefined} [importPath] if provided, attempt import at file path, otherwise use default configs path
 * @param {Boolean|undefined} [awaitLogs] true if using awaitLogs, false for using botLogs, default botLogs
 */
async function _reimportConfigs (importPath, awaitLogs){
    const logger = (!awaitLogs ? logging.log : logging.awaitLog);
    let old_configs = globals.configs;
    //console.log("DEBUG_old "+JSON.stringify(configs,null,'  '));
    configs = {};

    globals = unfreezeGlobal("configs");
    globals.configs = {};

    //console.log("DEBUG2 "+JSON.stringify(configs,null,'  '));
    try { 
        acquireConfigs(importPath); 
        if (old_configs.DiscordAuthFilePath !== configs.DiscordAuthFilePath)
            throw new Error("Auth file path was changed, bot should be shutdown and manually restarted.");
        if (old_configs.logsFileMode !== configs.logsFileMode){
            logger(globals,"--logfile mode changed from ["+old_configs.logsFileMode+"] to ["+configs.logsFileMode+"]\n----setting up for new logging mode", logging.DEFAULT_AWAIT_LOGS_TIME);
            logging.setupLogger(globals, configs);
        }   
    }
    catch (err){ 
        globals.configs = old_configs;
        freezeGlobal("configs");
        configs = old_configs;
        logger(globals, "---- error on configs reimport (retaining old configs)\n"+err, logging.DEFAULT_AWAIT_LOGS_TIME);
        throw new Error("An error occured when reimporting configs.  Previous configs will be retained.\n"+err); 
    }
}





//#endregion Built-in



//================================================================
// Window
//----------------------------------------------------------------
//#region Window

let exitCount = 0;
/**
 * override the window/process exit
 */
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
        //await miscUtils.sleep(3000);
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
        await miscUtils.sleep(5000);
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

/**
 * creates a promise that is fufilled when stdin inputs the ENTER key
 * @returns {Promise} 
 */
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
//#endregion Window





//================================================================
// Export Utils
//----------------------------------------------------------------
//#region Export Utils


/** @param {String} cmd  @returns {Boolean} */
function hasCommand (cmd){
    if (built_in_commands.hasOwnProperty(cmd)) return true;
    return modularCommands.hasOwnProperty(cmd);
}
/** @param {String} cmd  @returns {Boolean}  @throws {Error} if cmd doesn't exist */
function commandIsBlocking (cmd){
    if ( !modularCommands.hasOwnProperty(cmd) && !built_in_commands.hasOwnProperty(cmd) ) throw new Error("command not found: "+cmd);
    return !nonblocking_built_in_funcs.includes(cmd);
}
/** @param {String} cmd  @returns {Number}  @throws {Error} if cmd doesn't exist */
function getCommandAuthLevel (cmd){
    if ( !modularCommands.hasOwnProperty(cmd) && !built_in_commands.hasOwnProperty(cmd) ) throw new Error("command not found: "+cmd);
    if (built_in_commands.hasOwnProperty(cmd)) return configs.built_in_AuthLevels[cmd]; //built_in_commands[cmd].auth_level;
    return modularCommands[cmd].auth_level;
}
/** @param {String} cmd  @returns {Number}  @throws {Error} if cmd not found or is a built-in command */
function getCommandVersion (cmd){
    if ( built_in_commands.hasOwnProperty(cmd) ) throw new Error("built-in command cannot be used: "+cmd);
    if ( !modularCommands.hasOwnProperty(cmd) ) throw new Error("command not found: "+cmd);
    return modularCommands[cmd].version;
}
/** @param {String} cmd  @returns {Number}  @throws {Error} if cmd doesn't exist */
function getCommandManual (cmd){
    if ( !modularCommands.hasOwnProperty(cmd) && !built_in_commands.hasOwnProperty(cmd) ) throw new Error("command not found: "+cmd);
    if (built_in_commands.hasOwnProperty(cmd)) return built_in_commands[cmd].manual;
    return modularCommands[cmd].manual;
}
/** @param {String} cmd  @returns {AsyncFunction}  @throws {Error} if cmd not found or is a built-in command */
function getCommandFunction (cmd){
    if ( built_in_commands.hasOwnProperty(cmd) ) throw new Error("built-in command cannot be used: "+cmd);
    if ( !modularCommands.hasOwnProperty(cmd) ) throw new Error("command not found: "+cmd);
    return modularCommands[cmd].func;
}


/**
 * add functions to the shutdown list
 * @param {String} name 
 * @param {Function|AsyncFunction|Function[]|AsyncFunction[]} funcs a function or array of functions of the form `(globals) => void`
 */
function addShutdownTasks (name, funcs){
    if ( !_requisites.shutdownTasks.hasOwnProperty(name) ) _requisites.shutdownTasks[name] = [];
    if (Array.isArray(funcs)) _requisites.shutdownTasks[name].push(...funcs);
    else _requisites.shutdownTasks[name].push(funcs);
}


//#endregion Export Utils



//================================================================
module.exports = {
    //for system use
    init, 
    restart,
    soft_restart,
    shutdown,
    set_exit_handler,
    selfCommand,
    built_in_commands,

    //utils
    hasCommand,
    commandIsBlocking,
    getCommandAuthLevel,
    getCommandVersion,
    getCommandManual,
    getCommandFunction,
    addShutdownTasks,
}






