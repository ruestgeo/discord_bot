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
    version: 2.1,
    auth_level: 3,



    manual: "--list-members-conditioned  ->  {<\"mention\": true/false>  <,  \"has_role\": [role_Names/IDs , ...]>  <, \"lacks_role\": [role_Names/IDs , ...]>  <, \"has_one\": [role_Names/IDs , ...]>  <, \"lacks_one\": [role_Names/IDs , ...]>}"+
            ".     *reply with an ordered list of members that have specified roles as well as lack specified roles*\n"+
            ".     *can specify whether to mention or not (default no mention) and if the member has all of the roles in the group or has just one, and similarly for lacks role(s)*\n"+
            ".     *NOTE: role names cannot contain commas, otherwise this command will not function properly*",




    func: async function (globals, msg, args){ 
        let configs = globals.configs;
       
        let server_roles = await msg.guild.roles.fetch();
        let members = await msg.guild.members.fetch();
        let list = [...members.values()];
        let members_count;

        let criteria;
        try {
            criteria = JSON.parse(args);
        }
        catch (err){
            throw (err);
        }

        //obtain hasRoles
        let hasRoles = [];
        if ( criteria.hasOwnProperty("has_role") ){
            utils.botLogs(globals,"--obtaining has_role roles");
            let roles = criteria["has_role"];
            if ( !Array.isArray(roles) )   throw ("Invalid JSON property: has_role must be an array");
            hasRoles = roles.map(elem => elem.trim())
            .map( elem => { try { return utils.resolveRole(globals, elem, server_roles, true, "--"); }  catch (err) { throw (err); }});
        }

        //obtain lacksRoles
        let lacksRoles = [];
        if ( criteria.hasOwnProperty("lacks_role") ){
            utils.botLogs(globals,"--obtaining lacks_role roles");
            let roles = criteria["lacks_role"];
            if ( !Array.isArray(roles) )   throw ("Invalid JSON property: lacks_role must be an array");
            lacksRoles = roles.map(elem => elem.trim())
            .map( elem => { try { return utils.resolveRole(globals, elem, server_roles, true, "--"); }  catch (err) { throw (err); }});
        }

        //obtain hasOneRoles
        let hasOneRoles = [];
        if ( criteria.hasOwnProperty("has_one") ){
            utils.botLogs(globals,"--obtaining has_one roles");
            let roles = criteria["has_one"];
            if ( !Array.isArray(roles) )   throw ("Invalid JSON property: has_one must be an array");
            hasOneRoles = roles.map(elem => elem.trim())
            .map( elem => { try { return utils.resolveRole(globals, elem, server_roles, true, "--"); }  catch (err) { throw (err); }});
        }

        //obtain lacksOneRoles
        let lacksOneRoles = [];
        if ( criteria.hasOwnProperty("lacks_one") ){
            utils.botLogs(globals,"--obtaining lacks_one roles");
            let roles = criteria["lacks_one"];
            if ( !Array.isArray(roles) )   throw ("Invalid JSON property: lacks_one must be an array");
            lacksOneRoles = roles.map(elem => elem.trim())
            .map( elem => { try { return utils.resolveRole(globals, elem, server_roles, true, "--"); }  catch (err) { throw (err); }});
        }


        //filter list of server members
        utils.botLogs(globals,"--filtering member list");
        list = list.filter(member => {
            for (let role of hasRoles){
                if ( !role.members.has(member.id) ){
                    return false;
                }
            }
            for (let role of lacksRoles){
                if ( role.members.has(member.id) ){
                    return false;
                }
            }
            if ( hasOneRoles.length > 0 && !hasOneRoles.some(role => role.members.has(member.id)) ) 
                return false;
            if ( lacksOneRoles.length > 0 && !lacksOneRoles.some(role => !role.members.has(member.id)) ) 
                return false;
            return true;
        });
        members_count = list.length;
        
        
        utils.botLogs(globals,"--found "+members_count+" members\n--prepairing to send list through message(s)");

        
        let all = "";
        if (criteria.hasOwnProperty("mention") && criteria.mention === true){
            list.forEach(member => {
                all += "<@"+member.id+"> "+member.displayName+"#"+member.user.discriminator+"\n";
            });
        }
        else
            list.forEach(member => {
                all += member.displayName+"#"+member.user.discriminator+"\n";
            });

        try {
            await utils.message(msg, all, false);
        }
        catch (err){ throw (err); }


        return ("found "+members_count+" members that"+ 
            (criteria.hasOwnProperty("has_role") ? "\n  has the roles  [`"+hasRoles.map(role => role.name).join(",  ")+"`]" : "") +
            (criteria.hasOwnProperty("has_one") ? "\n  has at least one of these roles  [`"+hasOneRoles.map(role => role.name).join(",  ")+"`]" : "") +
            (criteria.hasOwnProperty("lacks_role") ? "\n  lacks the roles  [`"+lacksRoles.map(role => role.name).join(",  ")+"`]" : "") +
            (criteria.hasOwnProperty("lacks_one") ? "\n  lacks at least one of these roles  [`"+lacksOneRoles.map(role => role.name).join(",  ")+"`]" : "") );

    }   

}






