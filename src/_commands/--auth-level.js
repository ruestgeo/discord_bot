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
    auth_level: 2,



    manual: "--auth-level  ->  \\*none\\* ~~  or  ~~ \\*commandName\\* ~~  or  ~~ \\*userID\\* ~~  or  ~~ @user"+
            ".     *if \\*none\\* is given then it reply with your highest authorization level*\n"+
            ".     *if \\*commandName\\* is given then reply with the authorization level required for that command*\n"+
            ".     *if \\*userID\\* or @user is given then it reply with that users highest authorization level*",




    func: async function (globals, msg, args){ 
        var configs = globals.configs;
        if ( args === "" ){
            var member =  await msg.member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
            var memberAuthLevel = 0;
            var authorizedRole = null;
            if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
                memberAuthLevel = configs.authorization.authorizedUsers[member.id];
            }
            for ( var roleID in configs.authorization.authorizedRoles ){
                var roleAuthLevel = configs.authorization.authorizedRoles[roleID];
                if ( member.roles.cache.has(roleID) && (roleAuthLevel > memberAuthLevel) ){
                    memberAuthLevel = roleAuthLevel;
                    authorizedRole = member.roles.cache.get(roleID);
                }                
            }
            if ( !authorizedRole ){ //user Authorized
                return "Authorization level ["+memberAuthLevel+"] through user authorization";
            }
            else { //role Authorized
                return "Authorization level ["+memberAuthLevel+"] through role authorization or the role ["+authorizedRole.name+":"+authorizedRole.id+"]";
            }
        }


        var resolved = (args.startsWith("<@") && args.endsWith(">")) ? msg.guild.members.resolve(args.substring(2, args.length-1)) : msg.guild.members.resolve(args);
        if ( resolved ){
            var member = resolved;
            var memberAuthLevel = 0;
            var authorizedRole = null;
            if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
                memberAuthLevel = configs.authorization.authorizedUsers[member.id];
            }
            for ( var roleID in configs.authorization.authorizedRoles ){
                var roleAuthLevel = configs.authorization.authorizedRoles[roleID];
                if ( member.roles.cache.has(roleID) && (roleAuthLevel > memberAuthLevel) ){
                    memberAuthLevel = roleAuthLevel;
                    authorizedRole = member.roles.cache.get(roleID);
                }                
            }
            if ( !authorizedRole ){ //user Authorized
                return "Authorization level ["+memberAuthLevel+"] through user authorization";
            }
            else { //role Authorized
                return "Authorization level ["+memberAuthLevel+"] through role authorization or the role ["+authorizedRole.name+":"+authorizedRole.id+"]";
            }
        }
        
        else if ( globals.nonblocking_built_in_funcs.includes(args) ){
            return ("Command ["+args+"] has an authorization level of [0]");
        }
        else if ( globals.blocking_built_in_funcs.includes(args) ){
            return ("Command ["+args+"] has an authorization level of ["+globals.configs.built_in_AuthLevels[args]+"]");
        }
        else if ( globals.modularCommands.hasOwnProperty(args) ){
            return ("Command ["+args+"] has an authorization level of ["+globals.modularCommands[args].auth_level+"]");
        }
        else { return ("command or user_ID ["+args+"] doesn't exist"); }
        
    }   
}






