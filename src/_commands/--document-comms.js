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
    version: 1.0,
    auth_level: 3,



    manual: "**--document-comms**  ->  \\`channel/category_id/name <, ...>\\`   <roleID/Name/mention>\n" +
            ".     *Records the names of members that are in a specified voice channels into a google sheet.*\n"+
            ".     *Multiple channel/category resolvables can be used if separated by commas.*\n"+
            ".     *If no role resolvables are provided then only the participants of each voice channel will be added.*\n"+
            ".     *If a role resolvable is provided then all role participants, non-participants, and non-role participants, as well as the participants of each channel, will be recorded*\n"+
            ".     *(cannot use channel or category name if name includes backtick/grave-accent-mark)*",



    func: async function (globals, msg, content){
        let client = globals.client;

        if ( !globals.googleSheets )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");
        
        if (utils.countOccurrences(content,'`') !== 2){
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.\nThe category and channel resolvables should be encapsulated together by a single backtick/grave-accent-mark at each end.");
        }
        let targetChannels;
        let targetRole;
        let server = await msg.guild.fetch();
        let channels;


        /* parse args */
        let args = utils.extractEncapsulated(content, '`');
        targetChannels = args[1].trim().split(',').map(elem => elem.trim()).filter(elem => elem !== '');
        targetRole = args[2].trim() === '' ? null : args[2].trim();
        utils.botLogs(globals,  "--targetChannels:: "+targetChannels+"\n--targetRole:: "+(targetRole ? targetRole : "@everyone"));


        /* resolve voice channels */
        let resolvedVoice;
        try{
            resolvedVoice = utils.resolveVoiceChannels(globals, targetChannels, server, true);
        }
        catch (err){ throw (err); }
        let voiceChannelNames = resolvedVoice.voiceChannelNames;
        let targetVoiceChannels = resolvedVoice.targetVoiceChannels;

        
        /* fetch voice participants */
        let all_channel_participants = {};
        for (let channelID of targetVoiceChannels){
            let channel = server.channels.resolve(channelID);
            all_channel_participants[channelID] = [...channel.members.keys()];
        }
        let all_participants = Object.values(all_channel_participants).flat();


        /** determine voice participants **/
        let date = utils.getDateTimeString(globals);
        let list = [];
        let sheet_title = "temp";
        if (targetRole){ //@roles
            
            /* fetch roles */
            let server_roles = await server.roles.fetch();
            let role;
            try {
                role = utils.resolveRole(globals, targetRole, server_roles, true);
            } catch (err) { throw (err); }
            let roleMembers = [...role.members.keys()];

            sheet_title = role.name+" in voice channels "+date;
            utils.botLogs(globals,  "\n\n"+sheet_title);
            
            /* determine role participants */
            let role_participants = roleMembers.filter(id => all_participants.includes(id));
            let role_absentees = roleMembers.filter(id => !all_participants.includes(id));
            let nonrole_participants = all_participants.filter(id => !role_participants.includes(id));

            let col_role_participant_displayName = [];
            let col_role_participant_username = [];
            let col_role_absent_displayName = [];
            let col_role_absent_username = [];
            let col_nonrole_displayName = [];
            let col_nonrole_username = [];

            col_role_participant_displayName.push("@"+role.name+" participants");
            col_role_participant_username.push("\\\\");
            col_role_absent_displayName.push("absent");
            col_role_absent_username.push("\\\\");
            col_nonrole_displayName.push("non-@"+role.name+" participants");
            col_nonrole_username.push("\\\\");

            for (let memberID of role_participants){
                let member = server.members.resolve(memberID);
                col_role_participant_displayName.push(member.displayName+"#"+member.user.discriminator);
                col_role_participant_username.push(member.user.username+"#"+member.user.discriminator);
            }
            for (let memberID of role_absentees){
                let member = server.members.resolve(memberID);
                col_role_absent_displayName.push(member.displayName+"#"+member.user.discriminator);
                col_role_absent_username.push(member.user.username+"#"+member.user.discriminator);
            }
            for (let memberID of nonrole_participants){
                let member = server.members.resolve(memberID);
                col_nonrole_displayName.push(member.displayName+"#"+member.user.discriminator);
                col_nonrole_username.push(member.user.username+"#"+member.user.discriminator);
            }
            list.push(col_role_participant_displayName);
            list.push(col_role_participant_username);
            list.push(col_role_absent_displayName);
            list.push(col_role_absent_username);
            list.push(col_nonrole_displayName);
            list.push(col_nonrole_username);

            for (let channelID of targetVoiceChannels){
                let channel = server.channels.resolve(channelID);
                let col_participant_displayName = [];
                let col_participant_username = [];
                col_participant_displayName.push("#"+channel.name);
                col_participant_username.push("\\\\");

                let channel_participants = all_channel_participants[channelID];
                let channel_role_participants = channel_participants.filter(id => role_participants.includes(id));
                let channel_nonrole_participants = channel_participants.filter(id => nonrole_participants.includes(id));

                utils.botLogs(globals,  "  "+channel.name+" : "+channelID+"  with @"+role.name);
                for (let memberID of channel_role_participants){
                    let member = server.members.resolve(memberID);
                    col_participant_displayName.push(member.displayName+"#"+member.user.discriminator);
                    col_participant_username.push(member.user.username+"#"+member.user.discriminator);
                    utils.botLogs(globals,  "        "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                }

                if (channel_nonrole_participants.length > 0){
                    col_participant_displayName.push("█████████");
                    col_participant_username.push("██████████");
                    col_participant_displayName.push("");
                    col_participant_username.push("");
                }
                

                utils.botLogs(globals,  "  "+channel.name+" : "+channelID+"  without role");
                for (let memberID of channel_nonrole_participants){
                    let member = server.members.resolve(memberID);
                    col_participant_displayName.push(member.displayName+"#"+member.user.discriminator);
                    col_participant_username.push(member.user.username+"#"+member.user.discriminator);
                    utils.botLogs(globals,  "        "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                }
                list.push(col_participant_displayName);
                list.push(col_participant_username);
            }
        }



        else { //@everyone
            sheet_title = "@everyone in voice channels "+date;
            utils.botLogs(globals,  "\n\n"+sheet_title);

            for (let channelID of targetVoiceChannels){
                let channel = server.channels.resolve(targetChannel);
                let col_participant_displayName = [];
                let col_participant_username = [];
                col_participant_displayName.push("#"+channel.name);
                col_participant_username.push("\\\\");

                let channel_participants = all_channel_participants[channelID];

                utils.botLogs(globals,  channel.name+" : "+channelID);
                for (let memberID of channel_participants){
                    let member = server.members.resolve(memberID);
                    col_participant_displayName.push(member.displayName+"#"+member.user.discriminator);
                    col_participant_username.push(member.user.username+"#"+member.user.discriminator);
                    utils.botLogs(globals,  "    "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                }
                list.push(col_participant_displayName);
                list.push(col_participant_username);
            }
        }
        let numRows = Math.max(...list.map(arr => arr.length));


        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, sheet_title, list, 0, numRows, 0, list.length).catch (err => { throw (err); });
        
    }
   
}




