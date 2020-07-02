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



module.exports = {
    version: 1.0,
    auth_level: 1,



    manual: "--time   *returns the time*",



    func: async function (globals, msg, args){ 
        msg.reply(utils.getDateTimeString(globals));
    }

    
}






