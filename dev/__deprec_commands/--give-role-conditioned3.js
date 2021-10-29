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



    manual: "**--give-role-conditioned3**  ->  `{\"give-role\": [\"role_Name/ID\", ...] <, \"target\": \"role_Name/ID\"> <,  \"missing-role\": [[\"group1role\", ...], [\"group2role\", ...], ...]> }` \n" +
            ".     *Give role(s) to a user in the server if the member is missing all roles of at least* ***one*** *role-group from 'missing-role'.  If a target role is given then it will only look at the list of users who have that role.*",



    func: async function (globals, msg, content){
        //{"give-role": ['role_Name/ID', ...] <, "target": "role_Name/ID"> <,  "missing-role": [[rolegroup1, ...], ['rolegroup2', ...] ...]>  }


        utils.botLogs(globals,  "--parsing request");
        const args = JSON.parse(content);

        let server = await msg.guild.fetch();
        let server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying and resolving roles");
        
        if (args.hasOwnProperty("has-role")){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct. 'has-role' is not currently supported for this command");
        }
        if (args.hasOwnProperty("give-role")){
            args["give-role"] = args["give-role"].map(resolvable => {
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
        if (args.hasOwnProperty("missing-role")){
            args["missing-role"] = args["missing-role"].map(rolegroup => 
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
            if(args.hasOwnProperty("missing-role")){
                let skip = true;
                for (let rolegroup of args["missing-role"]){
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
                if (skip) continue;
            }
            
            //give role(s)
            count_total++;
            for (let role of args["give-role"]){
                let role_to_add = server_roles.resolve(role);
                if (member.roles.cache.has(role_to_add.id)){ 
                    utils.botLogs(globals,  "----user ["+member.displayName+":"+member.id+"] already has role ["+role_to_add.name+":"+role_to_add.id+"]"); 
                    continue; 
                }
                await member.roles.add(role_to_add.id)
                .then(m_id => {
                    count++; 
                    utils.botLogs(globals,  "----successfully added role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+server.members.resolve(m_id).displayName+":"+m_id+"] ")
                })
                .catch(err => {
                    utils.botLogs(globals,  "----failed to add role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+m_id+"] due to error");
                    utils.botLogs(globals,  err.stack);
                });
            }
        }
        utils.botLogs(globals,  "----request complete");
        return "request complete; A total of "+count+" roles were assigned among "+count_total+" qualifying members";
    }

    
}
