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



//#region Event
/** Create an event listener for a target lister and return a function to remove the specific event listener
 * @param {EventTarget} target
 * @param {Event} event_type
 * @param {Function} func
 * @return {Function} a function to remove the event listener
 */
 function event_once (target, event_type, func) {
    target.once(event_type, func);
    return function () {
        if (target.off)
            target.off(event_type, func);
    };
}
/** Create an event listener for a target lister and return a function to remove the specific event listener
 * @param {EventTarget} target
 * @param {Event} event_type
 * @param {Function} func
 * @return {Function} a function to remove the event listener
 */
function event_on (target, event_type, func) {
    target.on(event_type, func);
    return function () {
        target.off(event_type, func);
    };
}
//#endregion Event

module.exports.event_on   = event_on;
module.exports.event_once = event_once;