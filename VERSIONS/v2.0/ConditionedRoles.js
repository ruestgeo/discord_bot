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
    giveRoles: async function(globals, msg, content){
        //{"give-role": ['roleName', ...] <, "target": "roleName"> <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }


        utils.botLogs(globals,  "--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("give-role")){
            for (role of args["give-role"])
                roles.push(role);
        } else {
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        if (args.hasOwnProperty("has-role")){
            for (role of args["has-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            for (role of args["missing-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            utils.botLogs(globals,  "----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name === role.trim()) ){
                utils.botLogs(globals,  "----invalid role ::  "+role);
                throw ("Invalid role -> "+role);
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            utils.botLogs(globals,  "--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name === args["target"].trim()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            utils.botLogs(globals,  "--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }

        utils.botLogs(globals,  "--searching member list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            var skip = false;
            if (args.hasOwnProperty("has-role")){
                for (role of args['has-role']){ //check if member doesn't have role, if so skiptrue and break
                    if ( !member.roles.cache.has(server_roles.cache.find(_role => _role.name === role.trim()).id ) ){
                        skip = true;
                        break;
                    }
                }
                if (skip) continue;
            }
            if(args.hasOwnProperty("missing-role")){
                for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                    if ( member.roles.cache.has(server_roles.cache.find(_role => _role.name === role.trim()).id ) ){
                        skip = true;
                        break;
                    }
                }
                if (skip) continue;
            }
            //give role(s)
            for (role of args["give-role"]){
                var role_to_add = server_roles.cache.find(_role => _role.name === role.trim());
                if (member.roles.cache.has(role_to_add.id)){ 
                    utils.botLogs(globals,  "----user ["+member.displayName+":"+member.id+"] already has role ["+role_to_add.name+":"+role_to_add.id+"]"); 
                    continue; 
                }
                await member.roles.add(role_to_add.id)
                .then(m_id => utils.botLogs(globals,  "----successfully added role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    utils.botLogs(globals,  "----failed to add role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+m_id+"] due to error");
                    utils.botLogs(globals,  err.stack);
                });
            }
        }
        utils.botLogs(globals,  "----request complete");
        msg.reply("request complete");
    },





    removeRoles: async function(globals, msg, content){
        //{"remove-role": ['roleName', ...] <, "target": "roleName"> <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }


        utils.botLogs(globals,  "--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("remove-role")){
            for (role of args["remove-role"])
                roles.push(role);
        } else {
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        if (args.hasOwnProperty("has-role")){
            for (role of args["has-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            for (role of args["missing-role"])
                roles.push(role);
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            utils.botLogs(globals,  "----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name === role.trim()) ){
                utils.botLogs(globals,  "----invalid role ::  "+role);
                throw ("Invalid role -> "+role);
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            utils.botLogs(globals,  "--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name === args["target"].trim()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            utils.botLogs(globals,  "--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }

        utils.botLogs(globals,  "--searching member list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            var skip = false;
            if (args.hasOwnProperty("has-role")){
                for (role of args['has-role']){ //check if member doesn't have role, if so skiptrue and break
                    if ( !member.roles.cache.has(server_roles.cache.find(_role => _role.name === role.trim()).id ) ){
                        skip = true;
                        break;
                    }
                }
                if (skip) continue;
            }
            if(args.hasOwnProperty("missing-role")){
                for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                    if ( member.roles.cache.has(server_roles.cache.find(_role => _role.name === role.trim()).id ) ){
                        skip = true;
                        break;
                    }
                }
                if (skip) continue;
            }
            //remove role(s)
            for (role of args["remove-role"]){
                var role_to_remove = server_roles.cache.find(_role => _role.name === role.trim());
                if (!member.roles.cache.has(role_to_remove.id)){ 
                    utils.botLogs(globals,  "----user ["+member.displayName+":"+member.id+"] already missing role ["+role_to_remove.name+":"+role_to_remove.id+"]"); 
                    continue; 
                }
                await member.roles.remove(role_to_remove.id)
                .then(m_id => utils.botLogs(globals,  "----successfully removed role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    utils.botLogs(globals,  "----failed to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+m_id+"] due to error");
                    utils.botLogs(globals,  err.stack);
                });
            }
        }
        utils.botLogs(globals,  "----request complete");
        msg.reply("request complete");
    },






    giveRoles_v2: async function(globals, msg, content){
        //{"give-role": ['roleName', ...] <, "target": "roleName"> <,  "missing-role": [[rolegroup1, ...], ['rolegroup2', ...] ...]>  }


        utils.botLogs(globals,  "--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("give-role")){
            for (role of args["give-role"])
                roles.push(role);
        } else {
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }

        if (args.hasOwnProperty("has-role")){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct. 'has-role' is not currently supported for this command");
        }
        if (args.hasOwnProperty("missing-role")){
            for (rolegroup of args["missing-role"])
                for (role of rolegroup)
                    roles.push(role);
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            utils.botLogs(globals,  "----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name === role.trim()) ){
                utils.botLogs(globals,  "----invalid role ::  "+role);
                throw ("Invalid role -> "+role);
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            utils.botLogs(globals,  "--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name === args["target"].trim()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            utils.botLogs(globals,  "--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }
        

        utils.botLogs(globals,  "--searching user list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            if(args.hasOwnProperty("missing-role")){
                for (rolegroup of args["missing-role"]){
                    var noSkip = false;
                    for (role of rolegroup){ //check if member is missing at least one of this role group
                        var has = member.roles.cache.has(server_roles.cache.find(_role => _role.name === role.trim()).id );
                        noSkip = noSkip || (!has); //if any is true then noSkip is true, if all false then noSkip is false
                    }
                    if (!noSkip) break;
                }
                if (!noSkip) continue;
            }
            //give role(s)
            for (role of args["give-role"]){
                var role_to_add = server_roles.cache.find(_role => _role.name === role.trim());
                if (member.roles.cache.has(role_to_add.id)){ 
                    utils.botLogs(globals,  "----user ["+member.displayName+":"+member.id+"] already has role ["+role_to_add.name+":"+role_to_add.id+"]"); 
                    continue; 
                }
                await member.roles.add(role_to_add.id)
                .then(m_id => utils.botLogs(globals,  "----successfully added role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    utils.botLogs(globals,  "----failed to add role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+m_id+"] due to error");
                    utils.botLogs(globals,  err.stack);
                });
            }
        }
        utils.botLogs(globals,  "----request complete");
        msg.reply("request complete");
    },





    removeRoles_v2: async function(globals, msg, content){
        //{"remove-role": ['roleName', ...] <, "target": "roleName"> <,  "has-role": [[rolegroup1, ...], ['rolegroup2', ...] ...]>  }


        utils.botLogs(globals,  "--parsing request");
        const args = JSON.parse(content);

        var server = msg.guild;
        var roles = [];
        if (args.hasOwnProperty("remove-role")){
            for (role of args["remove-role"])
                roles.push(role);
        } else {
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        if (args.hasOwnProperty("has-role")){
            for (rolegroup of args["has-role"])
                for (role of rolegroup)
                    roles.push(role);
        }
        if (args.hasOwnProperty("missing-role")){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct. 'missing-role' is not currently supported for this command");
        }
        if (args.hasOwnProperty("target")){
            roles.push(args["target"]);
            utils.botLogs(globals,  "----target role specified: ["+args["target"]+"]");
        }
        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying all roles are valid");
        for (role of roles){
            if ( !server_roles.cache.find(_role => _role.name === role.trim()) ){
                utils.botLogs(globals,  "----invalid role ::  "+role);
                throw ("Invalid role -> "+role);
            }
        }

        var list;
        if (args.hasOwnProperty("target")){ //use target role as list
            utils.botLogs(globals,  "--using ["+args["target"]+"] role users list");
            list = server_roles.cache.find(_role => _role.name === args["target"].trim()).members.values(); //verified earlier
        }
        else{  //use entire server users as list
            utils.botLogs(globals,  "--using server users list");
            var server_members = await server.members.fetch();
            list = server_members.values();
        }

        utils.botLogs(globals,  "--searching user list for candidates");
        for (_member of list){
            var member = await _member.fetch();
            if(args.hasOwnProperty("has-role")){
                for (rolegroup of args["has-role"]){
                    var noSkip = false;
                    for (role of rolegroup){ //check if member has at least one of this role group
                        var has = member.roles.cache.has(server_roles.cache.find(_role => _role.name === role.trim()).id );
                        noSkip = noSkip || has; //if any is true then noSkip is true, if all false then noSkip is false
                    }
                    if (!noSkip) break;
                }
                if (!noSkip) continue;
            }
            //remove role(s)
            for (role of args["remove-role"]){
                var role_to_remove = server_roles.cache.find(_role => _role.name === role.trim());
                if (!member.roles.cache.has(role_to_remove.id)){ 
                    utils.botLogs(globals,  "----user ["+member.displayName+":"+member.id+"] already missing role ["+role_to_remove.name+":"+role_to_remove.id+"]"); 
                    continue; 
                }
                await member.roles.remove(role_to_remove.id)
                .then(m_id => utils.botLogs(globals,  "----successfully removed role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                .catch(err => {
                    utils.botLogs(globals,  "----failed to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+m_id+"] due to error");
                    utils.botLogs(globals,  err.stack);
                });
            }
        }
        utils.botLogs(globals,  "----request complete");
        msg.reply("request complete");
    }


    //giveRoles_v3: async function(globals, msg, content){},
        //give role if missing at least all of one group
    //removeRoles_v3: async function(globals, msg, content){}
        //remove role if has at least all of one group
}
