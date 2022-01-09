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






const utils = require('../utils.js');



module.exports = {
    version: 1.1,
    auth_level: 3,



    manual: "--list-rolemembers  ->  \\*roleName\\* ~~  or  ~~ \\*roleID\\*"+
            ".     *reply with an ordered list of members with the specified role*",




    func: async function (globals, msg, args){ 
        var configs = globals.configs;

        var role;
        var server_roles = await msg.guild.roles.fetch();
        var resolved = server_roles.resolve(args);
        if ( resolved )  role = resolved;
        else  role = server_roles.cache.find(_role => _role.name === args.trim());
        
        if (!role) throw ("Invalid role ::  role ["+args+"] not found");
        
        var all = "";
        var members_count = role.members.size;
        role.members.each(member => {
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
        else  msg.channel.send(all);
        return "found "+members_count+" members with the role ["+role.name+":"+role.id+"]";
    }   
}






