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
const utils = require(process.cwd()+'/utils.js');
const gs_utils = require(process.cwd()+'/_utils/googleSheets_utils'); 



module.exports = {
    version: 3.0,
    auth_level: 3,

            
    requisites: {
        startupTasks: {files : ["google/googleSheets_setup.js"]}
    },



    manual: "**--document-reacts**  ->  __*message_link*__  <*roleResolvable* , ... >  <`---no-role-reacts`> \n" +
            "~~**•** >~~  *Records the reactions and users who reacted of the specified message into a google sheet.*\n"+
            "~~**•** >~~  *If no role resolvable is provided then only the names of the users who reacted are recorded*\n"+
            "~~**•** >~~  *At least one role resolvable is provided then each role will have a column for displayName and username of each of the reactions and members of that role who have not reacted, and if `---no-role-reacts` is given as an arg then columns for each react with members with none of the roles is also added*",



/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>  or  https://discord.com/channels/<server>/<channel>/<message>
        let client = globals.client;

        if ( !gs_utils.isInitialized() )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");
        
        if ( !content.includes("https://discordapp.com/channels/") && !content.includes("https://discord.com/channels/") ){
            throw ("Incorrect request body.  A recognizable message_link has not been provided");
        }

        /* parse args */
        let targetMessage;
        let targetRoles;
        let noRoleReacts = false;
        if (content.includes("---no-role-reacts")){
            content = content.replace(/---no-role-reacts/g,"");
            noRoleReacts = true;
        }
        if (content.includes(" ")){
            utils.botLogs(globals,  "--roles mode");
            targetMessage = content.substring(0, content.indexOf(' ')).trim();
            targetRoles = content.substring(content.indexOf(' ')+1).trim().split(',').map(elem => elem.trim()).filter(elem => elem !== '');
        }
        else {
            utils.botLogs(globals,  "--@everyone mode");
            if (content.includes(","))   throw ("Incorrect request body.  Please ensure the args are correctly formatted");
            targetMessage = content;
            targetRoles = [];
        }
        utils.botLogs(globals,  "--targetMessage:: "+targetMessage+"\n--targetRoles:: "+(targetRoles.length > 0 ? targetRoles : "@everyone"));
        let server = await msg.guild.fetch();


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
        

        /* fetch members */
        let all_members = {};
        for (let role of roles){
            let members = [];
            utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
            for (let member of role.members.values()){
                members.push(member.id);
            }
            all_members[role.id] = members;
        }


        /* fetch message */
        if ( !targetMessage.startsWith("https://discordapp.com/channels/") && !targetMessage.startsWith("https://discord.com/channels/")){
            throw ("message_link cannot be recognized as a valid link to a discord message");
        }
        let ids = targetMessage.startsWith("https://discordapp.com/channels/") ? targetMessage.substring("https://discordapp.com/channels/".length).split("/") : targetMessage.substring("https://discord.com/channels/".length).split("/");
        if (ids.length !== 3)  throw ("Invalid message link;  number of resolvable IDs is not 3 (found "+ids.length+")");
        let message = await utils.fetchMessage(globals, ids[0],ids[1],ids[2]).catch(err => {throw (err);});
        if (message.guild.id !== server.id){
            utils.botLogs(globals,  "----request not from same server as target message");
            throw ("Request not from same server as target message");
        }


        /* fetch reacts */
        let msg_reactions = message.reactions.cache.values(); //doesn't fetch reaction users
        let msg_reacts = {};
        for (let msg_reaction of msg_reactions){
            msg_reaction = await msg_reaction.fetch();
            let emote = utils.resolveEmote(msg_reaction.emoji);
            let users = await msg_reaction.users.fetch();
            msg_reacts[emote.emote] = {"users": users, "string": emote.string};
        }
        let all_reacted_members = Object.values(msg_reacts).map(emoteInfo => [...emoteInfo.users.keys()]).flat();
        //let all_emotes = Object.values(msg_reacts).map(emoteInfo => emoteInfo.string);


        /* determine user reacts per role */
        let list = [];
        let reacted_no_role = {}; 
        let date = utils.getDateTimeString(globals);
        let sheet_title = (targetRoles.length > 0 ? "@role" : "`@everyone`")+" reacts on `#"+message.channel.name+"/"+message.id+"`   "+date;
        if (targetRoles.length > 0){ //roles
            for (let role of roles){
                utils.botLogs(globals,  "\n\nreactions by @"+role.name);
                let roleMembers = all_members[role.id];

                for (let emote in msg_reacts){
                    let users = msg_reacts[emote].users;
                    let emote_string = msg_reacts[emote].string;
                    let col_react_displayName = [];
                    let col_react_username = [];
                    col_react_displayName.push(emote_string+" @"+role.name);
                    col_react_username.push("\\\\");
                    utils.botLogs(globals,  "\n\n"+emote_string+" reacts by @"+role.name);
                    let reacted_users = [...users.keys()];
                    let reacted_role_members = reacted_users.filter(id => roleMembers.includes(id));

                    if ( !reacted_no_role.hasOwnProperty(emote) )    reacted_no_role[emote] = [];
                    reacted_no_role[emote].push( reacted_users.filter(id => !roleMembers.includes(id)) );

                    for (let memberID of reacted_role_members){
                        let member = server.members.resolve(memberID);
                        col_react_displayName.push(member.displayName+"#"+member.user.discriminator);
                        col_react_username.push(member.user.username+"#"+member.user.discriminator);
                        utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                    }
                    list.push(col_react_displayName);
                    list.push(col_react_username);
                }

                //obtain list of users without reacts
                let no_react = roleMembers.filter(memberID => !all_reacted_members.includes(memberID));
                let col_no_react_displayName = [];
                let col_no_react_username = [];
                col_no_react_displayName.push("no reacts");
                col_no_react_username.push("\\\\");
                utils.botLogs(globals,  "\n\nno reactions by @"+role.name);
                for (let memberID of no_react){
                    let member = server.members.resolve(memberID);
                    col_no_react_displayName.push(member.displayName+"#"+member.user.discriminator);
                    col_no_react_username.push(member.user.username+"#"+member.user.discriminator);
                    utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                }
                list.push(col_no_react_displayName);
                list.push(col_no_react_username);
            }

            //obtain list of user who reacted but have none of the roles
            if (noRoleReacts){
                let server_members = await server.members.fetch();
                for (let emote in msg_reacts){
                    let emote_string = msg_reacts[emote].string;
                    let no_role_users = reacted_no_role[emote].reduce( (A,B) => A.filter( memberID => B.includes(memberID)) );
                    let no_role_users_displayName = [];
                    let no_role_users_username = [];
                    no_role_users_displayName.push(emote_string + " no roles");
                    no_role_users_username.push("\\\\");
                    utils.botLogs(globals,  "\n\n"+emote_string+" reacts but none of the roles");
                    for (let id of no_role_users){
                        let no_role_user = server_members.get(id);
                        if (!no_role_user) { //is not server member
                            no_role_user = await client.users.fetch(id);
                            no_role_users_displayName.push("|ID| "+id);
                            no_role_users_username.push(no_role_user ? no_role_user.tag : no_role_user.id);
                        }
                        else { //is server member
                            no_role_users_displayName.push(no_role_user.displayName+"#"+no_role_user.user.discriminator);
                            no_role_users_username.push(no_role_user.user.tag);
                        }
                    }
                    utils.botLogs(globals,  no_role_users_displayName.slice(1).map(dn => "  "+dn).join("\n"));
                    list.push(no_role_users_displayName);
                    list.push(no_role_users_username);
                }
            }
            
        }
        else { //@everyone
            for (let emote in msg_reacts){
                let users = msg_reacts[emote].users;
                let emote_string = msg_reacts[emote].string;
                let col_react_displayName = [];
                let col_react_username = [];
                col_react_displayName.push(emote_string+" reacts");
                col_react_username.push("\\\\");
                utils.botLogs(globals,  "\n\n"+emote_string+" reacts");
                let reacted_members = [...users.keys()];
                for (let memberID of reacted_members){
                    let member = server.members.resolve(memberID);
                    col_react_displayName.push(member.displayName+"#"+member.user.discriminator);
                    col_react_username.push(member.user.username+"#"+member.user.discriminator);
                    utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                }
                list.push(col_react_displayName);
                list.push(col_react_username);
            }
        }
        let numRows = Math.max(...list.map(arr => arr.length));


        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, sheet_title, list, 0, numRows, 0, list.length).catch (err => { throw (err); });

    }

    
}
