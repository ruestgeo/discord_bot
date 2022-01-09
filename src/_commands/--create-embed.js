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
const Discord = require('discord.js');


module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "--create-embed  ->  embed_JSON"+
            ".     *create an embed with properties defined by in a JSON object\n*"+
            ".     *following this format:  https://discord.com/developers/docs/resources/channel#embed-object*",




    func: async function (globals, msg, args){ 
        //let server = await msg.guild.fetch();

        try{
            args = JSON.parse(args);
        }
        catch (err){ throw (err); }
        utils.botLogs(globals, "--creating embed with properties: "+JSON.stringify(args, null, "    "));
        let embed = new Discord.MessageEmbed(args);
        await msg.channel.send(embed).catch(err => {utils.botLogs(globals, "----ERROR: "+err)});
    }   
}






