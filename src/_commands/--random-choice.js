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






const Discord = require('discord.js');
const utils = require(process.cwd()+'/utils.js'); 



module.exports = {
    version: 2.0,
    auth_level: 1,



    manual: "--random-choice   *each line after the command will be an item to chose, one line is chosen at random (use shift+ENTER for newline)*\n"
            +"~~**•** >~~  *If no newline is detected then it will split by vertical bar ` | `*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} args   @returns {String|void} */
    func: async function (globals, msg, args){ 
        let delimiter = "\n";
        //chose a random line
        if (!args.includes(delimiter))
            delimiter = "|"; //throw new Error("incorrect command use, no lines to choose from");
        let choices = args.split(delimiter).map(i => i.trim()).filter(i => i !== "");
        //choices = choices.splice(1,choices.length);
        utils.botLogs(globals, "choices :  "+choices);
        let randomItem = choices[Math.floor(Math.random()*choices.length)];
        utils.botLogs(globals, "chosen item: "+ randomItem);
        msg.reply(randomItem);
    }

    
}






