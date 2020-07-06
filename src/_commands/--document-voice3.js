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
const gs_utils = require('../_utils/googleSheets_utils'); 



module.exports = {
    version: 1.2,
    auth_level: 3,



    manual: "**--document-voice3**  ->  `channel_id` `roleName` \n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID) into a specified google sheet;  lists all users of roleName for participation or not.*  ***A role must be specified***",



    func: async function (globals, msg, content){
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
        var role = server_roles.cache.find(_role => _role.name === targetRole.trim());
        if ( !role ){
            utils.botLogs(globals,  "----invalid role ::  "+targetRole);
            throw ("Invalid role -> "+targetRole);
        }
        var role = await server.roles.fetch(role.id); //for cache
        
        var members = [];
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        for (member of role.members.values()){
            members.push(member.id);
        }
        utils.botLogs(globals,  "----complete");

        var list = [];
        var col_IN = [];
        var col_NOT = [];
        utils.botLogs(globals,  "--fetching channel ["+target+"]");
        var channel = await client.channels.fetch(target.trim())
        .catch(err => {
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred, couldn't complete the request\n`"+err+"`");
        });
        var voice_members = channel.members;
        
        var date = utils.getDateTimeString(globals);
        var channel_title = role.name+" in "+channel.type+" ["+channel.name+"] "+date;
        utils.botLogs(globals,  "\n\n"+channel_title);
        
        col_IN.push("#"+channel.name);
        col_NOT.push("Not in Channel");
        for (memberID of members){ 
            var member = channel.guild.members.resolve(memberID);
            if(voice_members.has(memberID)){
                col_IN.push(member.displayName+"#"+member.user.discriminator);    
                utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator);
            } else col_NOT.push(member.displayName+"#"+member.user.discriminator);
        }
        list.push(col_IN);
        list.push(col_NOT);

        /* print out members not in channel */
        utils.botLogs(globals,  "\n\nUsers not in channel");
        for (var idx=1; idx < col_NOT.length; idx++){
            utils.botLogs(globals,  "  "+col_NOT[idx]);
            
        }

        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, channel_title, list, 0, Math.max(col_IN.length, col_NOT.length), 0, list.length)
        .catch (err => { throw (err); });
        
    }
   
}

