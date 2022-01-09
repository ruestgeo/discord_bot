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






const utils = require(process.cwd()+'/utils.js');



module.exports = {
    version: 1.0,
    auth_level: 4,



    manual: "**--edit**  ->  *__message_link__*   ~~~ \n" +
            ".     *takes a message link and edits the message with anything written after the link*",



    func: async function (globals, msg, content){ 
        if ( !content.includes("https://discordapp.com/channels/") && !content.includes("https://discord.com/channels/") ){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct and includes a message link.");
        }
        
        /* parse the message link and edit content */
        let target = content.substr(0, content.indexOf(' ')).trim();
        let edit_content = content.substr(content.indexOf(' ')+1).trim();
        

        /* fetch message */
        /*
        let ids = target.startsWith("https://discordapp.com/channels/") ? target.substring("https://discordapp.com/channels/".length).split("/") : target.substring("https://discord.com/channels/".length).split("/");
        if (ids.length < 3) throw ("Incorrect request body. Please ensure the link directs to a specific message");
        let server_id = ids[0];
        let channel_id = ids[1];
        let message_id = ids[2];
        
        let message = await utils.fetchMessage(globals, server_id, channel_id, message_id, true).catch(err => {throw (err)});*/
        let message = await utils.fetchMessageFromLink(globals, target, true).catch(err => {throw (err)});

        if (message.deleted){
            utils.botLogs(globals,  "----message "+message.id+" DELETED");
            throw ("Message with id ["+message.id+"] had been deleted");
        }
        if (message.author.id !== globals.client.user.id){
            utils.botLogs(globals,  "----message "+message.id+" is not a message from this bot");
            throw ("Message with id ["+message.id+"] is not a message from this bot");
        }

        await message.edit(edit_content).catch(err => {throw(err)});

        return "Request complete.\nSuccessfully edited message <"+target+">";
    }

    
}






