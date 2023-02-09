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
    version: 3.0,
    auth_level: 4,



    manual: "--insert-embed  ->  <`---replace`> __*message_link*__   *embed_JSON*"+
            "~~**•** >~~  *insert or overwrite an embed with properties defined by the given JSON object into the given linked bot message.\n*"+
            "~~**•** >~~  *if '---replace' is provided as the first arg then the existing message embeds are replaced rather than appended to.\n*"+
            "~~**•** >~~  *following this format:  https://discord.com/developers/docs/resources/channel#embed-object*",



    /** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){ 
        if ( !content.includes("https://discordapp.com/channels/") && !content.includes("https://discord.com/channels/") ){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct and includes a message link.");
        }
        
        /* parse the message link and edit content */
        let replace = content.startsWith("---replace");
        if (content.startsWith("---replace"))  content = content.substring("---replace".length).trim();
        let target = content.substring(0, content.indexOf(' ')).trim();
        let args = content.substring(content.indexOf(' ')+1).trim();
        

        /* fetch message */
        let message = await utils.fetchMessageFromLink(globals, target, true).catch(err => {throw (err)});
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
        let embed = new Discord.EmbedBuilder(embed_JSON);



        await message.edit({content: message.content, embeds: (replace ? [embed] : [...msg.embeds, embed])}).catch(err => {throw(err)});
        return "Request complete.\nSuccessfully edited message <"+target+">";
    }   
}






