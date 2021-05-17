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



    manual: "**--document-reacts**  ->  `message_link` \n" +
            ".     *Dumps the reaction information of a specified post (via message link) into a specified google sheet*",



    func: async function (globals, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>  or https://discord.com/channels/<server>/<channel>/<message>
        var client = globals.client;

        
        if ( !globals.googleSheets )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");
        
        
        content = content.trim();
        utils.botLogs(globals,  "--fetching message ["+content+"]");
        if ( !content.startsWith("https://discordapp.com/channels/") && !content.startsWith("https://discord.com/channels/")){
            utils.botLogs(globals,  "----invalid message link"+content);
            if ( !content.startsWith("https://discordapp.com/") && !content.startsWith("https://discord.com/"))
                throw ("Invalid message link (not discord link):  ["+content+"]");
            else
                throw ("Invalid message link (invalid discord link):  ["+content+"]");
        }
        var ids = content.startsWith("https://discordapp.com/channels/") ? content.substring("https://discordapp.com/channels/".length).split("/") : content.substring("https://discord.com/channels/".length).split("/");
        var server_id = ids[0];
        var channel_id = ids[1];
        var message_id = ids[2];
        var server = client.guilds.resolve(server_id);
        if( !server){
            utils.botLogs(globals,  "----server could not be resolved from id "+server_id);
            throw ("Server could not be resolved from id "+server_id);
        }
        var channel = server.channels.resolve(channel_id);
        if (!channel){
            utils.botLogs(globals,  "----channel could not be resolved from id "+channel_id);
            throw ("Channel could not be resolved from id "+channel_id);
        }
        var message = await channel.messages.fetch(message_id) //NOTE: currently only messages have links, if others have links then need to type check channel type
        .catch(err => {
            utils.botLogs(globals,  err.stack);
            throw (err);
        });
        if (message.deleted){
            utils.botLogs(globals,  "----message "+message.id+" DELETED");
            throw ("Message with id ["+message_id+"] had been deleted");
        } 
        else {
            var msg_reacts = message.reactions.cache.values(); //doesn't fetch reaction users
            
            utils.botLogs(globals,  "\n\nmessage ["+message.id+"] reactions");
            
            var date = utils.getDateTimeString(globals);
            var reacts_title = "reacts "+date+"  "+channel.name+"/"+message.id;

            var list = [];
            var longest_col = 0;
            for (var msg_react of msg_reacts){
                var col = [];
                var col2 = [];
                try{
                    var emote = msg_react.emoji.name+":"+msg_react.emoji.id;
                    col.push(emote);
                    col2.push("\\\\");
                    utils.botLogs(globals,  "  "+emote);
                    var _react_users = await msg_react.users.fetch();
                    var react_users = _react_users.values();
                    for (var user of react_users){
                        var _member = message.guild.members.resolve(user.id);
                        var display_name = _member  ?  _member.displayName+"#"+user.discriminator  :  "[NOT_IN_SERVER]__"+user.username+"#"+user.discriminator;
                        col.push(display_name);
                        col2.push(user.username+"#"+user.discriminator);
                        //utils.botLogs(globals,  "      "+display_name+":"+user.id);
                        utils.botLogs(globals,  "      "+display_name+":"+user.id+"   ("+user.username+")");
                    }
                } catch (err){
                    utils.botLogs(globals,  err.stack);
                    throw ("An error occurred, couldn't complete the request\n`"+err+"`");
                }
                longest_col = Math.max(longest_col, col.length);
                list.push(col);
                list.push(col2);
            }

            /**  create new sheet and dump info  **/
            await gs_utils.dumpToSheet(msg, globals, reacts_title, list, 0, longest_col, 0, list.length)
            .catch (err => { throw (err); });
        }
    }

    
}
