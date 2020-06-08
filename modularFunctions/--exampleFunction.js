/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code when asked if not already made public
*/






const utils = require('../utils.js'); //utils is located in the directory above, if needed

/* Must include both "func" and "manual".

   The main function to call from bot.js should be named "func"

   "manual" should include usage of this function. 
   Limit this to 2000 chars as per Discord post restrictions; preferably keep it short.
*/

module.exports = {

    func: async function (globals, msg, args){ 
        /*
        *   the parameters provided are (globals, msg, args)
        * --globals contains the general configs, client handle, and so on
        * -- msg is the triggering Message object
        * -- args is the request contents
        * 
        * these parameters are fixed until further expansion
        */
        console.log("this is an example modular function");
    }, 

    manual: "Example modular function manual."
}






