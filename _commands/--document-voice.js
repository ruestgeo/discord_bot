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






const utils = require('../utils.js'); //utils is located in the directory above, if needed



module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "**--document-voice**  ->  `channel_id` \n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID) into a specified google sheet*",



    func: async function (globals, msg, content){
        var client = globals.client;

        if (!globals.configs["googleEnabled"])
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");

        utils.botLogs(globals,  "--fetching channel ["+content+"]");
        client.channels.fetch(content.trim())
        .then(async (channel) => {
            var voice_members = channel.members.values();
            
            var date = utils.getDateTimeString(globals);
            var channel_title = channel.type+" channel ["+channel.name+"] "+date;

            utils.botLogs(globals,  "\n\n"+channel_title);
            var list = [];
            var col = [];
            col.push("#"+channel.name);
            for (member of voice_members){
                utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                col.push(member.displayName+"#"+member.user.discriminator);
            }
            list.push(col);

            /**  create new sheet and dump info  **/
            await utils.dumpToSheet(msg, globals, channel_title, list, 0, col.length, 0, 1)
            .catch (err => { throw (err); });

        })
        .catch(err => {
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred, couldn't complete the request\n`"+err+"`");
        });
    }

    
}