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






const utils = require(process.cwd()+'/utils.js'); 



module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "--sleep -> integer     *bot will sleep for a maximum of 15sec*",



    func: async function (globals, msg, content){ 
        msg.react('🛌');
        msg.react('😴');
        var sleepTime = parseInt(content)
        if (isNaN(sleepTime) || sleepTime > 15) sleepTime = 10; //max of 15sec
        utils.botLogs(globals,"--sleeping for "+sleepTime+" seconds");
        await utils.sleep(sleepTime*1000);
        return "😪";
    }

    
}






