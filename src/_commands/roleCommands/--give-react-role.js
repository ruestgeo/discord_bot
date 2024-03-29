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
    version: 2.2,
    auth_level: 4,



    manual: "**--give-react-role** -> __*message_link*__ {`emote`: {<`addRole`: [\"*roleResolvable*\", ...]>  <, `removeRole`: [\"*roleResolvable*\", ...]> }, ...  }\n"
            +"~~**•** >~~  sequentially add role(s) and/or remove role(s) from users who reacted with specified reactions on a message",

/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} content   @returns {String|void} */
    func: async function (globals, msg, content){ 
        // https://discordapp.com/channels/<server>/<channel>/<message>  or  https://discord.com/channels/<server>/<channel>/<message>
        let client = globals.client;

        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        let target_msg = content.substring(0, content.indexOf(' ')).trim();
        content = content.substring(content.indexOf(' ')+1).trim();
        utils.botLogs(globals,  "----target_msg:: "+target_msg+"\n----args:: "+content);
        let server = msg.guild;
        
        let args;
        try{
            args = JSON.parse(content);
        }
        catch (err){
            throw err;
        }

        //check args validity
        for (let emote_key in args){
            let emote_args = args[emote_key];
            if (!emote_args.hasOwnProperty("addRole") && !emote_args.hasOwnProperty("removeRole")){
                throw ("Invalid request args:  neither a role to add nor a role to remove have been given\nargs ::   "+args);
            }
        }

        //check message validity (soft check)
        if ( !target_msg.startsWith("https://discordapp.com/channels/") && !target_msg.startsWith("https://discord.com/channels/")){
            utils.botLogs(globals,  "----invalid message link"+target_msg);
            if ( !target_msg.startsWith("https://discordapp.com/") && !target_msg.startsWith("https://discord.com/"))
                throw ("Invalid message link (not discord link):  ["+target_msg+"]");
            else
                throw ("Invalid message link (invalid discord link):  ["+target_msg+"]");
        }

        
        let server_roles = await server.roles.fetch();
        //fetch roles
        for (let emote_key in args){
            let emote_args = args[emote_key];
            if (emote_args.hasOwnProperty("addRole")){
                let addRoles = [];
                for (let roleResolvable of emote_args.addRole){
                    addRoles.push(utils.resolveRole(globals,roleResolvable,server_roles,true));
                }
                emote_args.addRole = addRoles;
            }
            if (emote_args.hasOwnProperty("removeRole")){
                let removeRoles = [];
                for (let roleResolvable of emote_args.removeRole){
                    removeRoles.push(utils.resolveRole(globals,roleResolvable,server_roles,true));
                }
                emote_args.removeRole = removeRoles;
            }
            //args[emote_key] = emote_args;
        }
        

        let ids = target_msg.startsWith("https://discordapp.com/channels/") ? target_msg.substring("https://discordapp.com/channels/".length).split("/") : target_msg.substring("https://discord.com/channels/".length).split("/");
        if (ids.length !== 3)  throw ("Invalid message link;  number of resolvable IDs is not 3 (found "+ids.length+")");
        let message = await utils.fetchMessage(globals, ids[0],ids[1],ids[2]).catch(err => {throw (err);});
        if (message.guild.id !== server.id){
            utils.botLogs(globals,  "----request not from same server as target message");
            throw ("Request not from same server as target message");
        }
 
        /* //DEBUG
        console.log("args");
        for (let emote_key in args){
            console.log("    "+emote_key);
        }
        let msg_reacts = message.reactions.cache.values();
        console.log("msg_reacts");
        for (let msg_react of msg_reacts){
            let emote = msg_react.emoji.name+":"+msg_react.emoji.id;
            console.log("    "+emote+"   ----   "+msg_react.emoji.identifier);
        }
        console.log("resolve args in msg");
        for (let emote_key in args){
            let resolved = message.reactions.resolve(emote_key.trim());
            console.log("    "+emote_key+" :  "+(resolved ? "true" : "false")+"    resolved = "+resolved);
        }
        */


        //for each arg in args, check if arg in msg 
        for (let emote in args){
            let emote_key = utils.resolveEmote_string(emote.trim());
            if ( !message.reactions.resolve(emote_key.emote) ){
                utils.botLogs(globals,  "----invalid emote ::  "+emote);
                throw ("Invalid emote; no reaction using this emote -> "+emote);
            }
        }


        //for each arg, apply role add/remove
        let count = {};
        let date = utils.getDateTimeString(globals);
        utils.botLogs(globals,  "\nmessage ["+message.id+"] reactions   ("+date+")");
        for (let emote in args){
            let emote_key = utils.resolveEmote_string(emote.trim());
            utils.botLogs(globals,  "  "+emote+"  ("+JSON.stringify(emote_key)+")");

            count[emote_key.string] = {'added': 0, 'removed': 0, 'members': 0}

            let emote_args = args[emote];
            let msg_react = message.reactions.resolve(emote_key.emote)
            let _react_users = await msg_react.users.fetch();
            let react_users = _react_users.values();
            for (let user of react_users){
                let _member = message.guild.members.resolve(user.id);
                if (!_member){ //member reacted but is no longer in the guild server
                    utils.botLogs(globals,  "    "+user.username+":"+user.id+" not found in guild ["+message.guild.name+":"+message.guild.id+"]");  
                    continue;
                }
                let member = await _member.fetch();
                let display_name = member.displayName+"#"+user.discriminator;
                utils.botLogs(globals,  "    "+display_name+":"+user.id);
                let wasAffected = false;
                
                if (emote_args.hasOwnProperty("addRole")){
                    for (let role of emote_args.addRole){
                        if (member.roles.cache.has(role.id)){ 
                            utils.botLogs(globals,  "        already has role ["+role.name+":"+role.id+"]");
                            continue;
                        }
                        await member.roles.add(role_to_add.id)
                        .then(_ => {
                            utils.botLogs(globals,  "        given role ["+role_to_add.name+":"+role_to_add.id+"]");
                            count[emote_key.string].added += 1;
                            wasAffected = true;
                        })
                        .catch(err => {
                            utils.botLogs(globals,  "        FAILED to give role ["+role_to_add.name+":"+role_to_add.id+"]");
                            utils.botLogs(globals,  err.stack);
                            msg.channel.send("An error occured and FAILED to give role ["+role_to_add.name+":"+role_to_add.id+"] to user ["+display_name+":"+user.id+"]");
                        });
                    }
                }
                if (emote_args.hasOwnProperty("removeRole")){
                    for (let role of emote_args.removeRole){
                        if (!member.roles.cache.has(role.id)){ 
                            utils.botLogs(globals,  "        already missing role ["+role.name+":"+role.id+"]");
                            continue;
                        }
                        await member.roles.remove(role.id)
                        .then(_ => { 
                            utils.botLogs(globals,  "        removed role ["+role.name+":"+role.id+"]");
                            count[emote_key.string].removed += 1;
                            wasAffected = true;
                        })
                        .catch(err => {
                            utils.botLogs(globals,  "        FAILED to remove role ["+role.name+":"+role.id+"]");
                            utils.botLogs(globals,  err.stack);
                            msg.channel.send("An error occured and FAILED to remove role ["+role.name+":"+role.id+"] from user ["+display_name+":"+user.id+"]");
                        });
                    }
                }
                if (wasAffected) count[emote_key.string].members += 1;
            }                        
        }

        let counted = "";
        for (let emoteString in count){
            counted += emoteString+
                "\n    members affected: "+count[emoteString].members+
                "\n    total added: "+count[emoteString].added+
                "\n    total removed: "+count[emoteString].removed+"\n";
        }
        
        msg.reply("request complete\n"+ counted);

    }

    
}






