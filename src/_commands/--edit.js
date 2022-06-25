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
    version: 1.1,
    auth_level: 4,



    manual: "**--edit**  ->  __*message_link*__   ~~~ \n" +
            "~~**•** >~~  *takes a message link and edits the message with anything written after the link*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){ 
        if ( !content.includes("https://discordapp.com/channels/") && !content.includes("https://discord.com/channels/") ){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct and includes a message link.");
        }
        
        /* parse the message link and edit content */
        let target = content.substring(0, content.indexOf(' ')).trim();
        let edit_content = content.substring(content.indexOf(' ')+1).trim();
        

        /* fetch message */
        let message = await utils.fetchMessageFromLink(globals, target, true).catch(err => {throw (err)});

        if (message.author.id !== globals.client.user.id){
            utils.botLogs(globals,  "----message "+message.id+" is not a message from this bot");
            throw ("Message with id ["+message.id+"] is not a message from this bot");
        }

        await message.edit(edit_content).catch(err => {throw(err)});

        return "Request complete.\nSuccessfully edited message <"+target+">";
    }

    
}






