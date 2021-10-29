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



module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "--list-members-without2  ->  \\*none\\* ~~  or  ~~ \\*roleName\\* ~~  or  ~~ \\*roleID\\*  < ,  ... additional_roles_for_filtering>"+
            ".     *reply with an ordered list of members (with mentions) that do not have the specified roles (separated by commas)*\n"+
            ".     *NOTE: roles cannot contain commas, otherwise this command will not function properly*",




    func: async function (globals, msg, args){ 
        let configs = globals.configs;

        
        let roles;
        let server_roles = await msg.guild.roles.fetch();
        let members = await msg.guild.members.fetch();
        let list = [...members.values()];
        let members_count;
        let criteriaName;
        

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
            .map( elem => {
                let resolved = server_roles.resolve(elem);
                if ( !resolved )   resolved = server_roles.cache.find(_role => _role.name === elem);
                if ( !resolved )   throw ("Invalid role ::  role ["+elem+"] not found");
                return resolved;
            });
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

        
        var all = "";
        list.forEach(member => {
            all += "<@"+member.id+">  "+member.displayName+"#"+member.user.discriminator+"\n";
        });

        if (all.length > 2000){
            var parts = [];
            while (all.length > 2000){
                var split_index = all.substr(1800, all.length).indexOf("\n")+1800;
                parts.push(all.substr(0,split_index));
                all = all.substr(split_index, all.length);
            }
            for (var part of parts){ msg.channel.send(part); }
            if (all.trim() !== "") msg.channel.send(all); //last part
        }
        else if (all.trim() != "")  msg.channel.send(all);
        return "found "+members_count+" members without the role(s) ["+criteriaName+"]";
    }   

}






