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
    version: 1.2,
    auth_level: 5,



    manual: "**--message**  ->  *memberResolvable* ~~~\n" +
            "~~**•** >~~  *takes a user ID/name or mention of a member within the same server as the request, and repeats anything written after that to that member through a direct message*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){ 
        let client = globals.client;
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        let target = content.substring(0, content.indexOf(' ')).trim();
        let message_to_echo = content.substring(content.indexOf(' ')+1).trim();


        utils.botLogs(globals, "--given target: "+target);
        let member = utils.resolveMember(globals, target, await msg.guild.members.fetch(), true);
        

        if (!member){
            utils.botLogs(globals, "--member not found");
            throw ("Invalid user_ID.  No member  ["+target+"] within the server");
        }
        utils.botLogs(globals, `--member:  ${member.displayName}#${member.user.discriminator}`);
        
        await member.send(message_to_echo).catch(err => {throw (err)});
        utils.botLogs(globals,`  sent DM to ${member.displayName}#${member.user.discriminator}`);
        return "Request complete";
    }

    
}






