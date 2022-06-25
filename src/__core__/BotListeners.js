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



const Discord = require('discord.js');

const eventUtils = require('./EventUtils');
const { generateUniqueID } = require('./MiscUtils.js');




/** @type {{[uid: String]: () => void|Promise<void>}} */
let _listeners = null;


//#region Process

/** Startup procedure for bot listener system */
async function __startup (globals){
    _listeners = {};
}
/** Shutdown procedure for bot listener system */
async function __shutdown (globals){
    for (let uid in _listeners){ await _listeners[uid](); }
    _listeners = null;
}

//#endregion Process

module.exports.__startup  = __startup;
module.exports.__shutdown = __shutdown;


//#region Exports

/**
 * Reserver and acquire a unique ID for a bot listener
 * @param {Discord.ClientEvents|undefined} [eventType] (optional) client event type
 * @returns {String} uid
 */
 function acquireBotListener(eventType){
    let pattern = "]_aaaa-zzzz";
    let uid = "[" + (eventType ?? "0000") + generateUniqueID(pattern);
    let count = 10;
    while ( _listeners.hasOwnProperty(uid) ){ //uid already exists, generate a different one
        uid = "[" + (eventType ?? "0000") + generateUniqueID(pattern);
        count--;
        if (count < 1){
            count = 10;
            pattern += "a";
        }
    }
    _listeners[uid] = null; 
    return uid;
}


/**
 * Add a listener to the bot client (only "on" event)
 ** a UID must first be reserved/acquired via `acquireBotListener`
 * @param {String} uid the acquired unique id 
 * @param {Discord.Client} client
 * @param {Discord.ClientEvents} eventType client event type
 * @param {Function} fn callback function
 * @param {Function|undefined} [final] (optional) a function to run when removing the listener
 * @returns {AsyncFunction} listener disabler
 */
 function addBotListener (uid, client, eventType, fn, final){
    if (!_listeners.hasOwnProperty(uid) || _listeners[uid] !== null)  throw new Error("Invalid uid");
    let disabler = eventUtils.event_on(client, eventType, fn);
    _listeners[uid] = async () => {
        if (_listeners.hasOwnProperty(uid)) 
            delete _listeners[uid]; 
        disabler(); 
        if (typeof final === "function") await final();
    }
    return _listeners[uid];
}


/**
 * Remove a listener from the bot client via UID
 * @param {String} uid unique id for the listener (returned from addBotListener)
 */
async function removeBotListener (uid){
    if (!_listeners.hasOwnProperty(uid))  return;
    await _listeners[uid]();
    //if (_listeners.hasOwnProperty(uid)) delete _listeners[uid]; 
}

//#endregion Exports
module.exports.acquireBotListener = acquireBotListener;
module.exports.addBotListener     = addBotListener;
module.exports.removeBotListener  = removeBotListener;

