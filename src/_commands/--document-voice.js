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
const gs_utils = require(process.cwd()+'/_utils/googleSheets_utils'); 



module.exports = {
    version: 1.3,
    auth_level: 3,



    manual: "**--document-voice**  ->  `channel_id`   *or*   \\``channel_name`\\` \n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID, or by name if encapsulated with grave accents) into a specified google sheet*",



    func: async function (globals, msg, content){
        var client = globals.client;

        if ( !globals.googleSheets )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");

        utils.botLogs(globals,  "--fetching channel ["+content+"]");
        var server = await msg.guild.fetch();
        var channel;
        var targetChannel;
        content = content.trim();
        
        if (content.startsWith("`") && content.endsWith("`")){ //check if channel can be resolved by name via cache search
            targetChannel = content.substring(1,content.length-1).trim();
            channel = server.channels.cache.find(_channel => _channel.name === targetChannel);
        }
        else  {
            targetChannel = content;
            channel = server.channels.resolve(targetChannel); //else resolve by ID
        }

        if (!channel) throw ("Channel ["+targetChannel+"] not found in server");
        if ( channel.type !== "voice" ){
            throw new Error("Invalid given voice channel.  Given channel ["+targetChannel+"] is type: '"+channel.type+"'");
        }


        var voice_members = channel.members.values();
            
        var date = utils.getDateTimeString(globals);
        var channel_title = channel.type+" channel ["+channel.name+"] "+date;

        utils.botLogs(globals,  "\n\n"+channel_title);
        var list = [];
        var col = [];
        var col2 = [];
        col.push("#"+channel.name);
        col2.push("\\\\");
        for (var member of voice_members){
            utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
            col.push(member.displayName+"#"+member.user.discriminator);
            col2.push(member.user.username+"#"+member.user.discriminator);
        }
        list.push(col);
        list.push(col2);

        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, channel_title, list, 0, col.length, 0, 1)
        .catch (err => { throw (err); });
    }

    
}
