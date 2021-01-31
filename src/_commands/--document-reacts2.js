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



    manual: "**--document-reacts2**  ->  `message_link` `roleName or roleID` \n" +
            ".     *Dumps the reaction information of a specified post (via message link) into a specified google sheet;  lists all users of roleName with true/false values for each reaction and another column for no reaction.*  ***A role must be specified***",



    func: async function (globals, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>  or  https://discord.com/channels/<server>/<channel>/<message>
        var client = globals.client;

        if ( !globals.googleSheets )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");
        
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        var target = content.substr(0, content.indexOf(' ')).trim();
        var targetRole = content.substr(content.indexOf(' ')+1).trim();
        utils.botLogs(globals,  "----target:: "+target+"\n----targetRole:: "+targetRole);
        var server = msg.guild;

        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying role is valid");
        var role;
        role = server_roles.resolve(targetRole);
        if (!role) role = server_roles.cache.find(_role => _role.name === targetRole);
        if ( !role ){
            utils.botLogs(globals,  "----invalid role ::  "+targetRole);
            throw ("Invalid role -> "+targetRole);
        }
        var role = await server.roles.fetch(role.id); //for cache
        
        var list = [];
        var col = [];
        var col2 = [];
        var members = [];
        var noReaction = {}; 
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        col.push("displayname");
        col2.push("username");
        for (var member of role.members.values()){
            var member = await server.members.fetch(member);
            col.push(member.displayName+"#"+member.user.discriminator);
            col2.push(member.user.username+"#"+member.user.discriminator);
            members.push(member.id);
            noReaction[member.id] = true; //later updated to false if member has reacted
        }
        list.push(col);
        list.push(col2);
        utils.botLogs(globals,  "----complete");

        utils.botLogs(globals,  "--fetching message ["+target+"]");
        if ( !target.startsWith("https://discordapp.com/channels/") && !target.startsWith("https://discord.com/channels/")){
            utils.botLogs(globals,  "----invalid message link"+target);
            if ( !target.startsWith("https://discordapp.com/") && !target.startsWith("https://discord.com/"))
                throw ("Invalid message link (not discord link):  ["+target+"]");
            else
                throw ("Invalid message link (invalid discord link):  ["+target+"]");
        }
        var ids = target.startsWith("https://discordapp.com/channels/") ? target.substring("https://discordapp.com/channels/".length).split("/") : target.substring("https://discord.com/channels/".length).split("/");
        var server_id = ids[0];
        var channel_id = ids[1];
        var message_id = ids[2];
        var server = client.guilds.resolve(server_id);  //not really neccessary, could use `msg.guild` for more restrictive use
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
            throw ("Couldn't fetch message from id "+message_id);
        });

        if (message.deleted){
            utils.botLogs(globals,  "----message "+message.id+" DELETED");
            throw ("Message with id ["+message_id+"] had been deleted");
        } 
        else{
            var msg_reacts = message.reactions.cache.values(); //doesn't fetch reaction users
            
            utils.botLogs(globals,  "\n\nmessage ["+message.id+"] reactions");
            var date = utils.getDateTimeString(globals);
            var reacts_title = "reacts "+date+"  "+channel.name+"/"+message.id;

            var longest_col = 0;
            for (var msg_react of msg_reacts){
                var col = [];
                try{
                    var emote = msg_react.emoji.name+":"+msg_react.emoji.id;
                    col.push(emote);
                    utils.botLogs(globals,  "  "+emote);
                    var _react_users = await msg_react.users.fetch();
                    var react_users = _react_users;
                    for (var memberID of members){
                        var hasReacted = react_users.has(memberID);
                        col.push(hasReacted);
                        if(hasReacted){
                            var member = message.guild.members.resolve(memberID);
                            //utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                            utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator+":"+member.id+"   ("+member.user.username+")");
                        }
                        noReaction[memberID] = ((!hasReacted) && noReaction[memberID]); //only true if NOT hasReacted for all reactions
                    }
                } catch (err){
                    utils.botLogs(globals,  err.stack);
                    throw ("An error occurred, couldn't complete the request\n`"+err+"`");
                }
                longest_col = Math.max(longest_col, col.length);
                list.push(col);
            }

            /* print out members without reaction and insert col to doc */
            utils.botLogs(globals,  "\n\nUsers without reaction");
            var col = [];
            col.push("No Reaction");
            var noReacts = Object.keys(noReaction).filter(memberID => noReaction[memberID] == true); // only get the ones that didnt react
            for (var memberID of noReacts){ //for (var memberID of members){
                var member = await server.members.fetch(memberID); 
                var hasNotReacted = noReaction[memberID];
                col.push(hasNotReacted);
                //utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator+":"+member.id+"   ("+member.user.username+")");
            }
            list.push(col);
            

            /**  create new sheet and dump info  **/
            await gs_utils.dumpToSheet(msg, globals, reacts_title, list, 0, longest_col, 0, list.length)
            .catch (err => { throw (err); });
        }
    }

    
}
