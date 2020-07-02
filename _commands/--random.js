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


function getRandInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}



module.exports = {
    version: 1.0,
    auth_level: 1,



    manual: "--random {\"mode\": \" dice // coin // range\" <,\"rangeStart\": integer >  <,\"rangeEnd\": integer >}"
            +"\n.     *make a random choice using a dice, coin, or range of numbers.  If [range] is used then the [rangeStart] and [rangeEnd] should be defined*",




    func: async function (globals, msg, args){ 
        //mode: dice, coin, range
        var client = globals.client;

        utils.botLogs(globals,  "--parsing request");
        const argsJSON = JSON.parse(args);

        var result;
        if (argsJSON.mode === "coin"){
            result = getRandInteger(0,1);
            msg.reply(  result == 1 ? "heads" : "tails" );
            utils.botLogs(globals, "--random [coin] :  "+result+"  == "+(result == 1 ? "heads" : "tails"));
        }
        else if (argsJSON.mode === "dice"){
            result = getRandInteger(1,6);
            msg.reply(  result );
            utils.botLogs(globals, "--random [dice] :  "+result);
        }
        else if (argsJSON.mode === "range"){
            if (argsJSON.hasOwnProperty('rangeStart') && argsJSON.hasOwnProperty('rangeEnd')){
                result = getRandInteger(argsJSON.rangeStart, argsJSON.rangeEnd);
                msg.reply(  result );
                utils.botLogs(globals, "--random [range] :  "+result);
            }
            else
                throw new Error("invalid args, missing one of or both of \"rangeStart\" and \"rangeEnd\"");
        }
        else {
            if (argsJSON.hasOwnProperty('rangeStart') && argsJSON.hasOwnProperty('rangeEnd')){
                msg.reply(  "Unknown mode ["+argsJSON.mode+"], assuming [range] mode" );
                result = getRandInteger(argsJSON.rangeStart, argsJSON.rangeEnd);
                msg.reply(  result );
                utils.botLogs(globals, "--random [range] :  "+result);
            }
            else
                throw new Error("Unknown mode ["+argsJSON.mode+"]");
        }
    }

    
}






