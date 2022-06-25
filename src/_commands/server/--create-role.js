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



    manual: "--create-role  ->  *name_for_role* <, ...>"+
            "~~**•** >~~  *create roles by name provided that has all permissions disabled*",




/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} args   @returns {String|void} */
    func: async function (globals, msg, args){ 
        let server = await msg.guild.fetch();
        let server_roles = await server.roles.fetch();

        let targets = args.split(",").map(elem => elem.trim());
        utils.botLogs(globals, "--creating roles ["+targets+"]");

        for (let roleName of targets){
            let role;
            try{
                role = await server.roles.create({
                    name: roleName,
                    permissions: 0,
                    reason: 'created upon requested bot command',
                });
            }
            catch (err){
                utils.botLogs(globals,"--ERROR when creating role ["+roleName+"]\n" + err);
                continue;
            }
            utils.botLogs(globals,"--created role ["+roleName+"]  id:"+role.id);
            await msg.channel.send("created role <@&"+role.id+"> ["+roleName+"]");
        }
        return "Request complete";
    }   
}






