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
    version: 1.1,
    auth_level: 4,



    manual: "**--remove-role-conditioned3**  ->  `{\"remove-role\": [\"role_Name/ID\", ...] <, \"target\": \"role_Name/ID\"> <,  \"has-role\": [[\"group1role\", ...], [\"group2role\", ...], ...]> }` \n" +
    ".     *Remove role(s) from a user if the member has all roles from at least* ***one*** *role-group from 'has-role'.  If a target role is given then it will only look at the list of users who have that role.*",



    func: async function (globals, msg, content){
        //{"remove-role": ['role_Name/ID', ...] <, "target": "role_Name/ID"> <,  "has-role": [[rolegroup1, ...], ['rolegroup2', ...] ...]>  }


        utils.botLogs(globals,  "--parsing request");
        const args = JSON.parse(content);

        let server = await msg.guild.fetch();
        let server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying and resolving roles");

        if (args.hasOwnProperty("missing-role")){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct. 'missing-role' is not currently supported for this command");
        }
        if (args.hasOwnProperty("remove-role")){
            args["remove-role"] = args["remove-role"].map(resolvable => {
                resolvable = resolvable.trim();
                let role;
                role = server_roles.resolve(resolvable);
                if (!role) role = server_roles.cache.find(_role => _role.name === resolvable);
                if (!role) {
                    utils.botLogs(globals,  "----invalid role ::  "+resolvable);
                    throw ("Invalid role -> "+resolvable);
                }
                return role.id;
            });
        } else {
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        if (args.hasOwnProperty("has-role")){    
            args["has-role"] = args["has-role"].map(rolegroup => 
                rolegroup.map(resolvable => {
                    resolvable = resolvable.trim();
                    let role;
                    role = server_roles.resolve(resolvable);
                    if (!role) role = server_roles.cache.find(_role => _role.name === resolvable);
                    if (!role) {
                        utils.botLogs(globals,  "----invalid role ::  "+resolvable);
                        throw ("Invalid role -> "+resolvable);
                    }
                    return role.id;
                })
            );
        }
        
        let list;
        if (args.hasOwnProperty("target")){ //use target role as list
            utils.botLogs(globals,  "--using ["+args["target"]+"] role users list");
            let role;
            let resolvable = args["target"].trim();
            role = server_roles.resolve(resolvable);
            if (!role) role = server_roles.cache.find(_role => _role.name === resolvable);
            if (!role) {
                utils.botLogs(globals,  "----invalid role ::  "+resolvable);
                throw ("Invalid role -> "+resolvable);
            }
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
            if(args.hasOwnProperty("has-role")){
                let skip = true;
                for (let rolegroup of args["has-role"]){
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
                if (skip) continue;
            }
            
            //remove role(s)
            count_total++;
            for (let role of args["remove-role"]){
                let role_to_remove = server_roles.resolve(role);
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
