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


const logsPath = "./logs/"; //should end with '/'


const DEFAULT_AWAIT_LOGS_TIME = 10; //sec

const DEFAULT_TIMESTAMP = false;
const DEFAULT_LOGS_FILE_MODE = "newfile";
const DEFAULT_LOGS_FILE_NAME = "LOGS.txt";
const DEFAULT_LOGS_NEWFILE_INTERVAL = 24; //in hours



const fs = require('fs');

const _package = require('../package.json');
const { Globals, BotConfigs } = require('./_typeDef');
const { botEventEmitter } = require('./BotEventEmitter.js');
const workLock = require('./WorkLock.js');
const timers = require('./BotTimers.js');
const timeUtils = require('./DateTimeUtils.js');



module.exports.DEFAULT_AWAIT_LOGS_TIME = DEFAULT_AWAIT_LOGS_TIME;
module.exports.DEFAULT_TIMESTAMP = DEFAULT_TIMESTAMP;
module.exports.DEFAULT_LOGS_FILE_MODE = DEFAULT_LOGS_FILE_MODE;
module.exports.DEFAULT_LOGS_FILE_NAME = DEFAULT_LOGS_FILE_NAME;
module.exports.DEFAULT_LOGS_NEWFILE_INTERVAL = DEFAULT_LOGS_NEWFILE_INTERVAL;




//#region Process
/** Startup procedure for logging system */
async function __startup (globals){
    __awaitLogs = {};
    __awaitLogs["content"] = null;
    __awaitLogs["timeout"] = null;
    __awaitLogs["init_time"] = null;
    __awaitLogs["wait_time"] = 0;
}
/** Shutdown procedure for logging system */
async function __shutdown (globals){
    console.log("[Logging shutdown]");
    if (__awaitLogs.timeout){
        console.log("    __attemptLogs :  flushing content");
        try{ clearTimeout(__awaitLogs.timeout); } 
        catch (err){ console.error(err); }
        log(globals, __awaitLogs.content);
        __awaitLogs.content = null;
        __awaitLogs.timeout = null;
        __awaitLogs.init_time = null;
        __awaitLogs.wait_time = 0;
    }
}
//#endregion Process
module.exports.__startup  = __startup;
module.exports.__shutdown = __shutdown;




//#region Logging

//local
async function flushAwaitLogs (globals, _log){
    //clear awaitLogs prior to mutex to prevent race
    let temp = __awaitLogs.content;
    __awaitLogs.content = null;
    __awaitLogs.timeout = null;
    __awaitLogs.init_time = null;
    __awaitLogs.wait_time = 0;
    await workLock.acquire("flush awaitLogs");
    _log(globals, temp);
    workLock.release("flush awaitLogs");
}


//#region LoggingExports

/** Log the content to file (if set) then to console 
 * @param {Globals} globals
 * @param {String} content
 */
function log (globals, content){
    if (globals?.LogsToFile)
        { fs.appendFileSync(logsPath+logsFileName, content+"\n"); }
    console.log(content);
}


let __awaitLogs = null;
/** Log the content when the work lock after waiting for some seconds (max 1 min)
 * @param {Globals} globals
 * @param {String} content
 * @param {Number} waitingSeconds min 3, max 60
 */
