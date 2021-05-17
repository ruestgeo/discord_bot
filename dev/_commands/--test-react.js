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
    version: 0.000,
    auth_level: 9,



    manual: "a temporary command",



    func: async function (globals, msg, content){ 
        let client = globals.client;

        //let server = await msg.guild.fetch();

        /*for (let count=0; count< 10; count++){
            let message = await msg.channel.send("testing");
        }
        return;*/



        let react_callbacks = {
            "<:rreee:836994781799383043>": {"callback": async _ => {
                console.log("rrrrrreeeeeeeeeeeeee");
            }}, 
            " 🍌": {"callback": async _ => {
                msg.reply("ook");
            }}
        }
        let isAuthorized = async function (globals, serverID, userID){ //'274559127030726656'
            let server = await globals.client.guilds.fetch(serverID);
            let member = await (server.member(userID)).fetch();
            if (!member) return false;
            return member.roles.cache.has('506231100520005648'); //'test' role
        }
        await utils.react_controller(globals, "tester X", msg.channel,"testing react controller", isAuthorized, react_callbacks);
        
        return "Request complete";
    }

    
}






