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




//#region stringUtils

/** Return an object formatted in a 'pretty' way 
 * @param {Object} jsonObj a regular js object
 * @return {String} the formatted object
*/
function jsonFormatted (jsonObj){
    return JSON.stringify(jsonObj,null,'  ');
}


/**
 * Replace the spaces after commas with a specified number of spaces
 * @param {String} str the string to clean
 * @param {Number} numSpaces the nunmber of spaces to fill after commas
 * @returns {String}
 */
function cleanCommas (str, numSpaces){
    return str.replace(/ +(?<=, +)/g, " ".repeat(numSpaces));
}


/**
 * Clean the extra spacing between characters to at most 1 space
 * @param {String} str the string to clean
 * @returns {String}
 */
function cleanSpaces (str){
    return str.replace(/ +(?= )/g, '');
}


/**
 * Count the number of occurences of a substring within a string
 * @param {String} str the string to count within
 * @param {String} countString the sub-string to count within the main string
 * @returns {Number}
 */
function countOccurrences (str, countString){
    return (str.match(new RegExp(countString,"g")) || []).length;
}


/** Return an array containing the substring before the shell encapsulating the core string, the core string, and the substring after the core 
 * @param {String} str the string to parse
 * @param {String} shellString the encapsulating sub-string, or "shell string", to the left and right of the core string
 * @return {Array <String>} the left, core, and right sub-strings (not including the shell string)
 */
function extractEncapsulated (str, shellString){
    if (countOccurrences(str, shellString) < 2) return null;
    let beginIndex = str.indexOf(shellString);
    let endIndex = str.indexOf(shellString, beginIndex + shellString.length);
    let left = str.substring(0, beginIndex);
    let core = str.substring(beginIndex + shellString.length, endIndex);
    let right = str.substring(endIndex + shellString.length);
    return [left,core,right];
}


function intToLetter (column){
    let temp, letter = '';
    while (column > 0){
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}


function letterToInt (letter){
    let column = 0, length = letter.length;
    for (let i = 0; i < length; i++){
        column += (letter.toUpperCase().charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column;
}

//#endregion stringUtils
module.exports.jsonFormatted       = jsonFormatted;
module.exports.cleanCommas         = cleanCommas;
module.exports.cleanSpaces         = cleanSpaces;
module.exports.countOccurrences    = countOccurrences;
module.exports.extractEncapsulated = extractEncapsulated;
module.exports.intToLetter         = intToLetter;
module.exports.letterToInt         = letterToInt;

