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



    manual: "**--document-voice2**  ->  `channel_id` `roleName` \n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID) into a specified google sheet;  lists all users of roleName with true/false values for voice channel participation.*  ***A role must be specified***",



    func: async function (globals, msg, content){
        var client = globals.client;

        if (!globals.configs["googleEnabled"])
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
        
        var list = [];
        var col = [];
        var members = [];
        var notInChannel = [];
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        col.push(role.name);
        for (member of role.members.values()){
            col.push(member.displayName+"#"+member.user.discriminator);
            members.push(member.id);
        }
        list.push(col);
        utils.botLogs(globals,  "----complete");

        utils.botLogs(globals,  "--fetching channel ["+target+"]");
        client.channels.fetch(target.trim())
        .then(async (channel) => {
            var voice_members = channel.members;

            var date = utils.getDateTimeString(globals);
            var channel_title = channel.type+" channel ["+channel.name+"] "+date;
            utils.botLogs(globals,  "\n\n"+channel_title);

            col = [];
            col.push("#"+channel.name);
            for (memberID of members){ 
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
            for (memberID of notInChannel){
                var member = server.members.fetch(memberID).then(member => {
                    utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                }); 
                
            }

            /**  create new sheet and dump info  **/
            await utils.dumpToSheet(msg, globals, channel_title, list, 0, col.length, 0, list.length)
            .catch (err => { throw (err); });

        })
        .catch(err => {
            utils.botLogs(globals,  err.stack)
            throw ("An error occurred, couldn't complete the request\n`"+err+"`");
        });
    }

    
}
