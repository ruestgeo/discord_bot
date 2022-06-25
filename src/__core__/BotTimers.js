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




const { botEventEmitter } = require('./BotEventEmitter.js');
const { generateUniqueID } = require('./MiscUtils.js');




/** @type {{[tid: String]: Number}} */
let _timeouts = {};  //null;
/** @type {{[iid: String]: Number}} */
let _intervals = {};  //null;




//#region Process
/** Startup procedure for timer system */
/*async function __startup (globals){
    _timeouts = {};
    _intervals = {};
}*/
/** Shutdown procedure for timer system */
async function __shutdown (globals){
    botEventEmitter.emit('shutdownTimeouts', _timeouts.length);
    for (let _timeout in _timeouts){
        let timeout = _timeouts[_timeout];
        if (Array.isArray(timeout)){
            for (let t of timeout){
                clearTimeout(t);
            }
        }
        else  clearTimeout(timeout);
    }
    botEventEmitter.emit('shutdownIntervals', _intervals.length);
    for (let interval_name in _intervals){
        clearInterval(_intervals[interval_name]);
    }
    _timeouts = {};
    _intervals = {};
}
//#endregion Process
//module.exports.__startup  = __startup;
module.exports.__shutdown = __shutdown;



//#region Interval

/**
 * Acquire a unique interval id registered to the bot
 * @param {String} requester a name of the requester (for ease of identification)
 * @returns {String} the unique interval id
 */
 function acquireInterval (requester){
    console.log("ACQUIRE_INTERVAL ::  "+requester);
    let pattern = "]_aaaa-aaaaaa.zz";
    let iid = "[" + requester + generateUniqueID(pattern);
    let count = 10;
    while ( _intervals.hasOwnProperty(iid) ){ //iid already exists, generate a different one
        iid = "[" + requester + generateUniqueID(pattern);
        count--;
        if (count < 1){
            count = 10;
            pattern += "a";
        }
    }
    _intervals[iid] = null;
    return iid;
}

/**
 * Set an interval, registered to the bot with a unique interval id
 * @param {String} iid the unique interval id
 * @param {Function|AsyncFunction} fn the interval callback
 * @param {Number} intervalTime 
 * @param  {TArgs} args arg0, ..., argN for the callback function
 * @throws {Error} if invalid interval id
 */
 function _setInterval (iid, fn, intervalTime, ...args){
    if (!_intervals.hasOwnProperty(iid) || _intervals[iid] !== null)  throw new Error("Invalid interval id");
    console.log("SET_INTERVAL ::  "+iid+" : "+intervalTime);
    let interval = setInterval(async (...args) => {
        console.log("_INTERVAL ::  "+iid);
        await fn(...args);
    }, intervalTime, ...args);
    _intervals[iid] = interval;
}


/**
 * Remove and clear the interval with the provided interval id
 * @param {String} iid the unique interval id
 */ //@throws {Error} if interval doesn't exist or an error occured during clearing
function removeInterval (iid){
    console.log("CLEAR_INTERVAL ::  "+iid);
    if (_intervals.hasOwnProperty(iid)) {
        clearInterval(_intervals[iid]); 
        delete _intervals[iid];
    }
    //else throw new Error ("Invalid IID");
}

//#endregion Interval
module.exports.acquireInterval = acquireInterval;
module.exports.setInterval     = _setInterval;
module.exports.removeInterval  = removeInterval;



//#region Timeout

/**
 * Acquire a unique timeout id registered to the bot
 * @param {String} requester a name of the requester (for ease of identification)
 * @returns {String} the unique timeout id
 */
 function acquireTimeout (requester){
    console.log("ACQUIRE_TIMEOUT ::  "+requester);
    let pattern = "]_aaaaa-aa.aaa-zz";
    let tid = "[" + requester + generateUniqueID(pattern);
    let count = 10;
    while ( _timeouts.hasOwnProperty(tid) ){ //tid already exists, generate a different one
        tid = "[" + requester + generateUniqueID(pattern);
        count--;
        if (count < 1){
            count = 10;
            pattern += "a";
        }
    }
    _timeouts[tid] = null;
    return tid;
}


/**
 * Set a timeout, registered to the bot with a unique timeout id
 * @param {String} tid the unique timeout id
 * @param {Function|AsyncFunction} fn the timeout callback
 * @param {Number} timeoutTime 
 * @param  {TArgs} args arg0, ..., argN for the callback function
 * @throws {Error} if invalid timeout id
 */
function _setTimeout (tid, fn, timeoutTime, ...args){
    if (!_timeouts.hasOwnProperty(tid) || _timeouts[tid] !== null)  throw new Error("Invalid timeout id");
    console.log("SET_TIMEOUT ::  "+tid+" : "+timeoutTime);
    let timeout = setTimeout(async (...args) => {
        console.log("_TIMEOUT_EXPENDED ::  "+tid);
        if (_timeouts.hasOwnProperty(tid)) delete _timeouts[tid];
        else console.log("CLEAR_TIMEOUT_ERROR :: invalid TID : "+tid);
        console.log("_TIMEOUT ::  "+tid);
        await fn(...args);
    }, timeoutTime, ...args);
    _timeouts[tid] = timeout;
    return tid;
}


/**
 * Remove and clear the timeout with the provided timeout id
 * @param {String} tid the unique timeout id
 */ //@throws {Error} if timeout doesn't exist or an error occured during clearing
function removeTimeout (tid){
    console.log("CLEAR_TIMEOUT ::  "+tid);
    if (_timeouts.hasOwnProperty(tid)) {
        clearInterval(_timeouts[tid]); 
        delete _timeouts[tid];
    }
    //else throw new Error ("Invalid TID");
}

//#endregion Timeout
module.exports.acquireTimeout = acquireTimeout;
module.exports.setTimeout     = _setTimeout;
module.exports.removeTimeout  = removeTimeout;


