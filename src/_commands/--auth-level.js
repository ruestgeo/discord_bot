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
    version: 2.0,
    auth_level: 2,



    manual: "--auth-level  ->  ( \\*none\\* **/** *commandName* **/** *userID* **/** *@member* ) "+
            "~~**•** >~~  *if \\*none\\* is given then it reply with your highest authorization level*\n"+
            "~~**•** >~~  *if \\*commandName\\* is given then reply with the authorization level required for that command*\n"+
            "~~**•** >~~  *if \\*userID\\* or @user is given then it reply with that users highest authorization level*",




/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} args   @returns {String|void} */
    func: async function (globals, msg, args){ 
        let configs = globals.configs;
        if ( args === "" ){
            let member =  await msg.member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
            let authorizedRole = null; 
            let auth = await utils.getMemberAuthorizationLevel(configs,member,msg.guild.id); 
            let authSource = auth[0];
            let memberAuthLevel = auth[1];
            if (authSource !== "universal" && !authSource.startsWith("server"))
                authorizedRole = member.roles.cache.get(authSource);

            if ( !authorizedRole ){ //user Authorized
                return "Authorization level ["+memberAuthLevel+"] through user authorization";
            }
            else { //role Authorized
                return "Authorization level ["+memberAuthLevel+"] through role authorization or the role ["+authorizedRole.name+":"+authorizedRole.id+"]";
            }
        }


        let resolved = (args.startsWith("<@") && args.endsWith(">")) ? msg.guild.members.resolve(args.substring(2, args.length-1)) : msg.guild.members.resolve(args);
        if ( resolved ){
            let member = resolved;
            let memberAuthLevel = 0;
            let authorizedRole = null;
            if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
                memberAuthLevel = configs.authorization.authorizedUsers[member.id];
            }
            for ( let roleID in configs.authorization.authorizedRoles ){
                let roleAuthLevel = configs.authorization.authorizedRoles[roleID];
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
        

        else if ( utils.hasCommand(args) ){
            return ("Command ["+args+"] has an authorization level of ["+utils.getCommandAuthLevel(args)+"]");
        }
        else { return ("command or user_ID ["+args+"] doesn't exist"); }
        
    }   
}






