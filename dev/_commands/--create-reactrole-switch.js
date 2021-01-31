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
const reactroles_utils = require(process.cwd()+'/_utils/reactroles_utils');



module.exports = {
    version: 1.1, //dev
    auth_level: 3,



    manual: "**--create-reactrole-switch**  ->  `{\"message\": \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }` \n" +
            ".     *Create a post with reactions that will assign roles like a radio button (switching logic).*\n"+
            ".     *Only one reaction at a time, reacting to any others in this group will result in removal of the existing role and reaction then adding the new role (react on B removes role A and react on A, then gives role B)* \n" +
            ".     *If an emote is used as a command key more than once then only the last one will apply.*\n"+
            "*--create-reactrole-switch*  ->  `{\"reactions\": {\"emote\": \"roleName\" ,  ...} } \\n '`message_to_post`'` \n" +
            ".     *Similar to above, but the message is given after a newline (shift+ENTER) to allow for use of multiple line messages*",



    func: async function (globals, msg, content){
        //{"message": "*the post text*" ,  "reactions": {"emote": "roleName" ,  ...} }
        //{ "reactions": {"emote": "roleName" ,  ...} } --+o+--MessageText--+o+-- <message>
        var client = globals.client;
        var reactroles = globals["reactroles"];
        var args;
        var text_body;
        if(content.includes("\n")){
            var idx = content.indexOf("\n");
            args = JSON.parse(content.substring(0,idx));
            if (!args.hasOwnProperty('reactions')){
                throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
            }
            text_body = content.substring(idx+1).trim();
        }
        else{
            args = JSON.parse(content);
            if (!args.hasOwnProperty('message') || !args.hasOwnProperty('reactions')){
                throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
            }
            text_body = args.message;
        }
        var emotes = Object.keys(args.reactions);
        for (var emote of emotes){
            if (emote.includes(" ")){
                throw ("Invalid reaction key:  \""+emote+"\" contains an empty space");
            }
        }

        //check if roles and emotes exist
        for (var _emote of emotes){
            var emote_info = utils.get_emote_id(_emote.trim());
            var emote = emote_info.emote.trim();
            if (  (emote_info.type === "custom") && 
                    !( msg.guild.emojis.resolve(emote) 
                     || client.emojis.resolve(emote) )  ) {
                utils.botLogs(globals, "--invalid emote ::  "+_emote);
                throw ("Invalid emote -> "+_emote);
            }
            var _role = args.reactions[_emote];
            var server_roles = await msg.guild.roles.fetch();
            if ( !server_roles.cache.find(role => role.name === _role.trim()) ){
                utils.botLogs(globals, "--invalid role ::  "+_role);
                throw ("Invalid role -> "+_role);
            }
        }

        utils.botLogs(globals, "--setting up bot message");
        msg.channel.send(text_body)
        .then(async function (bot_message) {
            var bot_message_id = bot_message.id;
            var channel_id = bot_message.channel.id;
            var server_id = bot_message.guild.id;
            if ( !reactroles.hasOwnProperty(server_id) ){
                reactroles[server_id] = {};
                reactroles[server_id][channel_id] = {};
            }
            else if ( !reactroles[server_id].hasOwnProperty(channel_id) )
                reactroles[server_id][channel_id] = {};
            reactroles[server_id][channel_id][bot_message_id] = {};
            utils.botLogs(globals, "----message posted with id ["+bot_message_id+"] in channel ["+channel_id+"] in server ["+server_id+"]");
            var current_post = reactroles[server_id][channel_id][bot_message_id];
            current_post['type'] = "switch"; //
            current_post['emotes'] = {};
            utils.botLogs(globals, "--setting up reactions");
            for (var raw_emote of emotes){
                utils.botLogs(globals, '--set up reaction on bot message: '+raw_emote); 
                var emote_info = utils.get_emote_id(raw_emote.trim());
                var emote = emote_info.emote.trim();
                var emote_type = emote_info.type;
                switch (emote_type){
                    case "unicode":
                        utils.botLogs(globals, "----unicode emote");
                        break;
                    case "custom":
                        utils.botLogs(globals, "----custom emote");
                        break;
                }
                current_post['emotes'][emote] = args.reactions[raw_emote].trim();
                await bot_message.react(emote); 
                utils.botLogs(globals, "----complete");
            };

            utils.botLogs(globals, "--creating reaction collector");
            //if filter returns true then check event, otherwise ignore
            const filter = (reaction, user) => {
                return ((user.id !== client.user.id)
                    && ( Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.name) 
                        || Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.id) ));
            };
            const collector = bot_message.createReactionCollector(filter,{dispose: true});

            /* reaction is added */
            collector.on('collect', (reaction, user) => {
                const collect_func = async (reaction, user) => {
                    var server = reaction.message.guild;
                    var channel = reaction.message.channel;
                    utils.botLogs(globals, "__[rr-e]__  collected an added reaction\n____[rr-e]____  user ["+user.username+":"+user.id+"]\n____[rr-e]____  reacted with ["+reaction.emoji.name+":"+reaction.emoji.id+"]\n____[rr-e]____  on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                    if (reaction.emoji.id) //not null -> custom
                        var react_emote = reaction.emoji.id;
                    else //null -> unicode
                        var react_emote = reaction.emoji.name;
                    var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                    utils.botLogs(globals, "__[rr-e]__  role to assign: "+role_to_assign+"\n__[rr-e]__  resolving server role");

                    var server_roles = await server.roles.fetch();
                    var role = server_roles.cache.find(role => role.name === role_to_assign.trim());
                    if (role){
                        utils.botLogs(globals, "____[rr-e]____  found: "+role.name+":"+role.id+"\n__[rr-e]__  resolving server member");
                        var member = server.members.resolve(user.id); 
                        if (member){
                            utils.botLogs(globals, "____[rr-e]____  found: "+member.displayName+":"+member.id+"\n__[rr-e]__  removing existing reactions in react group");

                            var current_group = reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes'];
                            var reactrole_group = Object.keys(current_group);
                            var message_reactions = reaction.message.reactions.cache;
                            var msg_reacts = message_reactions.values(); //array/iterable of MessageReaction
                            var hadReact = false;
                            for (var msg_react of msg_reacts){
                                if ( msg_react.users.resolve(user.id) ){ //member has this reaction on this message
                                    if ( ( reactrole_group.includes(msg_react.emoji.name) || reactrole_group.includes(msg_react.emoji.id) ) //react is in reactrole group
                                        && !( (msg_react.emoji.id === react_emote) || (msg_react.emoji.name === react_emote) ) //react isn't the newly added reaction                            
                                    ){
                                        hadReact = true;
                                        msg_react.users.remove(user.id) //removing triggers the reaction 'remove' event and deals with the role removal
                                        .then(m_id => {
                                            utils.botLogs(globals, "____[rr-e]____  removed user ["+user.id+"] from react ["+msg_react.emoji.name+":"+msg_react.emoji.id+"]");
                                            //apply the role after handling the deletion in 'remove' event to prevent race conditions
                                        })
                                        .catch(err => {
                                            utils.botLogs(globals, "____[rr-e]____  failed to remove user ["+user.id+"] from react ["+msg_react.emoji.name+":"+msg_react.emoji.id+"]\n"+err);
                                        });
                                    }
                                }
                                else  utils.botLogs(globals, "____[rr-e]____  user ["+server.members.resolve(user.id).displayName+":"+user.id+"] didnt have reaction on ["+msg_react.emoji.name+":"+msg_react.emoji.id+"]");
                            }

                            if (!hadReact){
                                utils.botLogs(globals, "__[rr-e]__  giving role ["+role.name+":"+role.id+"] to member");
                                member.roles.add(role.id)
                                .then(m_id => {
                                    utils.botLogs(globals, "____[rr-e]____  successfully added ["+role.name+":"+role.id+"] role to member ["+m_id+"]");
                                })
                                .catch(err => {
                                    utils.botLogs(globals, "____[rr-e]____  failed to add role ["+role.name+":"+role.id+"] due to error\n"+err);
                                });
                            }
                        }
                        else utils.botLogs(globals, "____[rr-e]____  member ["+user.id+"] not found");
                    } 
                    else utils.botLogs(globals, "____[rr-e]____  role ["+role_to_assign+"] not found");
                }
                collect_func(reaction, user);
            });
            
            /* reaction is removed */
            collector.on('remove', (reaction, user) => { //remove event is not being fired on emoji removal
                const remove_func = async (reaction, user) => {
                    var server = reaction.message.guild;
                    var channel = reaction.message.channel;
                    utils.botLogs(globals, "__[rr-e]__  collected a removed reaction\n____[rr-e]____  user ["+user.username+":"+user.id+"]\n____[rr-e]____  removed reaction ["+reaction.emoji.name+":"+reaction.emoji.id+"]\n____[rr-e]____  on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                    if (reaction.emoji.id) //not null -> custom
                        var react_emote = reaction.emoji.id;
                    else //null -> unicode
                        var react_emote = reaction.emoji.name;
                    var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                    utils.botLogs(globals, "__[rr-e]__  role to remove: "+role_to_assign+"\n__[rr-e]__  resolving server role");

                    var server_roles = await server.roles.fetch();
                    var role = server_roles.cache.find(role => role.name === role_to_assign.trim()); //.resolve()
                    if (role){
                        utils.botLogs(globals, "____[rr-e]____  role found: "+role.name+":"+role.id+"\n__[rr-e]__  resolving server member");
                        var member = server.members.resolve(user.id); //.roles.add
                        if (member){
                            utils.botLogs(globals, "____[rr-e]____  member found: "+member.displayName+":"+member.id+"\n__[rr-e]__  removing role ["+role.name+":"+role.id+"] from member");

                            member.roles.remove(role.id)
                            .then(m_id => {
                                utils.botLogs(globals, "____[rr-e]____  successfully removed role ["+role.name+":"+role.id+"] from member ["+m_id+"]");
                            })
                            .catch(err => {
                                utils.botLogs(globals, "____[rr-e]____  failed to remove role ["+role.name+":"+role.id+"] due to error\n")+err;
                            });

                            //give or restore role
                            utils.botLogs(globals, "__[rr-e]__  removing existing reactions in react group");
                            var current_group = reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes'];
                            var reactrole_group = Object.keys(current_group);
                            var message = await reaction.message.fetch();
                            var message_reactions = message.reactions.cache;
                            var msg_reacts = message_reactions.values(); //array/iterable of MessageReaction
                            for (var msg_react of msg_reacts){
                                if ( msg_react.users.resolve(user.id)  //member has this reaction on this message
                                    && ( reactrole_group.includes(msg_react.emoji.name) 
                                        || reactrole_group.includes(msg_react.emoji.id) ) //react is in reactrole group
                                ){
                                    var restored_role_name = current_group[ reactrole_group.includes(msg_react.emoji.name) ? msg_react.emoji.name : msg_react.emoji.id ]; 
                                    var restored_role = server_roles.cache.find(role => role.name === restored_role_name.trim());;
                                    utils.botLogs(globals, "__[rr-e]__  giving role ["+restored_role.name+":"+restored_role.id+"] to member from switched react");
                                    member.roles.add(restored_role.id)
                                    .then(m_id => {
                                        utils.botLogs(globals, "____[rr-e]____  successfully added role ["+restored_role.name+":"+restored_role.id+"] to member ["+m_id+"]");
                                    })
                                    .catch(err => {
                                        utils.botLogs(globals, "____[rr-e]____  failed to add role ["+restored_role.name+":"+restored_role.id+"] due to error\n"+err);
                                    });
                                    break;
                                }
                            }
                        }
                        else utils.botLogs(globals, "____[rr-e]____  member ["+user.id+"] not found");
                    } 
                    else utils.botLogs(globals, "____[rr-e]____  role ["+role_to_assign+"] not found");
                }
                remove_func(reaction, user);
            });
            
            utils.botLogs(globals, "----complete");
        });
    }

    
}