function awaitLog (globals, content, waitingSeconds){
    let timestamp = timeUtils.getTimeString(globals);
    if ( __awaitLogs.content )   __awaitLogs.content += "\n"+timestamp+"_"+content;
    else   __awaitLogs.content = timestamp+"_"+content;
    if ( !waitingSeconds )   waitingSeconds = 0;
    else if ( typeof waitingSeconds !== 'number' )   waitingSeconds = 0;
    else if ( waitingSeconds < 0 )    waitingSeconds = 0;

    if ( !__awaitLogs.timeout && waitingSeconds == 0 ){ //no existing timeout and no waitingSeconds, immediate log
        let temp = __awaitLogs.content;
        __awaitLogs.content = null;
        log(globals, temp);
    }
    else if ( !__awaitLogs.timeout && waitingSeconds > 0 ){ //set timeout
        //console.log("set timeout");
        waitingSeconds = Math.max(3, Math.min(waitingSeconds, 60));
        __awaitLogs.init_time = Date.now();
        __awaitLogs.wait_time = waitingSeconds;
        __awaitLogs.timeout = setTimeout(flushAwaitLogs, waitingSeconds*1000, globals, log);
    }
    else if ( __awaitLogs.timeout && waitingSeconds > 0 ){ //extend timeout if waitingSeconds
        //console.log("extend timeout");
        let elapsedTime = (Date.now() - __awaitLogs.init_time)/1000.0;
        let remainingTime = __awaitLogs.wait_time - elapsedTime;
        if (remainingTime < waitingSeconds)   waitingSeconds -= remainingTime;
        else /*if (remainingTime >= waitingSeconds)*/  return;  //maintain current timeout and wait time
        clearTimeout(__awaitLogs.timeout);
        let waitingTime = Math.max(3, Math.min(60, remainingTime + waitingSeconds));
        waitingSeconds = (waitingTime - remainingTime);
        __awaitLogs.wait_time += waitingSeconds;
        //console.log("DEBUG\n  elapsed: "+elapsedTime+"\n  old remaining time: "+remainingTime+"\n  add waiting seconds: "+waitingSeconds+"\n  new waiting time: "+waitingTime+"\n  total wait from init: "+__awaitLogs.wait_time);
        __awaitLogs.timeout = setTimeout(flushAwaitLogs, waitingTime*1000, globals, log);
    }
    //else timeout but no waitSeconds, so just append content and maintain the current timeout (at start)
}

//#endregion LoggingExports
//#endregion Logging
module.exports.log      = log;
module.exports.awaitLog = awaitLog;




//#region Logs
let botLog_tid = null;
let botLog_iid = null;
let loggerReady = false;
let logsFileName = DEFAULT_LOGS_FILE_NAME;

function getLogFileName (){
    return logsFileName;
}
/**
 * Setup the local bot logging system
 ** must be setup before __startup
 * @param {Globals} globals
 * @param {BotConfigs} configs
 */
