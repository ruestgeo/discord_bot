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


//example.js

const Discord = require('discord.js');
const utils = require(process.cwd()+'/utils.js'); //base utils is located in the base dir, if needed
//const custom_utils = require(process.cwd()+'/_utils/custom_utils'); //custom utils located in the _utils directory



/* Must include "func" which takes globals as argument (can ignore it if not needed)
    func will run before the bot is activated (to wait until bot is ready, use the "ready" event with globals["botEventEmitter"] )

  By convention, use console.log rather than botLogs during the startup and optionally lead with eight (8) empty spaces for readability in the logs,
  unless printing logs after the botReady event in which no leading spaces are needed and botLogs can be used.
*/

module.exports = {
    func: async function (globals){
        let logger =  (utils.loggerIsReady() ? (str) => { utils.botLogs(globals, str) } : (str) => console.log(str));

        logger("doing something");  //this isn't really neccessary as the logger should be ready, but it is a safer way to log


        /* do something here */
    
        
        globals.botEventEmitter.once('ready', () => {
            
            utils.botLogs("doing something else on bot 'ready'");
            //do something once bot is fully ready
            
        })
    }
}






