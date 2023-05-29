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




//#region miscUtils


/** Generate a random case sensitive ID with hex or alphanumeric chars based on the given pattern.
 * @param {String} pattern a pattern consisting of special characters and alphanumerics.
 * if the pattern contains only a~f then hex is used, otherwise if the pattern contains g-z then all letters are used.
 * an example of a hex generating pattern is "[abc]-(D1)_". 
 * an example of an alphanumeric pattern is "[aZc]-(g1)_".
 * capitalization in the pattern is ignored.
 * @param {Boolean} [noCase] (optional) if true, then returns all lowercase
 * @return {String} a randomly generated ID with hex or alphanumeric chars (case sensitive)
 */
 function generateUniqueID (pattern, noCase){
    let hex = (pattern.match(/[G-Zg-z]/g) == null);
    pattern = pattern.replace(/[A-Za-z0-9]/g,"0");
    let iter = pattern.replace(/[^A-Za-z0-9]/g,"-");
    if (!pattern.includes("0")) return; //no pattern to generate
    //let parts = pattern.replace(/[^A-Za-z0-9]/g,"-").split("-");
    let uid = "";
    let idx = 0; let idxA; let len; let part;
    let rand = () => { return Math.floor((1 + Math.random()) * 0x10000).toString(hex ? 16 : 36); }
    while (uid.length < pattern.length){

        /* search for special char */
        idxA = iter.indexOf("0",idx); //idxA start of 0 (end of special char)
        if (idxA < 0){ idxA = pattern.length; } //end of string
        if (idxA > idx){ //special char
            uid += pattern.substring(idx,idxA); 
            idx = idxA;
        } //idx = start of 0
        if (uid.length == pattern.length) break;

        /* search for alphanumeric char */
        idxA = iter.indexOf("-",idx); //end of 0
        if (idxA < 0){ idxA = pattern.length; } //end of string
        len = idxA-idx;
        if (!noCase) part = rand().split('').map( c => { return (Math.random() < 0.5 ? c : c.toUpperCase()); }).join('');
        else part = rand();
        if (part.length > len) part = part.substring(part.length - len); //trim extra length
        uid += part;
        idx += part.length;
    }
    return uid;
}


/** freeze all properties nested in obj */
function deepFreeze(obj){
    Object.keys(obj).forEach(propName => {
        if ( typeof obj[propName] === 'object' && !Object.isFrozen(obj[propName]) )
            deepFreeze(obj[propName]);
    });
    Object.freeze(obj);
}


/**
 * @param {function} fn 
 * @returns {Boolean} whether function is async or not
 */
function isAsync(fn) {
    return fn.constructor.name === 'AsyncFunction';
}


/** Return the name of the object
 * @param {*} obj 
 * @returns {String} 
 */
function getObjectName(obj){
    return obj.constructor.name ?? "unknown";
}


/** Sleep for some amount of milliseconds
 * @param {Number} ms
 * @return {Promise <undefined>}
 */
function sleep (ms) { //example:  await sleep(1000);
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

//#endregion miscUtils
module.exports.sleep            = sleep;
module.exports.getObjectName    = getObjectName;
module.exports.isAsync          = isAsync;
module.exports.generateUniqueID = generateUniqueID;
module.exports.deepFreeze       = deepFreeze;
deepFreeze

