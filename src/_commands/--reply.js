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
const { ChannelType } = require('discord.js');
const utils = require(process.cwd()+'/utils.js');



module.exports = {
    version: 2.0,
    auth_level: 3,



    manual: "**--reply**  ->  __*message_link*__       *message to send*\n" +
            "~~**•** >~~  *takes message link and repeats anything written after that to the same channel.*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){
        if (!content.includes(' ') || !content.startsWith("https://discord.com/channels/")){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        let server = await msg.guild.fetch();

        let link = content.substring(0, content.indexOf(' ')).trim();
        let message_to_echo = content.substring(content.indexOf(' ')+1).trim();
        let target = await utils.fetchMessageFromLink(globals, link, true);
        let channel;
        try {
            channel = utils.resolveChannel(globals, target.channel.id, server.channels, true);
        }catch (err) {throw (err)}
        if (channel.type !== ChannelType.GuildText){
            throw new Error("Incorrect given text channel.  Given channel ["+target+"] is type: '"+channel.type+"'");
        }
        
        
        let reply_message = await target.reply(message_to_echo).catch(err => {
            throw ("Error when replying message <"+link+"> in text channel ["+channel.name+" : "+channel.id+"] ::   "+err)
        });


        return "Request complete.\nSuccessfully posted message <"+utils.url_prefix+reply_message.guild.id+"/"+reply_message.channel.id+"/"+reply_message.id+">";

        
    }

    
}






