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
    version: 0.000,
    auth_level: 9,



    manual: "a temporary command",



    func: async function (globals, msg, content){ 
        let client = globals.client;

        //let server = await msg.guild.fetch();
        let embed_JSON = {
            "title": "test", 
            "description": "testing 🇨 :ookG: <:ookG:697998261893464156> ✅ :white_check_mark:", 
             "color": 3119775 ,
            "footer":{"text": "testing 🇨 :ookG: <:ookG:697998261893464156> ✅ :white_check_mark:"}
            }
        let embed = new Discord.MessageEmbed(embed_JSON);
        await msg.channel.send({content: "test ✅ :white_check_mark:", embed: embed}).catch(err => {throw(err)});
        await msg.react(":ookG:697998261893464156");
        
        return "Request complete";
    }

    
}






