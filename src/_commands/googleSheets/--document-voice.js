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






const Discord = require('discord.js');
const { ChannelType } = require('discord.js');
const utils = require(process.cwd()+'/utils.js'); 
const gs_utils = require(process.cwd()+'/_utils/googleSheets_utils'); 



module.exports = {
    version: 4.0,
    auth_level: 3,

            
    requisites: {
        startupTasks: {files : ["google/googleSheets_setup.js"]}
    },



    manual: "**--document-voice**  ->  \\`*channel_id***/***name*\\`  <*roleResolvable* , ... >\n" +
            "~~**•** >~~  *Records the names of members that are in a specified voice channel into a google sheet.*\n"+
            "~~**•** >~~  *If no role resolvables are provided then only columns for the displayName and username of the participants of the voice channel will be added.*\n"+
            "~~**•** >~~  *If at least one role resolvable is provided then two columns for each role (for displayName and username) as well as an additional two roles for members of that role who are not in the channel*\n"+
            "~~**•** >~~  *(cannot use channel name if name includes backtick/grave-accent-mark)*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){
        let client = globals.client;

        if ( !gs_utils.isInitialized() )
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
        targetChannel = args[1].trim();
        targetRoles = args[2].split(',').map(elem => elem.trim()).filter(elem => elem !== '');
        utils.botLogs(globals,  "--targetChannel:: "+targetChannel+"\n--targetRoles:: "+(targetRoles.length > 0 ? targetRoles : "@everyone"));


        /* fetch channel */
        try {
            channel = utils.resolveChannel(globals, targetChannel, server.channels, true);
        } catch (err) { throw (err); }
        if ( channel.type !== ChannelType.GuildVoice ){
            throw new Error("Invalid given voice channel.  Given channel ["+targetChannel+"] is type: '"+channel.type+"'");
        }
        
        /* fetch roles */
        let server_roles = await server.roles.fetch();
        if (targetRoles.length > 0)   utils.botLogs(globals,  "--fetching role(s)");
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
        let sheet_title = (targetRoles.length > 0 ? "@role" : "`@everyone`")+" in `"+channel.name+"` comms  "+date;
        if (targetRoles.length > 0){
            for (let role of roles){
                let col_IN_displayName = [];
                let col_NOT_displayName = [];
                let col_IN_username = [];
                let col_NOT_username = [];
                utils.botLogs(globals,  "\n\n"+role.name+" in  ["+channel.name+"] "+date);
                col_IN_displayName.push("#"+role.name);
                col_IN_username.push("\\\\");
                col_NOT_displayName.push("Not in Channel");
                col_NOT_username.push("\\\\");
                let members = all_members[role.id];
                for (let memberID of members){ 
                    let member = channel.guild.members.resolve(memberID);
                    if(voice_members.has(memberID)){
                        col_IN_displayName.push(member.displayName+"#"+member.user.discriminator);
                        col_IN_username.push(member.user.username+"#"+member.user.discriminator);
                        utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                    } else {
                        col_NOT_displayName.push(member.displayName+"#"+member.user.discriminator);
                        col_NOT_username.push(member.user.username+"#"+member.user.discriminator);
                    }
                }
                list.push(col_IN_displayName);
                list.push(col_IN_username);
                list.push(col_NOT_displayName);
                list.push(col_NOT_username);
    
                /* print out members not in channel */
                utils.botLogs(globals,  "\n\nUsers not in channel");
                for (let idx=1; idx < col_NOT_displayName.length; idx++){
                    utils.botLogs(globals,  "  "+col_NOT_displayName[idx]+"    ("+col_NOT_username[idx]+")");
                    
                }
            }
        }
        else { //@everyone in comms
            let col_displayName = [];
            let col_username = [];
            utils.botLogs(globals,  "\n\n@everyone in  ["+channel.name+"] "+date);
            col_displayName.push("@everyone");
            col_username.push("\\\\");
            for (let member of voice_members.values()){
                utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                col_displayName.push(member.displayName+"#"+member.user.discriminator);
                col_username.push(member.user.username+"#"+member.user.discriminator);
            }
            list.push(col_displayName);
            list.push(col_username);
        }
        let numRows = Math.max(...list.map(arr => arr.length));
        

        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, sheet_title, list, 0, numRows, 0, list.length).catch (err => { throw (err); });
        
    }
   
}

