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
    version: 1.4,
    auth_level: 3,



    manual: "**--document-voice3**  ->  `channel_id` `roleName or roleID` ~~  or  ~~ \\``channel_name`\\` `roleName roleID`\n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID, or by name if encapsulated with grave accents) into a specified google sheet;  lists all users of roleName for participation or not.*\n  ***A role must be specified***\n  *(cannot use channel name if name includes grave accent)*",



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

        
        var members = [];
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        for (var member of role.members.values()){
            members.push(member.id);
        }
        utils.botLogs(globals,  "----complete");

        var list = [];
        var col_IN = [];
        var col_NOT = [];
        var col_IN_un = [];
        var col_NOT_un = [];
        var voice_members = channel.members;
        
        var date = utils.getDateTimeString(globals);
        var channel_title = role.name+" in "+channel.type+" ["+channel.name+"] "+date;
        utils.botLogs(globals,  "\n\n"+channel_title);
        
        col_IN.push("#"+channel.name);
        col_IN_un.push("\\\\");
        col_NOT.push("Not in Channel");
        col_NOT_un.push("\\\\");
        for (var memberID of members){ 
            var member = channel.guild.members.resolve(memberID);
            if(voice_members.has(memberID)){
                col_IN.push(member.displayName+"#"+member.user.discriminator);
                col_IN_un.push(member.user.username+"#"+member.user.discriminator);
                utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
            } else {
                col_NOT.push(member.displayName+"#"+member.user.discriminator);
                col_NOT_un.push(member.user.username+"#"+member.user.discriminator);
            }
        }
        list.push(col_IN);
        list.push(col_IN_un);
        list.push(col_NOT);
        list.push(col_NOT_un);

        /* print out members not in channel */
        utils.botLogs(globals,  "\n\nUsers not in channel");
        for (var idx=1; idx < col_NOT.length; idx++){
            utils.botLogs(globals,  "  "+col_NOT[idx]+"    ("+col_NOT_un[idx]+")");
            
        }

        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, channel_title, list, 0, Math.max(col_IN.length, col_NOT.length), 0, list.length)
        .catch (err => { throw (err); });
        
    }
   
}

