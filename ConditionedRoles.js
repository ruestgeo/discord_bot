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

//const utils = require('./utils.js');

module.exports = {
    giveRoles: function(client, msg, content){
        //{"give-role": ['roleName', ...] <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("give-role")){
            //roles.concat(args["give-role"]);
            for (role of args["give-role"])
                roles.push(role);
        } else {
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct. 'give-role' is necessary.  It should be of the following form: \n"+
                "`{\"give-role\": ['roleName', ...] <,  \"has-role\": ['roleName', ...]> <,  \"missing-role\": ['roleName', ...]>  }`");
            return;
        }
        if (args.hasOwnProperty("has-role")){
            console.log("----has-role");
            //roles.concat(args["has-role"]);
            for (role of args["has-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            console.log("----missing-role");
            //roles.concat(args["missing-role"]);
            for (role of args["missing-role"])
                roles.push(role);
        }
        for (role of roles){
            if ( !server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                console.log("--invalid role ::  "+role);
                msg.reply("Invalid role -> "+role);
                return;
            }
        }

        var list;
        var has_role = null;
        if (args.hasOwnProperty("has-role")){ //use list of first has-role
            if(Object.keys(args['has-role']).length > 0){
                var role = server.roles.cache.find(role => role.name.toLowerCase() === args['has-role'][0].toLowerCase());
                list = role.members.values();
                has_role = args['has-role'].slice(1); //skip the first
            }
            else{  //use entire server member list
                list = server.members.cache.values();
                has_role = args['has-role'];
            }
        }
        else //use entire server member list
            list = server.members.cache.values();

        for (member of list){
            var skip = false;
            if (has_role){
                for (role of has_role){ //check if member doesn't have role, if so skiptrue and break
                    if ( !member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: doesn't have role) "+role);
                        break;
                    }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: has role) "+role);
                }
                if (skip) continue;
            }
            if(args.hasOwnProperty("missing-role")){
                for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                    if ( member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: has role) "+role);
                        break;
                    }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: doesn't have role) "+role);
                }
                if (skip) continue;
            }
            //give role(s)
            for (role of args["give-role"]){
                var role_to_add = server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                member.roles.add(role_to_add.id)
                .then(m_id => console.log("----successfully added role ["+role_to_add.name+":"+role_to_add.id+"] to member ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    console.log("----failed to add role ["+role_to_add.name+":"+role_to_add.id+"] to member ["+m_id+"] due to error");
                    console.log(err);
                });
            }
        }
    },





    removeRoles: function(client, msg, content){
        //{"give-role": ['roleName', ...] <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("give-role")){
            //roles.concat(args["give-role"]);
            for (role of args["give-role"])
                roles.push(role);
        } else {
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct. 'give-role' is necessary.  It should be of the following form: \n"+
                "`{\"give-role\": ['roleName', ...] <,  \"has-role\": ['roleName', ...]> <,  \"missing-role\": ['roleName', ...]>  }`");
            return;
        }
        if (args.hasOwnProperty("has-role")){
            console.log("----has-role");
            //roles.concat(args["has-role"]);
            for (role of args["has-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            console.log("----missing-role");
            //roles.concat(args["missing-role"]);
            for (role of args["missing-role"])
                roles.push(role);
        }
        for (role of roles){
            if ( !server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                console.log("--invalid role ::  "+role);
                msg.reply("Invalid role -> "+role);
                return;
            }
        }

        var list;
        var has_role = null;
        if (args.hasOwnProperty("has-role")){ //use list of first has-role
            if(Object.keys(args['has-role']).length > 0){
                var role = server.roles.cache.find(role => role.name.toLowerCase() === args['has-role'][0].toLowerCase());
                list = role.members.values();
                has_role = args['has-role'].slice(1); //skip the first
            }
            else{  //use entire server member list
                list = server.members.cache.values();
                has_role = args['has-role'];
            }
        }
        else //use entire server member list
            list = server.members.cache.values();

        for (member of list){
            var skip = false;
            if (has_role){
                for (role of has_role){ //check if member doesn't have role, if so skiptrue and break
                    if ( !member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: doesn't have role) "+role);
                        break;
                    }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: has role) "+role);
                }
                if (skip) continue;
            }
            if(args.hasOwnProperty("missing-role")){
                for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                    if ( member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: has role) "+role);
                        break;
                    }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: doesn't have role) "+role);
                }
                if (skip) continue;
            }
            //give role(s)
            for (role of args["give-role"]){
                var role_to_remove = server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                member.roles.remove(role_to_remove.id)
                .then(m_id => console.log("----successfully removed role ["+role_to_remove.name+":"+role_to_remove.id+"] from member ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    console.log("----failed to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from member ["+m_id+"] due to error");
                    console.log(err);
                });
            }
        }
    }

}
