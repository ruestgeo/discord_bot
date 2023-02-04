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
    version: 3.0,
    auth_level: 4,



    manual: "**--remove-role-conditioned**  ->  {\"`remove-role`\": [\"*roleResolvable*\", ...] <, \"`target`\": \"*roleResolvable*\"> <,  \"`has-role`\": [\"*roleResolvable*\", ...]> <,  \"`missing-role`\": [\"*roleResolvable*\", ...]> <,  \"`has-one-from-each-group`\": [[\"*group1_roleResolvable*\", ...], [\"*group2_roleResolvable*\", ...], ...]> <,  \"`has-all-from-one-group`\": [[\"*group1_roleResolvable*\", ...], [\"*group2_roleResolvable*\", ...], ...]> <,  \"`missing-one-from-each-group`\": [[\"*group1_roleResolvable*\", ...], [\"*group2_roleResolvable*\", ...], ...]> <,  \"`missing-all-from-one-group`\": [[\"*group1_roleResolvable*\", ...], [\"*group2_roleResolvable*\", ...], ...]>  } \n" +
            "~~**•** >~~  *Remove role(s) from a user in the server if they have or doesn't have some role.  If a target role is given then it will only look at the list of users who have that role.  Must give at least one \"remove-role\", but \"has-role\", \"missing-role\", \"has-one-from-each-group\", \"has-all-from-one-group\", \"missing-one-from-each-group\" and \"missing-all-from-one-group\" are optional. Give a target-role for better performance.*",
            
    

