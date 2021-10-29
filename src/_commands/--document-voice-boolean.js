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
    version: 2.0,
    auth_level: 3,



    manual: "**--document-voice-boolean**  ->  \\`channel_id/name\\`  roleID/Name <, role ... >\n" +
            ".     *Records the names of members that are in a specified voice channel into a google sheet;  lists all users of roleName with true/false values for voice channel participation.*\n"+
            ".     *At least one role resolvable must be provided, and each role will have three columns for username and display name of each member of that role and a boolean column for whether they are a participant of the voice channel*\n"+
            ".     *(cannot use channel name if name includes backtick/grave-accent-mark)*",



    func: async function (globals, msg, content){
        let client = globals.client;

        if ( !globals.googleSheets )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");
        
        if (utils.countOccurrences(content,'`') !== 2){
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.  The channel name or id must be encapsulated with a single backtick or grave accent mark ` (tilde key)");
        }
        let targetChannel;
        let targetRoles;
        let server = await msg.guild.fetch();
        let channel;


        /* parse args */
        let args = utils.extractEncapsulated(content, '`');
        if (args[2].trim().length == 0)   throw ("Incorrect request body.  At least one role resolvable must be provided");
        targetChannel = args[1].trim();
        targetRoles = args[2].trim().split(',').map(elem => elem.trim()).filter(elem => elem !== '');
        utils.botLogs(globals,  "--targetChannel:: "+targetChannel+"\n--targetRoles:: "+targetRoles);

        
        /* fetch channel */
        try {
            channel = utils.resolveChannel(globals, targetChannel, server.channels, true);
        } catch (err) { throw (err); }
        if ( channel.type !== "voice" ){
            throw new Error("Invalid given voice channel.  Given channel ["+targetChannel+"] is type: '"+channel.type+"'");
        }
        

        /* fetch roles */
        let server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--fetching role(s)");
        let roles = [];
        for (let targetRole of targetRoles){
            let role;
            try {
                role = utils.resolveRole(globals, targetRole, server_roles, true);
            } catch (err) { throw (err); }
            roles.push(role);
        };
        

        /* fetch member IDs */
        let all_members = {};
        for (let role of roles){
            let members = [];
            utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
            for (let member of role.members.values()){
                members.push(member.id);
            }
            all_members[role.id] = members;
        }


        /* determine participants per role */
        let list = [];
        let voice_members = channel.members;
        let date = utils.getDateTimeString(globals);
        let sheet_title = "@role in `"+channel.name+"` comms  "+date;
        for (let role of roles){
            let col_displayName = [];
            let col_username = [];
            let col_boolean = [];
            utils.botLogs(globals,  "\n\n"+role.name+" in  ["+channel.name+"] "+date);
            let not_in_comms = [];


            col_displayName.push("#"+role.name);
            col_username.push("\\\\");
            col_boolean.push("is in comms?");
            let members = all_members[role.id];
            for (let memberID of members){ 
                let member = channel.guild.members.resolve(memberID);
                col_displayName.push(member.displayName+"#"+member.user.discriminator);
                col_username.push(member.user.username+"#"+member.user.discriminator);
                if(voice_members.has(memberID)){
                    col_boolean.push(true);
                    utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                } else {
                    col_boolean.push(false);
                    not_in_comms.push("  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                }
            }
            list.push(col_displayName);
            list.push(col_username);
            list.push(col_boolean);

            /* print out members not in channel */
            utils.botLogs(globals,  "\n\nUsers not in channel");
            for (let str of not_in_comms){
                utils.botLogs(globals,  str);
            }
        }
        let numRows = Math.max(...list.map(arr => arr.length));
        

        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, sheet_title, list, 0, numRows, 0, list.length).catch (err => { throw (err); });
    }

    
}
