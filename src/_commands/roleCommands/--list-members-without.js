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



    manual: "--list-members-without  ->  <`@@`> <`@id` **/** `@u`>  *roleResolvable*  < ,  ... *additional_roles_for_filtering*>"+
            "~~**•** >~~  *reply with a list of members that do not have the specified roles (separated by commas)*\n"+
            "~~**•** >~~  *if no roles are provided then it will match anyone without any role*\n"+
            "~~**•** >~~  *if \"@@\" is given as an arg then listed members will include a ping/mention*\n"+
            "~~**•** >~~  *if \"@id\" is given as an arg then listed members will be listed by discord ID*\n"+
            "~~**•** >~~  *if \"@u\" is given as an arg then listed members will include a ping/mention*\n"+
            "~~**•** >~~  *NOTE: role names cannot contain commas or \"@\", otherwise this command will not function properly*",




/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} args   @returns {String|void} */
    func: async function (globals, msg, args){ 
        let configs = globals.configs;

        
        let roles;
        let server_roles = await msg.guild.roles.fetch();
        let members = await msg.guild.members.fetch();
        let list = [...members.values()];
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

        if ( args === "" ){
            utils.botLogs(globals,"--obtaining member list without any roles");
            for ( let member of list ){  await member.fetch();  } //cache
            list = list.filter(member => {
                if ( member.roles.cache.size > 1 ) //everyone has @everyone
                    return false;
                return true;
            });
            members_count = list.length;
            criteriaName = "\\**none*\\*";
        }


        else {
            utils.botLogs(globals,"--obtaining member list without role(s): "+args);
            roles = args.split(",").map(elem => elem.trim())
            .map( elem => utils.resolveRole(globals, elem, server_roles, true));
            utils.botLogs(globals,"--filtering member list");
            list = list.filter(member => {
                for (let role of roles){
                    if ( role.members.has(member.id) ){
                        return false;
                    }
                }
                return true;
            });
            members_count = list.length;
            criteriaName = roles.map(role => role.name+":"+role.id).join(", ");
        }
        utils.botLogs(globals,"--found "+members_count+" members\n--prepairing to send list through message(s)");

        
        let all = "";
        list.forEach(member => {
            all += (ping ? "<@"+member.id+">  " : "")+(mode === "nickname" ? member.displayName+"#"+member.user.discriminator : (mode === "username" ? member.user.username+"#"+member.user.discriminator : member.id))+"\n";
        });

        await utils.sendMessage(msg,all,false);

        return "found "+members_count+" members without the role(s) ["+criteriaName+"]";
    }   

}