/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){


        utils.botLogs(globals,  "--parsing request");
        const args = JSON.parse(content);
        
        let server = await msg.guild.fetch();
        let server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying and resolving roles");
        
        if (args.hasOwnProperty("remove-role")){
            args["remove-role"] = args["remove-role"].map(resolvable => {
                resolvable = resolvable.trim();
                let role = utils.resolveRole(globals,resolvable,server_roles,true);
                return role.id;
            });
        } else {
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        if (args.hasOwnProperty("has-role")){    
            args["has-role"] = args["has-role"].map(resolvable => {
                resolvable = resolvable.trim();
                let role = utils.resolveRole(globals,resolvable,server_roles,true);
                return role.id;
            });
        }
        if (args.hasOwnProperty("missing-role")){
            args["missing-role"] = args["missing-role"].map(resolvable => {
                resolvable = resolvable.trim();
                let role = utils.resolveRole(globals,resolvable,server_roles,true);
                return role.id;
            });
        }
        if (args.hasOwnProperty("has-one-from-each-group")){
            args["has-one-from-each-group"] = args["has-one-from-each-group"].map(rolegroup => 
                rolegroup.map(resolvable => {
                    resolvable = resolvable.trim();
                    let role = utils.resolveRole(globals,resolvable,server_roles,true);
                    return role.id;
                })
            );
        }
        if (args.hasOwnProperty("has-all-from-one-group")){
            args["has-all-from-one-group"] = args["has-all-from-one-group"].map(rolegroup => 
                rolegroup.map(resolvable => {
                    resolvable = resolvable.trim();
                    let role = utils.resolveRole(globals,resolvable,server_roles,true);
                    return role.id;
                })
            );
        }
        if (args.hasOwnProperty("missing-one-from-each-group")){
            args["missing-one-from-each-group"] = args["missing-one-from-each-group"].map(rolegroup => 
                rolegroup.map(resolvable => {
                    resolvable = resolvable.trim();
                    let role = utils.resolveRole(globals,resolvable,server_roles,true);
                    return role.id;
                })
            );
        }
        if (args.hasOwnProperty("missing-all-from-one-group")){
            args["missing-all-from-one-group"] = args["missing-all-from-one-group"].map(rolegroup => 
                rolegroup.map(resolvable => {
                    resolvable = resolvable.trim();
                    let role = utils.resolveRole(globals,resolvable,server_roles,true);
                    return role.id;
                })
            );
        }

        let list;
        if (args.hasOwnProperty("target")){ //use target role as list
            utils.botLogs(globals,  "--using ["+args["target"]+"] role users list");
            let resolvable = args["target"].trim();
            let role = utils.resolveRole(globals,resolvable,server_roles,true);
            args.target = role.id;
            list = role.members.values();
        }
        else{  //use entire server users as list
            utils.botLogs(globals,  "--using server users list");
            let server_members = await server.members.fetch();
            list = server_members.values();
        }

        

        let count = 0;
        let count_total = 0;
        utils.botLogs(globals,  "--searching user list for candidates");
        for (let _member of list){
            let member = await _member.fetch();
            utils.botLogs(globals,  "  ["+member.displayName+":"+member.id+"] processing");
            let skip = false;
            if (args.hasOwnProperty("has-role")){
                for (let role of args['has-role']){ //check if member doesn't have role, if so skiptrue and break
                    if ( !member.roles.cache.has( role ) ){
                        skip = true;
                        break;
                    }
                }
                if (skip) {
                    utils.botLogs(globals,  "  -- has-role not satisfied");
                    continue;
                }
            }
            if(args.hasOwnProperty("missing-role")){
                for (let role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                    if ( member.roles.cache.has( role ) ){
                        skip = true;
                        break;
                    }
                }
                if (skip) {
                    utils.botLogs(globals,  "  -- missing-role not satisfied");
                    continue;
                }
            }
            if(args.hasOwnProperty("has-one-from-each-group")){
                let skip = false;
                for (let rolegroup of args["has-one-from-each-group"]){
                    let hasOne = false;
                    for (let role of rolegroup){ //check if member has at least one of this role group
                        let has = member.roles.cache.has( role );
                        hasOne = hasOne || has; //if any is true then hasOne is true, if all false then hasOne is false
                    }
                    if (!hasOne) { //missing all, therefore cannot satisfy having at least one role from each rolegroup
                        skip = true;
                        break;
                    }
                }
                if (skip) {
                    utils.botLogs(globals,  "  -- has-one-from-each-group not satisfied");
                    continue;
                }
            }
            if(args.hasOwnProperty("has-all-from-one-group")){
                let skip = true;
                for (let rolegroup of args["has-all-from-one-group"]){
                    let hasRoleGroup = true;
                    for (let role of rolegroup){ //check if member has at least all of one role group
                        let has = member.roles.cache.has( role );
                        hasRoleGroup = hasRoleGroup && has; //true if all roles in rolegroup are satisfied
                    }
                    if (hasRoleGroup) { //has all of rolegroup, condition satisfied
                        skip = false;
                        break;
                    }
                }
                if (skip) {
                    utils.botLogs(globals,  "  -- has-all-from-one-group not satisfied");
                    continue;
                }
            }
            if(args.hasOwnProperty("missing-one-from-each-group")){
                let skip = false;
                for (let rolegroup of args["missing-one-from-each-group"]){
                    let missingOne = false;
                    for (let role of rolegroup){ //check if member is missing at least one of this role group
                        let has = member.roles.cache.has( role );
                        missingOne = missingOne || (!has); //if any is true then missingOne is true, if all false then missingOne is false
                    }
                    if (!missingOne) { //has all, therefore cannot satisfy missing at least one role from each rolegroup
                        skip = true;
                        break;
                    }
                }
                if (skip) {
                    utils.botLogs(globals,  "  -- missing-one-from-each-group not satisfied");
                    continue;
                }
            }
            if(args.hasOwnProperty("missing-all-from-one-group")){
                let skip = true;
                for (let rolegroup of args["missing-all-from-one-group"]){
                    let missingRoleGroup = true;
                    for (let role of rolegroup){ //check if member missing all of at least one role group
                        let has = member.roles.cache.has( role );
                        missingRoleGroup = missingRoleGroup && !has; //true if all roles in rolegroup are missing
                    }
                    if (missingRoleGroup) { //missing all of rolegroup, condition satisfied
                        skip = false;
                        break;
                    }
                }
                if (skip) {
                    utils.botLogs(globals,  "  -- missing-all-from-one-group not satisfied");
                    continue;
                }
            }
            
            //remove role(s)
            count_total++;
            for (let role of args["remove-role"]){
                let role_to_remove = server.roles.resolve(role);
                if (!member.roles.cache.has(role_to_remove.id)){ 

                    utils.botLogs(globals,  "----user ["+member.displayName+":"+member.id+"] already missing role ["+role_to_remove.name+":"+role_to_remove.id+"]"); 
                    continue; 
                }
                await member.roles.remove(role_to_remove.id)
                .then(m_id => {
                    count++;
                    utils.botLogs(globals,  "----successfully removed role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+server.members.resolve(m_id).displayName+":"+m_id+"] ")
                })
                .catch(err => {
                    utils.botLogs(globals,  "----failed to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+m_id+"] due to error");
                    utils.botLogs(globals,  err.stack);
                });
            }
        }
        utils.botLogs(globals,  "----request complete");
        return "request complete; A total of "+count+" roles were removed among "+count_total+" qualifying members";
    }

    
}

