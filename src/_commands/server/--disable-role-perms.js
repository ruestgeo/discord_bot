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
    auth_level: 9,



    manual: "--disable-role-perms  ->  *roleID* <, ...>"+
            "~~**•** >~~  *disable all permissions of the roles provided*",




/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} args   @returns {String|void} */
    func: async function (globals, msg, args){ 
        let server = await msg.guild.fetch();
        let server_roles = await server.roles.fetch();

        utils.botLogs(globals,"--resolving role IDs");
        let targets = args.split(",").map(elem => elem.trim())
        .map(id => {
            let role = server.roles.resolve(id);
            if ( !role )   throw ("Invalid role id ::  role with id ["+id+"] not found");
            utils.botLogs(globals,"----resolved ["+role.name+"] role via id: "+id);
            return role;
        });


        utils.botLogs(globals, "--resetting all permissions to 0 (disabled)");
        for (let role of targets){
            try{
                await role.setPermissions(0, "disabling permissions as requested via bot command");
            }
            catch (err){
                utils.botLogs(globals,"--ERROR when disabling permissions for role ["+role.name+":"+role.id+"]\n" + err);
                continue;
            }
            utils.botLogs(globals,"----disabled perms for ["+role.name+"]  id:"+role.id);
            await msg.channel.send("disabled perms for role `<@&"+role.id+">` ["+role.name+"]");
        }
        return "Request complete";
    }   
}






