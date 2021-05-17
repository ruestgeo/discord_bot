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



module.exports = {
    version: 1.2,
    auth_level: 3,



    manual: "--list-role-members  ->  \\*roleName\\* ~~  or  ~~ \\*roleID\\*  < ,  ... additional_roles_for_filtering>"+
            ".     *reply with a list of members that have the specified role*\n"+
            ".     *if additional roles are given (delimited by comma) then it will filter the list such that anyone who does not have those roles is excluded*\n"+
            ".     *NOTE: roles cannot contain commas, otherwise this command will not function properly*",




    func: async function (globals, msg, args){ 
        let configs = globals.configs;

        let list;
        let roles;
        let server_roles = await msg.guild.roles.fetch();
        let members_count;
        let criteriaName;
        utils.botLogs(globals,"--obtaining member list of role(s): "+args);
        if ( !args.includes(",") ){
            var resolved = server_roles.resolve(args);
            if ( !resolved )   resolved = server_roles.cache.find(_role => _role.name === args.trim());
            if ( !resolved )   throw ("Invalid role ::  role ["+args+"] not found");
            list = [...resolved.members.values()];
            members_count = list.length;            
            criteriaName = resolved.name+":"+resolved.id;
        }
        else {
            roles = args.split(",").map(elem => elem.trim())
            .map( elem => {
                let resolved = server_roles.resolve(elem);
                if ( !resolved )   resolved = server_roles.cache.find(_role => _role.name === elem);
                if ( !resolved )   throw ("Invalid role ::  role ["+elem+"] not found");
                return resolved;
            });
            //console.log("DEBUG roles:  "+roles.map(elem => elem.name));
            utils.botLogs(globals,"--filtering member list");
            criteriaName = roles.map(role => role.name+":"+role.id).join(", ");
            list = [...roles[0].members.values()];
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
            members_count = list.length;
        }
        utils.botLogs(globals,"--found "+members_count+" members\n--prepairing to send list through message(s)");

        
        var all = "";
        list.forEach(member => {
            all += member.displayName+"#"+member.user.discriminator+"\n";
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
        return "found "+members_count+" members with the role(s) ["+criteriaName+"]";
    }   
}






