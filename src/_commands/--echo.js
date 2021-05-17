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
    version: 1.3,
    auth_level: 3,



    manual: "**--echo**  ->  here /\\``channel_name/id/tag`\\`       __ message to send __\n" +
            ".     *takes either \"here\" or a channel ID/tag/name and repeats anything written after that to the same channel.*\n"+
            ".     *(channel resolvable should be enclosed enclose with \\`grave marks\\`)*",



    func: async function (globals, msg, content){
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        let target;
        let message_to_echo;
        let channel;

        if (content.toLowerCase().startsWith("here ")){
            target = content.substr(0, content.indexOf(' ')).trim();
            message_to_echo = content.substr(content.indexOf(' ')+1).trim();
            channel = msg.channel;
        }
        else {
            if (utils.countOccurrences(content,'`') !== 2){
                throw ("Incorrect request body.  Please ensure that the input arguments are correct.\nThe text channel resolvables should be encapsulated by a single backtick/grave-accent-mark at each end.");
            }

            /* parse args */
            let server = await msg.guild.fetch();
            let args = utils.extractEncapsulated(content, '`');
            if (args[1].trim().length == 0)   throw ("Incorrect request body.  At least one channel resolvable must be provided");
            target = args[1].trim();
            message_to_echo = args[2].trim()
            utils.botLogs(globals,  "--targetChannel:: "+channel);
            
            try {
                channel = resolveChannel(globals, target, server.channels, true);
            }catch (err) {throw (err)}
            if (channel.type !== "text"){
                throw new Error("Incorrect given text channel.  Given channel ["+target+"] is type: '"+channel.type+"'");
            }
        }
        
        await channel.send(message_to_echo).catch(err => {
            throw ("Error when sending message to text channel ["+channel.name+" : "+channel.id+"] ::   "+err)
        });



        
    }

    
}






