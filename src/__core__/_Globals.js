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



//================================================================
// Globals
//----------------------------------------------------------------
//#region Globals


/** @type {Globals} */
let globals = null;

function getGlobals (){
    return globals;
}

/** initialize or reinitialize the globals and local objects 
 * @param {{[propertyName: String]: *}} props
 */
function initGlobals (props){
    clearGlobals();
    if (!props) return globals;
    for (let propName in props){
        globals[propName] = props[propName];
    }
    freezeGlobal(Object.keys(props));
    return globals;
}


/** delete all entries in globals */
function clearGlobals (){
    globals = {};
    return globals;
}


/** null globals */
function destroyGlobals (){
    globals = null;
    return globals;
}


/** unfreeze a global property (done by remaking the object and re-freezing any non-target globals)
 * @param {String|String[]} targets
 */
function unfreezeGlobal (targets){
    if (targets.length == 0) return;
    let new_globals = {};
    for (let global in globals){
        new_globals[global] = globals[global];
        if (  ( Array.isArray(targets) ? !targets.includes(global) : (targets !== global) )  ){ //re-freeze any non-targets
            let desc = Object.getOwnPropertyDescriptor(globals, global);
            if ( !desc.configurable ) Object.defineProperty(new_globals, global, { configurable: false });
            if ( !desc.writable ) Object.defineProperty(new_globals, global, { writable: false });
        }
    }
    globals = new_globals;
    return globals;
}


/** freeze a global property (any global already frozen is not affected)
 * @param {String|String[]} targets 
 */
function freezeGlobal (targets){
    if (Array.isArray(targets))
        for (let global in targets){
            if (!globals.hasOwnProperty(global)) continue;
            Object.defineProperty(globals, global, { configurable: false, writable: false });
        }
    else {
        if (!globals.hasOwnProperty(global)) return;
        Object.defineProperty(globals, targets, { configurable: false, writable: false });
    }
}

//#endregion Globals
module.exports.getGlobals     = getGlobals;
module.exports.initGlobals    = initGlobals;
module.exports.clearGlobals   = clearGlobals;
module.exports.destroyGlobals = destroyGlobals;
module.exports.freezeGlobal   = freezeGlobal;
module.exports.unfreezeGlobal = unfreezeGlobal;


