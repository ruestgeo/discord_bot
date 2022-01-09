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
const Discord = require('discord.js');


module.exports = {
    version: 1.0,
    auth_level: 4,



    manual: "--insert-embed  ->  *__message_link__*   embed_JSON"+
            ".     *insert or overwrite an embed with properties defined by the given JSON object into the given linked bot message\n*"+
            ".     *following this format:  https://discord.com/developers/docs/resources/channel#embed-object*",




    func: async function (globals, msg, content){ 
        if ( !content.includes("https://discordapp.com/channels/") && !content.includes("https://discord.com/channels/") ){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct and includes a message link.");
        }
        
        /* parse the message link and edit content */
        let target = content.substr(0, content.indexOf(' ')).trim();
        let args = content.substr(content.indexOf(' ')+1).trim();
        

        /* fetch message */
        let message = await utils.fetchMessageFromLink(globals, target, true).catch(err => {throw (err)});
        if (message.deleted){
            utils.botLogs(globals,  "----message "+message.id+" DELETED");
            throw ("Message with id ["+message.id+"] had been deleted");
        }
        if (message.author.id !== globals.client.user.id){
            utils.botLogs(globals,  "----message "+message.id+" is not a message from this bot");
            throw ("Message with id ["+message.id+"] is not a message from this bot");
        }

        /* parse embed */
        let embed_JSON;
        try{
            embed_JSON = JSON.parse( args );
        }
        catch (err){ throw (err); }
        utils.botLogs(globals, "--creating embed with properties: "+JSON.stringify(embed_JSON, null, "    "));
        let embed = new Discord.MessageEmbed(embed_JSON);



        await message.edit({content: message.content, embed: embed}).catch(err => {throw(err)});
        return "Request complete.\nSuccessfully edited message <"+target+">";
    }   
}






