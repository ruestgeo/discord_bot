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






const utils = require(process.cwd()+'/utils.js'); 
const gs_utils = require(process.cwd()+'/_utils/googleSheets_utils'); 



module.exports = {
    version: 1.3,
    auth_level: 3,



    manual: "**--document-voice2**  ->  `channel_id` `roleName or roleID` ~~  or  ~~ \\``channel_name`\\` `roleName or roleID`\n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID, or by name if encapsulated with backtick/grave-accent-mark) into a specified google sheet;  lists all users of roleName with true/false values for voice channel participation.*\n  ***A role must be specified***\n  *(cannot use channel name if name includes backtick/grave-accent-mark)*",



    func: async function (globals, msg, content){
        var client = globals.client;

        if ( !globals.googleSheets )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");
        
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        var targetChannel;
        var targetRole;
        content = content.trim();
        var server = await msg.guild.fetch();
        var channel;
        
        if (content.startsWith("`")){
            utils.botLogs(globals,  "--resolving channel by name");
            var idx = content.substring(1).indexOf("`")+1;
            targetChannel = content.substring(1,idx).trim();
            targetRole = content.substring(idx+1).trim();
            channel = server.channels.cache.find(_channel => _channel.name === targetChannel);
        }
        else {
            utils.botLogs(globals,  "--resolving channel by id");
            targetChannel = content.substr(0, content.indexOf(' ')).trim();
            targetRole = content.substr(content.indexOf(' ')+1).trim();
            channel = server.channels.resolve(targetChannel);
        }
        utils.botLogs(globals,  "----targetChannel:: "+targetChannel+"\n----targetRole:: "+targetRole);

        if (!channel)  throw ("Channel ["+targetChannel+"] not found in server");
        if ( channel.type !== "voice" ){
            throw new Error("Invalid given voice channel.  Given channel ["+targetChannel+"] is type: '"+channel.type+"'");
        }
        
        
        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying role is valid");
        var role;
        role = server_roles.resolve(targetRole);
        if (!role) role = server_roles.cache.find(_role => _role.name === targetRole);
        if ( !role ){
            utils.botLogs(globals,  "----invalid role ::  "+targetRole);
            throw ("Invalid role -> "+targetRole);
        }
        var role = await server_roles.fetch(role.id); //for cache
        
        
        var list = [];
        var col = [];
        var col2 = [];
        var members = [];
        var notInChannel = [];
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        col.push(role.name);
        col2.push("\\");
        for (var member of role.members.values()){
            col.push(member.displayName+"#"+member.user.discriminator);
            col2.push(member.user.username+"#"+member.user.discriminator);
            members.push(member.id);
        }
        list.push(col);
        list.push(col2);
        utils.botLogs(globals,  "----complete");


        var voice_members = channel.members;

        var date = utils.getDateTimeString(globals);
        var channel_title = channel.type+" channel ["+channel.name+"] "+date;
        utils.botLogs(globals,  "\n\n"+channel_title);

        col = [];
        col.push("#"+channel.name);
        for (var memberID of members){ 
            var isMemberInChannel = voice_members.has(memberID);
            col.push(isMemberInChannel);
            if(isMemberInChannel){
                var member = voice_members.get(memberID);
                utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
            } else notInChannel.push(memberID);
        }
        list.push(col);

        /* print out members not in channel */
        utils.botLogs(globals,  "\n\nUsers not in channel");
        for (var memberID of notInChannel){
            var member = server.members.fetch(memberID).then(member => {
                utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
            }); 
            
        }

        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, channel_title, list, 0, col.length, 0, list.length)
        .catch (err => { throw (err); });
    }

    
}
