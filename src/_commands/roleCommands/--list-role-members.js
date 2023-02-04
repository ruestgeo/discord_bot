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



module.exports = {
    version: 2.1,
    auth_level: 3,



    manual: "--list-role-members  -> <`@@`> <`@id` **/** `@u`>  \\*roleResolvable\\*  < ,  ... *additional_roles_for_filtering*>"+
            "~~**•** >~~  *reply with a list of members that have the specified role*\n"+
            "~~**•** >~~  *if additional roles are given (delimited by comma) then it will filter the list such that anyone who does not have those roles is excluded*\n"+
            "~~**•** >~~  *if \"@@\" is given as an arg then listed members will include a ping/mention*\n"+
            "~~**•** >~~  *if \"@id\" is given as an arg then listed members will be listed by discord ID*\n"+
            "~~**•** >~~  *if \"@u\" is given as an arg then member will be listed by discord username*\n"+
            "~~**•** >~~  *NOTE: role names cannot contain commas or \"@\", otherwise this command will not function properly*",




/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} args   @returns {String|void} */
    func: async function (globals, msg, args){ 
        let configs = globals.configs;

        let list;
        let roles;
        let server_roles = await msg.guild.roles.fetch();
        let members_count;
        let criteriaName;
        let mode = "nickname";

        let ping = false;
        if (args.includes("@@")){
            ping = true;
            args = args.replace(/@@/g,"").trim();
        }
        if (args.includes("@id ")){
            mode = "id";
            args = args.replace(/@id/g,"").trim();
        }
        else if (args.includes("@u ")){
            mode = "username";
            args = args.replace(/@u/g,"").trim();
        }

        utils.botLogs(globals,"--obtaining member list of role(s): "+args);
        roles = args.split(",").map(elem => elem.trim())
        .map( elem => utils.resolveRole(globals, elem, server_roles, true));
        //console.log("DEBUG roles:  "+roles.map(elem => elem.name));
        criteriaName = roles.map(role => role.name+":"+role.id).join(", ");
        list = [...roles[0].members.values()];
        if (roles.length > 1){
            utils.botLogs(globals,"--filtering member list");
            roles = roles.slice(1);
            list = list.filter(member => {
                for (let role of roles){
                    utils.botLogs(globals,"----"+ role.name+" has "+member.displayName+"#"+member.user.discriminator+"  "+role.members.has(member.id));
                    if ( !role.members.has(member.id) ){
                        return false;
                    }
                }
                return true;
            });
        }
        members_count = list.length;
        
        if (members_count == 0){
            utils.botLogs(globals,"--found "+members_count+" members");
            return "found "+members_count+" members with the role(s) ["+criteriaName+"]"; 
        }
        utils.botLogs(globals,"--found "+members_count+" members\n--prepairing to send list through message(s)");

        
        let all = "";
        list.forEach(member => {
            all += (ping ? "<@"+member.id+">  " : "")+(mode === "nickname" ? member.displayName+"#"+member.user.discriminator : (mode === "username" ? member.user.username+"#"+member.user.discriminator : member.id))+"\n";
        });
        await utils.sendMessage(msg,all,false);

        return "found "+members_count+" members with the role(s) ["+criteriaName+"]";
    }   
}






