/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code when asked if not already made public
*/






const utils = require('../utils.js');



module.exports = {
    version: 1.0,
    auth_level: 5,



    manual: "**--message**  ->  \\**user_ID*\\* ~~~\n" +
            ".     *takes a user ID of a member within the same server as the request, and repeats anything written after that to that member through a direct message*",



    func: async function (globals, msg, content){ 
        var client = globals.client;
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        var target = content.substr(0, content.indexOf(' ')).trim();
        var message_to_echo = content.substr(content.indexOf(' ')+1).trim();

        var member = msg.guild.members.resolve(target);

        if (!member){
            throw ("Invalid user_ID.  No member with user ID ["+target+"] within the server");
        }

        await member.send(message_to_echo);
    }

    
}






