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
    auth_level: 3,



    manual: "**--react**  ->  *emote* < ...>  __*message_link*__ \n" +
            "~~**•** >~~  *takes up to 20 emotes (any extra is ignored) separated by spaces and a message link, and reacts to that message with those emotes*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){ 
        let client = globals.client;
        if ( !content.includes("https://discordapp.com/channels/") && !content.includes("https://discord.com/channels/") ){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        
        let index = content.includes("https://discordapp.com/channels/") ? content.indexOf("https://discordapp.com/channels/") : (content.includes("https://discord.com/channels/") ? content.indexOf("https://discord.com/channels/") : null);
        if (index < 0) throw ("Incorrect request body. Please ensure a message link is provided and that the link is accurate");
        let emotes = content.substring(0, index).trim().replace(/ +(?= )/g,'').replace("<","").replace(">","").split(" ",20);
        let target = content.substring(index).trim();

        utils.botLogs(globals,  "--obtained emotes:  [ "+emotes+" ]\n--fetching message ["+target+"]");
        let ids = target.startsWith("https://discordapp.com/channels/") ? target.substring("https://discordapp.com/channels/".length).split("/") : target.substring("https://discord.com/channels/".length).split("/");
        if (ids.length < 3) throw ("Incorrect request body. Please ensure the link directs to a specific message");
        let server_id = ids[0];
        let channel_id = ids[1];
        let message_id = ids[2];

        let server = await msg.guild.fetch();        
        if( server_id !== server.id ){
            utils.botLogs(globals,  "----cannot fetch message across servers");
            throw ("Cannot fetch message across servers.\nPlease use this command in the same server as the message you wish to react to.");
        }
        let channel = server.channels.resolve(channel_id);
        if ( !channel ){
            utils.botLogs(globals,  "----channel could not be resolved from id "+channel_id);
            throw ("Channel could not be resolved from id "+channel_id);
        }
        let message = await channel.messages.fetch(message_id)
        .catch(err => {
            utils.botLogs(globals,  err.stack);
            throw (err);
        });

        let count = 0;
        for (let emote of emotes){
            await message.react(emote)
            .then(_ => {count++;})
            .catch(err => {
                utils.botLogs(globals, "----error for  "+emote+"  reaction ::   "+err); 
                msg.channel.send("An error occured when attempting to react with the emote [ "+emote+" ]\n"+err)
            });
        }

        return "Request complete.\nSuccessfully reacted with [ "+count+" / "+emotes.length+" ] reactions with "+(emotes.length-count)+" failures";
    }

    
}






