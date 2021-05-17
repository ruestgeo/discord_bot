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
    version: 2.0,
    auth_level: 3,



    manual: "**--document-reacts-boolean**  ->  `message_link` `roleName or roleID` \n" +
    ".     *Records the reactions and users who reacted of the specified message into a google sheet.*\n"+
    ".     *At least one role resolvable is required, and each role will have a column for displayName and username of members of that role and a boolean whether they reacted or not*",



    func: async function (globals, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>  or  https://discord.com/channels/<server>/<channel>/<message>
        let client = globals.client;

        if ( !globals.googleSheets )
            throw ("Google Sheets has not been enabled, contact sys-admin to set up");
        
        if ( !content.includes("https://discordapp.com/channels/") && !content.includes("https://discord.com/channels/") ){
            throw ("Incorrect request body.  A recognizable message_link has not been provided");
        }

        /* parse args */
        let targetMessage;
        let targetRoles;
        if (content.includes(" ")){
            targetMessage = content.substr(0, content.indexOf(' ')).trim();
            targetRoles = content.substr(content.indexOf(' ')+1).trim().split(',').map(elem => elem.trim()).filter(elem => elem !== '');
        }
        else   throw ("Incorrect request body.  At least one role resolvable must be provided");
        utils.botLogs(globals,  "--targetMessage:: "+targetMessage+"\n--targetRoles:: "+targetRoles);
        let server = await msg.guild.fetch();


        /* fetch roles */
        let server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--fetching role(s)");
        let roles = [];
        for (let targetRole of targetRoles){
            let role;
            try{
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
        if (message.deleted){
            utils.botLogs(globals,  "----message "+message.id+" DELETED");
            throw ("Message with id ["+message.id+"] had been deleted");
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
        let date = utils.getDateTimeString(globals);
        let sheet_title = "@role reacts on `#"+message.channel.name+"/"+message.id+"`   "+date;
        for (let role of roles){
            utils.botLogs(globals,  "\n\nreactions by @"+role.name);
            let roleMembers = all_members[role.id];

            for (let emote in msg_reacts){
                let users = msg_reacts[emote].users;
                let emote_string = msg_reacts[emote].string;
                let col_react_displayName = [];
                let col_react_username = [];
                let col_reacted = [];
                col_react_displayName.push(emote_string+" @"+role.name);
                col_react_username.push("\\\\");
                col_reacted.push("");
                utils.botLogs(globals,  "\n\n"+emote_string+" reacts by @"+role.name);
                let reacted_members = [...users.keys()];
                for (let memberID of roleMembers){
                    let member = server.members.resolve(memberID);
                    col_react_displayName.push(member.displayName+"#"+member.user.discriminator);
                    col_react_username.push(member.user.username+"#"+member.user.discriminator);
                    if (reacted_members.includes(memberID)){
                        utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+"    ("+member.user.username+"#"+member.user.discriminator+")");
                        col_reacted.push(true);
                    }
                    else   col_reacted.push(false);
                }
                list.push(col_react_displayName);
                list.push(col_react_username);
                list.push(col_reacted);
            }
        }
        let numRows = Math.max(...list.map(arr => arr.length));


        /**  create new sheet and dump info  **/
        await gs_utils.dumpToSheet(msg, globals, sheet_title, list, 0, numRows, 0, list.length).catch (err => { throw (err); });

    }

    
}
