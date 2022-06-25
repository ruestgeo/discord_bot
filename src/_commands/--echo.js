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
    version: 1.4,
    auth_level: 3,



    manual: "**--echo**  ->  ( `here` **/** \\`*channelResolvable*\\` **/** #channel )        *message to send* \n" +
            "~~**•** >~~  *takes either \"here\" or a channel ID/tag/name and repeats anything written after that to the same channel.*\n"+
            "~~**•** >~~  *(channel resolvable should be enclosed enclose with \\`grave marks\\` unless it is a # mention/link)*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        let target;
        let message_to_echo;
        let channel;

        if (content.toLowerCase().startsWith("here ")){
            target = content.substring(0, content.indexOf(' ')).trim();
            message_to_echo = content.substring(content.indexOf(' ')+1).trim();
            channel = msg.channel;
        }
        else {
            if (utils.countOccurrences(content,'`') !== 2 && !content.startsWith("<#")){
                throw ("Incorrect request body.  Please ensure that the input arguments are correct.\nThe text channel resolvable should be encapsulated by a single backtick/grave-accent-mark at each end or must be a # mention/link");
            }

            /* parse args */
            let server = await msg.guild.fetch();
            if (content.startsWith("<#")){
                target = content.substring( (isNaN(content.charAt(2)) ? 3 : 2), content.length-1);
                message_to_echo = content.substring(content.indexOf(">")+1).trim();
            }
            else{
                let args = utils.extractEncapsulated(content, '`');
                if (args[1].trim().length == 0)   throw ("Incorrect request body.  At least one channel resolvable must be provided");
                target = args[1].trim();
                message_to_echo = args[2].trim();
            }
            utils.botLogs(globals,  "--targetChannel:: "+target);
            
            try {
                channel = utils.resolveChannel(globals, target, server.channels, true);
            }catch (err) {throw (err)}
            if (channel.type !== "GUILD_TEXT"){
                throw new Error("Incorrect given text channel.  Given channel ["+target+"] is type: '"+channel.type+"'");
            }
        }
        
        let echoed_message = await channel.send(message_to_echo).catch(err => {
            throw ("Error when sending message to text channel ["+channel.name+" : "+channel.id+"] ::   "+err)
        });


        return "Request complete.\nSuccessfully posted message <"+utils.url_prefix+echoed_message.guild.id+"/"+echoed_message.channel.id+"/"+echoed_message.id+">";

        
    }

    
}






