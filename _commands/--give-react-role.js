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






const utils = require('../utils.js'); //utils is located in the directory above, if needed




module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "**--give-react-role** -> message_link {emote: {<addRole: [\"roleName\", ...]>  <, removeRole: [\"roleName\", ...]> }, ...  }\n"
            +"-- function to add role(s) and/or remove role(s) from users who reacted with specified reactions on a message",



    func: async function (globals, msg, _args){ 
        // https://discordapp.com/channels/<server>/<channel>/<message>
        var client = globals.client;

        if (!_args.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        var target_msg = _args.substr(0, _args.indexOf(' ')).trim();
        var content = _args.substr(_args.indexOf(' ')+1).trim();
        utils.botLogs(globals,  "----target_msg:: "+target_msg+"\n----args:: "+content);
        var server = msg.guild;
        
        var args;
        try{
            args = JSON.parse(content);
        }
        catch (err){
            throw err;
        }

        //check args validity
        for (emote_key in args){
            var emote_args = args[emote_key];
            if (!emote_args.hasOwnProperty("addRole") && !emote_args.hasOwnProperty("removeRole")){
                throw ("Invalid request args:  neither a role to add nor a role to remove have been given\nargs ::   "+args);
            }
        }

        //check roles validity
        var roles = [];
        for (emote_key in args){
            var emote_args = args[emote_key];
            if (emote_args.hasOwnProperty("addRole"))
                roles.push(...emote_args["addRole"]);
            if (emote_args.hasOwnProperty("removeRole"))
                roles.push(...emote_args["removeRole"]);
        }
        //console.log(roles);
        var server_roles = await server.roles.fetch();
        for (role of roles){
            //validate
            if ( !server_roles.cache.find(_role => _role.name === role.trim()) ){ //trim
                utils.botLogs(globals,  "----invalid role ::  "+role);
                throw ("Invalid role -> "+role);
            }
        }
        

        var ids = target_msg.substring("https://discordapp.com/channels/".length).split("/");
        var server_id = ids[0];
        var channel_id = ids[1];
        var message_id = ids[2];
        var server = client.guilds.resolve(server_id);
        if( !server){
            utils.botLogs(globals,  "----server could not be resolved from id "+server_id);
            throw ("Server could not be resolved from id "+server_id);
        }
        var channel = server.channels.resolve(channel_id);
        if (!channel){
            utils.botLogs(globals,  "----channel could not be resolved from id "+channel_id);
            throw ("Channel could not be resolved from id "+channel_id);
        }
        await channel.messages.fetch(message_id)
        .then(async (message) => {
            if (message.deleted){
                utils.botLogs(globals,  "----message "+message.id+" DELETED");
                throw ("Message with id ["+message_id+"] had been deleted");
            } 
            else {
                /* //DEBUG
                console.log("args");
                for (emote_key in args){
                    console.log("    "+emote_key);
                }
                var msg_reacts = message.reactions.cache.values();
                console.log("msg_reacts");
                for (msg_react of msg_reacts){
                    var emote = msg_react.emoji.name+":"+msg_react.emoji.id;
                    console.log("    "+emote+"   ----   "+msg_react.emoji.identifier);
                }
                console.log("resolve args in msg");
                for (emote_key in args){
                    var resolved = message.reactions.resolve(emote_key.trim());
                    console.log("    "+emote_key+" :  "+(resolved ? "true" : "false")+"    resolved = "+resolved);
                }
                */


                //for each arg in args, check if arg in msg 
                for (emote_key in args){
                    if (!message.reactions.resolve(emote_key.trim())){
                        utils.botLogs(globals,  "----invalid emote ::  "+emote_key);
                        throw ("Invalid emote; no reaction using this emote -> "+emote_key);
                    }
                }


                //for each arg, apply role add/remove
                var date = utils.getDateTimeString(globals);
                utils.botLogs(globals,  "\nmessage ["+message.id+"] reactions   ("+date+")");
                for (emote_key in args){
                    utils.botLogs(globals,  "  "+emote_key);
                    var emote_args = args[emote_key];
                    var msg_react = message.reactions.resolve(emote_key.trim())
                    var _react_users = await msg_react.users.fetch();
                    var react_users = _react_users.values();
                    for (user of react_users){
                        var _member = message.guild.members.resolve(user.id);
                        if (!_member){ //member reacted but is no longer in the guild server
                            utils.botLogs(globals,  "    "+user.username+":"+user.id+" not found in guild ["+message.guild.name+":"+message.guild.id+"]");  
                            continue;
                        }
                        var member = await _member.fetch();
                        var display_name = member.displayName+"#"+user.discriminator;
                        utils.botLogs(globals,  "    "+display_name+":"+user.id);
                        
                        if (emote_args.hasOwnProperty("addRole")){
                            for (role of emote_args.addRole){
                                var role_to_add = server_roles.cache.find(_role => _role.name === role.trim());
                                if (member.roles.cache.has(role_to_add.id)){ 
                                    utils.botLogs(globals,  "        already has role ["+role_to_add.name+":"+role_to_add.id+"]");
                                    continue;
                                }
                                await member.roles.add(role_to_add.id)
                                .then(m_id => {
                                    utils.botLogs(globals,  "        given role ["+role_to_add.name+":"+role_to_add.id+"]");
                                })
                                .catch(err => {
                                    utils.botLogs(globals,  "        FAILED to give role ["+role_to_add.name+":"+role_to_add.id+"]");
                                    utils.botLogs(globals,  err.stack);
                                    msg.channel.send("An error occured and FAILED to give role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+display_name+":"+user.id+"]");
                                });
                            }
                        }
                        if (emote_args.hasOwnProperty("removeRole")){
                            for (role of emote_args.removeRole){
                                var role_to_remove = server_roles.cache.find(_role => _role.name === role.trim());
                                if (!member.roles.cache.has(role_to_remove.id)){ 
                                    utils.botLogs(globals,  "        already missing role ["+role_to_remove.name+":"+role_to_remove.id+"]");
                                    continue;
                                }
                                await member.roles.remove(role_to_remove.id)
                                .then(m_id => { 
                                    utils.botLogs(globals,  "        removed role ["+role_to_remove.name+":"+role_to_remove.id+"]");
                                    })
                                .catch(err => {
                                    utils.botLogs(globals,  "        FAILED to remove role ["+role_to_remove.name+":"+role_to_remove.id+"]");
                                    utils.botLogs(globals,  err.stack);
                                    msg.channel.send("An error occured and FAILED to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from user ["+display_name+":"+user.id+"]");
                                });
                            }
                        }
                    }                        
                }
                
                
                utils.botLogs(globals,  "----request complete");
                msg.reply("request complete");

            }
        })
        .catch(err => {
            utils.botLogs(globals,  err.stack);
            throw (err);
        });

    }

    
}






