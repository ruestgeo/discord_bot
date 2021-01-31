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
    version: 1.2,
    auth_level: 3,



    manual: "**--echo**  ->  here ~~  or  ~~ `channel_ID` ~~  or  ~~ `channelTag` ~~  or  ~~ `channel_name` ~~  or  ~~ \\``channel_name`\\`       __ message to send __\n" +
            ".     *takes either \"here\" or a channel ID/tag/name and repeats anything written after that to the same channel if \"here\" or to the specified channel if channel_ID*\n"+
            ".     *(if using channel name with spaces then enclose with \\`grave marks\\`)*",



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



        var server = await msg.guild.fetch();
        var textChannel;
        utils.botLogs(globals,  "--resolving text channel ["+target+"]");
        textChannel = server.channels.resolve(target);
        if ( !textChannel && (target.startsWith("<#") && target.endsWith(">")) ) { //cant resolve links/tags for whatever reason
            target = target.substring(2, target.length-1);
            textChannel = server.channels.resolve(target);
        }
        if (!textChannel){
            if (content.startsWith("`")){
                utils.botLogs(globals,  "--resolving channel by name");
                var idx = content.substring(1).indexOf("`")+1;
                target = content.substring(1,idx).trim();
                message_to_echo = content.substring(idx+1).trim();
            }
            textChannel = server.channels.cache.find(_channel => _channel.name === target);
            if (!textChannel) throw ("Could not find text channel ["+target+"] in server");
        }
        if (textChannel.type !== "text"){
            throw new Error("Incorrect given text channel.  Given channel ["+target+"] is type: '"+textChannel.type+"'");
        }



        await textChannel.send(message_to_echo).catch(err => {
            throw ("Error when sending message to target channel ::   "+err)
        });
    }

    
}






