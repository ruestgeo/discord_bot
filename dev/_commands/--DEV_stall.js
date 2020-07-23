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






//const utils = require('../utils.js'); 
const readline = require('readline'); //for enterToExit()


module.exports = {
    version: 1.0,
    auth_level: 0,



    manual: "stall until enter pressed in console",



    func: async function (globals, msg, args){ 
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        await new Promise(resolve => rl.question("Press Enter to end stall", _ => {
            console.log("stall ended");
            rl.close();
            resolve();
            //process.exit();
        }));
        return "DEV_stall ended"
    }

    
}