function setupLogger (globals, configs){
    botEventEmitter.emit('logsSetup', configs.logsFileMode);
    
    //clear any existing intervals or timeouts
    destroyLogger();

    if ((configs.logsFileMode !== "none") && (configs.logsFileMode !== "")){
        console.log("\nlogsFileMode:  "+configs.logsFileMode);
        if (!fs.existsSync(logsPath)){
            console.log("--creating ["+logsPath+"] dir(s)");
            fs.mkdirSync(logsPath, { recursive: true });
        }

        if (configs.logsFileMode === "daily"){ // 1 file per day
            let day = timeUtils.getDate(globals);
            //console.log("DEBUG day: "+day);
            let fileName = `LOGS_${day}.txt`;
            logsFileName = fileName;
            let dateTime = timeUtils.getDateTime(globals);
            let secondsTillNextDay = (24*60*60) - ((dateTime.hour*60*60) + (dateTime.minute*60) + dateTime.second);
            //console.log("DEBUG till next day: "+secondsTillNextDay);
            clearTimerID();
            botLog_tid = timers.acquireTimeout("botLogs_Daily");
            timers.setTimeout(botLog_tid, logTimeout, (secondsTillNextDay*1000)+60000, globals);
            //if file exists, append otherwise create
            if (fs.existsSync(logsPath+logsFileName)){
                console.log("----daily log exists: appending");
                fs.appendFileSync(logsPath+logsFileName, "\n\n\n\ndaily log ::  "+botLog_tid+"\n["+_package.name+"] started "+timeUtils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
            }
            else {
                console.log("----creating daily log");
                fs.writeFileSync(logsPath+logsFileName, "\n\n\n\ndaily log ::  "+botLog_tid+"\n["+_package.name+"] started "+timeUtils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
            }
        }
        else if (configs.logsFileMode === "newfile"){ //setup 24 (default) hour interval to renew name and make new file
            let date = timeUtils.getDateTime(globals);
            let fileName = "LOGS_"+date.toISO()+".txt";
            fileName = fileName.replace(/-/g,"_");
            fileName = fileName.replace(/:/g,"-");
            logsFileName = fileName;
            clearIntervalID();
            botLog_iid = timers.acquireInterval("botLogs_NewFile");
            timers.setInterval(botLog_iid, logInterval, DEFAULT_LOGS_NEWFILE_INTERVAL*60*60*1000, globals);
            fs.writeFileSync(logsPath+logsFileName, "\n\n\n\nnewfile log ::  "+botLog_iid+"\n["+_package.name+"] started "+timeUtils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
        }
        else if (configs.logsFileMode === "overwrite"){
            fs.writeFileSync(logsPath+logsFileName, "\n\n\n\noverwrite log\n["+_package.name+"] started "+timeUtils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
        }
        else if (configs.logsFileMode === "append"){
            fs.appendFileSync(logsPath+logsFileName, "\n\n\n\n\n["+_package.name+"] started "+timeUtils.getDateTimeString(globals)+"\nlogsFileMode:  "+configs.logsFileMode+"\n\n");
        }
        else {
            throw new Error("Invalid logsFileMode");
        }
    }
    if ( globals?.LogsToFile ) console.log("\nLogs File Name:  "+logsFileName+"\n");
    loggerReady = true;

    botEventEmitter.emit('logsReady');
}

/** Shutdown the logger */
function destroyLogger (){
    console.log('[[BotLogging]] Destroying logger');
    loggerReady = false;
    if (botLog_iid) { 
        timers.removeInterval(botLog_iid);
        botLog_iid = null;
    }
    if (botLog_tid) {
        timers.removeTimeout(botLog_tid);
        botLog_tid = null;
    }
}

/** Whether the logger is ready to be used.
 ** Call `setupLogger` to ready the logger.
 */
function isReady (){
    return loggerReady;
}

/**
 * setup an interval to create a new log file ever 24 hours
 * @param {Globals} globals 
 */
async function logInterval (globals){
    try{
        await workLock.acquire("log_newfile");
        botEventEmitter.emit('logNewFile_start');
        
        let date = timeUtils.getDateTime(globals);
        let oldLogsFileName = logsFileName;
        let newLogsFileName = "LOGS_"+date.toISO()+".txt";
        newLogsFileName = newLogsFileName.replace(/-/g,"_");
        newLogsFileName = newLogsFileName.replace(/:/g,"-");
        logsFileName = newLogsFileName;
        fs.appendFileSync(logsPath+oldLogsFileName, "\n\nSwitching to new logs file with name:  "+newLogsFileName);
        fs.writeFileSync(logsPath+newLogsFileName, "\n\n\n\n\n["+_package.name+"]\nCreating new logs file  ["+newLogsFileName+"]\n    "+timeUtils.getDateTimeString(globals)+"\n\n\n\n");
        console.log("\nLogs File Name:  "+logsFileName+"\n");
    }
    catch (err){
        log(globals,"## ERR occurred during "+DEFAULT_LOGS_NEWFILE_INTERVAL+"hour new logs file interval ::  "+err);
    }
    finally {
        workLock.release("log_newfile");
        botEventEmitter.emit('logNewFile_end');
    }
}
/**
 * setup a logs timeout to create a new log file every day at midnight (0:00) based on the configured timezone
 * @param {Globals} globals 
 */
async function logTimeout (globals){
    try{
        await workLock.acquire("log_daily");
        botEventEmitter.emit('logDaily_start');
        
        let day = timeUtils.getDate(globals);
        let oldLogsFileName = logsFileName;
        let newLogsFileName = `LOGS_${day}.txt`;
        logsFileName = newLogsFileName;
        //setup next timeout
        let dateTime = timeUtils.getDateTime(globals);
        let secondsTillNextDay = (24*60*60) - ((dateTime.hour*60*60) + (dateTime.minute*60) + dateTime.second); //should be nearly 24hour
        clearTimerID();
        botLog_tid = timers.acquireTimeout("botLogs_Daily");
        timers.setTimeout(botLog_tid,logTimeout,(secondsTillNextDay*1000)+60000, globals);
        fs.appendFileSync(logsPath+oldLogsFileName, "\n\nSwitching to new daily logs file with name:  "+newLogsFileName);
        fs.writeFileSync(logsPath+newLogsFileName, "\n\n\n\n\n["+_package.name+"]\nCreating new daily logs file  ["+newLogsFileName+"] ::  "+botLog_tid+"\n    "+timeUtils.getDateTimeString(globals)+"\n\n\n\n");
        console.log("\nLogs File Name:  "+logsFileName+"\n");
    }
    catch (err){
        log(globals,"## ERR occurred during daily logs file timeout ::  "+err);
    }
    finally {
        workLock.release("log_daily");
        botEventEmitter.emit('logDaily_end');
    }
}

function clearTimerID (){
    botLog_tid = null;
}
function clearIntervalID (){
    botLog_iid = null;
}

//#endregion Logs
module.exports.getLogFileName = getLogFileName;
module.exports.setupLogger    = setupLogger;
module.exports.destroyLogger  = destroyLogger;
module.exports.isReady        = isReady;

