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






const utils = require(process.cwd()+'/utils.js');



module.exports = {
    version: 1.1,
    auth_level: 3,



    manual: "**--echo**  ->  here ~~  or  ~~ \\**channel_ID*\\* ~~~\n" +
            ".     *takes either \"here\" or a channel ID and repeats anything written after that to the same channel if \"here\" or to the specified channel if channel_ID*",



    func: async function (globals, msg, content){ 
        var client = globals.client;
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        var target = content.substr(0, content.indexOf(' ')).trim();
        var message_to_echo = content.substr(content.indexOf(' ')+1).trim();

        if (target.toLowerCase() === "here"){
            await msg.channel.send(message_to_echo);
            return;
        }

        utils.botLogs(globals,  "--fetching text channel ["+target+"]");
        var textChannel = await client.channels.fetch(target.trim())
        .catch(err => {
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred during text channel fetch, couldn't complete the request\n`"+err+"`");
        });
        if (textChannel.type !== "text"){
            utils.botLogs("----invalid channel type");
            throw new Error("Incorrect text channel id.  Given channel ["+target+"] is type: '"+textChannel.type+"'");
        }
        await textChannel.send(message_to_echo).catch(err => {
            throw ("Error when sending message to target channel ::   "+err)
        });
    }

    
}






