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

const utils = require('./utils.js');

module.exports = {
    giveRoles: async function(client, msg, content){
        //{"give-role": ['roleName', ...] <, "target": "roleName"> <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }
        console.log("--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("give-role")){
            //roles.concat(args["give-role"]);
            for (role of args["give-role"])
                roles.push(role);
        } else {
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            console.log("----incorrect request body");
            return;
        }
        if (args.hasOwnProperty("has-role")){
            //console.log("----has-role");
            //roles.concat(args["has-role"]);
            for (role of args["has-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            //console.log("----missing-role");
            //roles.concat(args["missing-role"]);
            for (role of args["missing-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            console.log("----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        console.log("--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                console.log("----invalid role ::  "+role);
                msg.reply("Invalid role -> "+role);
                return;
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            console.log("--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name.toLowerCase() === args["target"].toLowerCase()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            console.log("--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }

        console.log("--searching member list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            var skip = false;
            if (args.hasOwnProperty("has-role")){
                for (role of args['has-role']){ //check if member doesn't have role, if so skiptrue and break
                    if ( !member.roles.cache.has(server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("user ["+member.displayName+":"+member.id+"] -- skip (A: doesn't have role) "+role);
                        break;
                    }//else console.log("user ["+member.displayName+":"+member.id+"] -- skip (A: has role) "+role);
                }
                if (skip) continue;
            }
            if(args.hasOwnProperty("missing-role")){
                for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                    if ( member.roles.cache.has(server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("user ["+member.displayName+":"+member.id+"] -- skip (B: has role) "+role);
                        break;
                    }//else console.log("user ["+member.displayName+":"+member.id+"] -- skip (B: doesn't have role) "+role);
                }
                if (skip) continue;
            }
            //give role(s)
            for (role of args["give-role"]){
                var role_to_add = server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                if (member.roles.cache.has(role_to_add.id)){ 
                    console.log("----user ["+member.displayName+":"+member.id+"] already has role ["+role_to_add.name+":"+role_to_add.id+"]"); 
                    continue; 
                }
                await member.roles.add(role_to_add.id)
                .then(m_id => console.log("----successfully added role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    console.log("----failed to add role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+m_id+"] due to error");
                    console.log(err);
                });
            }
        }
        console.log("----request complete");
        msg.reply("request complete");
    },





    removeRoles: async function(client, msg, content){
        //{"remove-role": ['roleName', ...] <, "target": "roleName"> <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }
        console.log("--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("remove-role")){
            //roles.concat(args["remove-role"]);
            for (role of args["remove-role"])
                roles.push(role);
        } else {
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            console.log("----incorrect request body");
            return;
        }
        if (args.hasOwnProperty("has-role")){
            //console.log("----has-role");
            //roles.concat(args["has-role"]);
            for (role of args["has-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            //console.log("----missing-role");
            //roles.concat(args["missing-role"]);
            for (role of args["missing-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            console.log("----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        console.log("--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                console.log("----invalid role ::  "+role);
                msg.reply("Invalid role -> "+role);
                return;
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            console.log("--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name.toLowerCase() === args["target"].toLowerCase()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            console.log("--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }

        console.log("--searching member list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            var skip = false;
            if (args.hasOwnProperty("has-role")){
                for (role of args['has-role']){ //check if member doesn't have role, if so skiptrue and break
                    if ( !member.roles.cache.has(server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("user ["+member.displayName+":"+member.id+"] -- skip (A: doesn't have role) "+role);
                        break;
                    }//else console.log("user ["+member.displayName+":"+member.id+"] -- skip (A: has role) "+role);
                }
                if (skip) continue;
            }
            if(args.hasOwnProperty("missing-role")){
                for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                    if ( member.roles.cache.has(server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                        skip = true;
                        //console.log("user ["+member.displayName+":"+member.id+"] -- skip (B: has role) "+role);
                        break;
                    }//else console.log("user ["+member.displayName+":"+member.id+"] -- skip (B: doesn't have role) "+role);
                }
                if (skip) continue;
            }
            //remove role(s)
            for (role of args["remove-role"]){
                var role_to_remove = server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                if (!member.roles.cache.has(role_to_remove.id)){ 
                    console.log("----user ["+member.displayName+":"+member.id+"] already missing role ["+role_to_remove.name+":"+role_to_remove.id+"]"); 
                    continue; 
                }
                await member.roles.remove(role_to_remove.id)
                .then(m_id => console.log("----successfully removed role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    console.log("----failed to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+m_id+"] due to error");
                    console.log(err);
                });
            }
        }
        console.log("----request complete");
        msg.reply("request complete");
    },






    giveRoles_v2: async function(client, msg, content){
        //{"give-role": ['roleName', ...] <, "target": "roleName"> <,  "missing-role": [[rolegroup1, ...], ['rolegroup2', ...] ...]>  }
        console.log("--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("give-role")){
            //roles.concat(args["give-role"]);
            for (role of args["give-role"])
                roles.push(role);
        } else {
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            console.log("----incorrect request body");
            return;
        }

        if (args.hasOwnProperty("has-role")){
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct. 'has-role' is not currently supported for this command");
            console.log("----incorrect request body");
            return;
        }
        if (args.hasOwnProperty("missing-role")){
            //console.log("----missing-role");
            //roles.concat(args["missing-role"]);
            for (rolegroup of args["missing-role"])
                for (role of rolegroup)
                    roles.push(role);
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            console.log("----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        console.log("--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                console.log("----invalid role ::  "+role);
                msg.reply("Invalid role -> "+role);
                return;
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            console.log("--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name.toLowerCase() === args["target"].toLowerCase()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            console.log("--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }
        

        console.log("--searching user list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            if(args.hasOwnProperty("missing-role")){
                for (rolegroup of args["missing-role"]){
                    var noSkip = false;
                    for (role of rolegroup){ //check if member is missing at least one of this role group
                        var has = member.roles.cache.has(server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id );
                        //console.log("has "+has+" noSkip "+noSkip+" || "+(noSkip || (!has)));
                        noSkip = noSkip || (!has); //if any is true then noSkip is true, if all false then noSkip is false
                        //if ( has ) console.log("user ["+member.displayName+":"+member.id+"] -- skip (C: has role) "+role);
                        //else console.log("user ["+member.displayName+":"+member.id+"] -- skip (C: doesn't have role) "+role);
                    }
                    //console.log("group ["+rolegroup+"] skip? "+(!noSkip));
                    if (!noSkip) break;
                }
                //console.log("skip? "+(!noSkip));
                if (!noSkip) continue;
            }
            //give role(s)
            for (role of args["give-role"]){
                var role_to_add = server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                if (member.roles.cache.has(role_to_add.id)){ 
                    console.log("----user ["+member.displayName+":"+member.id+"] already has role ["+role_to_add.name+":"+role_to_add.id+"]"); 
                    continue; 
                }
                await member.roles.add(role_to_add.id)
                .then(m_id => console.log("----successfully added role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    console.log("----failed to add role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+m_id+"] due to error");
                    console.log(err);
                });
            }
        }
        console.log("----request complete");
        msg.reply("request complete");
    },





    removeRoles_v2: async function(client, msg, content){
        //{"remove-role": ['roleName', ...] <, "target": "roleName"> <,  "has-role": [[rolegroup1, ...], ['rolegroup2', ...] ...]>  }
        console.log("--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("remove-role")){
            //roles.concat(args["remove-role"]);
            for (role of args["remove-role"])
                roles.push(role);
        } else {
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            console.log("----incorrect request body");
            return;
        }
        if (args.hasOwnProperty("has-role")){
            //console.log("----has-role");
            //roles.concat(args["has-role"]);
            for (rolegroup of args["has-role"])
                for (role of rolegroup)
                    roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct. 'missing-role' is not currently supported for this command");
            console.log("----incorrect request body");
            return;
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            console.log("----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        console.log("--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                console.log("----invalid role ::  "+role);
                msg.reply("Invalid role -> "+role);
                return;
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            console.log("--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name.toLowerCase() === args["target"].toLowerCase()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            console.log("--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }

        console.log("--searching user list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            if(args.hasOwnProperty("has-role")){
                for (rolegroup of args["has-role"]){
                    var noSkip = false;
                    for (role of rolegroup){ //check if member has at least one of this role group
                        var has = member.roles.cache.has(server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id );
                        //console.log("has "+has+" noSkip "+noSkip+" || "+(noSkip || has));
                        noSkip = noSkip || has; //if any is true then noSkip is true, if all false then noSkip is false
                        //if ( has ) console.log("user ["+member.displayName+":"+member.id+"] -- skip (D: has role) "+role);
                        //else console.log("user ["+member.displayName+":"+member.id+"] -- skip (D: doesn't have role) "+role);
                    }
                    //console.log("group ["+rolegroup+"] skip? "+(!noSkip));
                    if (!noSkip) break;
                }
                //console.log("skip? "+(!noSkip));
                if (!noSkip) continue;
            }
            //remove role(s)
            for (role of args["remove-role"]){
                var role_to_remove = server_roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                if (!member.roles.cache.has(role_to_remove.id)){ 
                    console.log("----user ["+member.displayName+":"+member.id+"] already missing role ["+role_to_remove.name+":"+role_to_remove.id+"]"); 
                    continue; 
                }
                await member.roles.remove(role_to_remove.id)
                .then(m_id => console.log("----successfully removed role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    console.log("----failed to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+m_id+"] due to error");
                    console.log(err);
                });
            }
        }
        console.log("----request complete");
        msg.reply("request complete");
    }


    //giveRoles_v3: async function(client, msg, content){},
        //give role if missing at least all of one group
    //removeRoles_v3: async function(client, msg, content){}
        //remove role if has at least all of one group
}
