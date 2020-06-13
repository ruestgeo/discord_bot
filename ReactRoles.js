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

const utils = require('./utils.js');

module.exports = {
    reactRoles_Any: async function (client, msg, content, reactroles){
        //{"message": "*the post text*" ,  "reactions": {"emote": "roleName" ,  ...} }
        //{ "reactions": {"emote": "roleName" ,  ...} } --+o+--MessageText--+o+-- <message>
        var args;
        var text_body;
        if(content.includes("--+o+--MessageText--+o+--")){
            var idx = content.indexOf("--+o+--MessageText--+o+--");
            args = JSON.parse(content.substring(0,idx));
            if (!args.hasOwnProperty('reactions')){
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
                return;
            }
            var text_body = content.substring(idx+"--+o+--MessageText--+o+--".length).trim();
        }
        else{
            args = JSON.parse(content);
            if (!args.hasOwnProperty('message') || !args.hasOwnProperty('reactions')){
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
                return;
            }
            var text_body = args.message;
        }
        
        var emotes = Object.keys(args.reactions);

        //check if roles and emotes exist
        for (_emote of emotes){
            var emote_info = utils.get_emote_id(_emote);
            var emote = emote_info.emote.trim();
            if (  (emote_info.type === "custom") && 
                    !( msg.guild.emojis.resolve(emote)  //.cache.find(emoji => ((emoji.name === emote) || (emoji.id === emote)))
                     || client.emojis.resolve(emote) )  ) {
                utils.botLogs(globals, "--invalid emote ::  "+_emote);
                msg.reply("Invalid emote -> "+_emote);
                return;
            }
            var _role = args.reactions[_emote];
            var server_roles = await msg.guild.roles.fetch();
            if ( !server_roles.cache.find(role => role.name.toLowerCase() === _role.toLowerCase()) ){
                utils.botLogs(globals, "--invalid role ::  "+_role);
                msg.reply("Invalid role -> "+_role);
                return;
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
            current_post['type'] = "any"; //
            current_post['emotes'] = {};
            utils.botLogs(globals, "--setting up reactions");
            for (var raw_emote of emotes){
                utils.botLogs(globals, '--set up reaction on bot message: '+raw_emote); 
                var emote_info = utils.get_emote_id(raw_emote);
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
                //console.log("user react: "+(user.id !== client.user.id));
                //console.log(Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']));
                //console.log(Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.name));
                //console.log(Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.id));
                return ((user.id !== client.user.id)
                    && ( Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.name) 
                        || Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.id) ));
            };
            const collector = bot_message.createReactionCollector(filter,{dispose: true});
            //current_post['collector'] = collector; //currently not needed

            /* reaction is added */
            collector.on('collect', (reaction, user) => {
                const collect_func = async (reaction, user) => {
                    var server = reaction.message.guild;
                    var channel = reaction.message.channel;
                    utils.botLogs(globals, "__[reactRoleEvent]__collected an added reaction\n____user ["+user.username+":"+user.id+"]\n____reacted with ["+reaction.emoji.name+":"+reaction.emoji.id+"]\n____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                    if (reaction.emoji.id) //not null -> custom
                        var react_emote = reaction.emoji.id;
                    else //null -> unicode
                        var react_emote = reaction.emoji.name;
                    var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                    utils.botLogs(globals, "__[reactRoleEvent]__role to assign: "+role_to_assign+"\n__resolving server role");

                    var server_roles = await server.roles.fetch();
                    var role = server_roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                    if (role){
                        utils.botLogs(globals, "____[reactRoleEvent]____found: "+role.name+":"+role.id+"\n__[reactRoleEvent]__resolving server member");
                        var member = server.members.resolve(user.id); //.roles.add
                        if (member){
                            utils.botLogs(globals, "____[reactRoleEvent]____found: "+member.displayName+":"+member.id+"\n__[reactRoleEvent]__giving role to member");
                            member.roles.add(role.id)
                            .then(m_id => utils.botLogs(globals, "____[reactRoleEvent]____successfully added role to member ["+m_id+"]"))
                            .catch(err => {
                                utils.botLogs(globals, "____[reactRoleEvent]____failed to add role due to error\n"+err);
                            });
                        }
                        else utils.botLogs(globals, "____[reactRoleEvent]____member not found");
                    }
                    else utils.botLogs(globals, "____[reactRoleEvent]____role not found");
                }
                collect_func(reaction, user);
            });
            
            /* reaction is removed */
            collector.on('remove', (reaction, user) => { //remove event is not being fired on emoji removal
                const remove_func = async (reaction, user) => {
                    var server = reaction.message.guild;
                    var channel = reaction.message.channel;
                    utils.botLogs(globals, "__[reactRoleEvent]__collected a removed reaction\n____user ["+user.username+":"+user.id+"]\n____removed reaction ["+reaction.emoji.name+":"+reaction.emoji.id+"]\n____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                    if (reaction.emoji.id) //not null -> custom
                        var react_emote = reaction.emoji.id;
                    else //null -> unicode
                        var react_emote = reaction.emoji.name;
                    var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                    utils.botLogs(globals, "__[reactRoleEvent]__role to remove: "+role_to_assign+"\n__resolving server role");

                    var server_roles = await server.roles.fetch();
                    var role = server_roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                    if (role){
                        utils.botLogs(globals, "____[reactRoleEvent]____role found: "+role.name+":"+role.id+"\n__resolving server member");
                        var member = server.members.resolve(user.id); //.roles.add
                        if (member){
                            utils.botLogs(globals, "____[reactRoleEvent]____member found: "+member.displayName+":"+member.id+"\n__removing role to member");
                            member.roles.remove(role.id)
                            .then(m_id => utils.botLogs(globals, "____[reactRoleEvent]____successfully removed role from member ["+m_id+"]"))
                            .catch(err => {
                                utils.botLogs(globals, "____[reactRoleEvent]____failed to remove role due to error\n"+err);
                            });
                        }
                        else utils.botLogs(globals, "____[reactRoleEvent]____member not found");
                    } 
                    else utils.botLogs(globals, "____[reactRoleEvent]____role not found");
                }
                remove_func(reaction, user);
            });
            
            utils.botLogs(globals, "----complete");
            //console.log(reactroles);
        });
    },






    reactRoles_Switch: async function (client, msg, content, reactroles){
        //{"message": "*the post text*" ,  "reactions": {"emote": "roleName" ,  ...} }
        //{ "reactions": {"emote": "roleName" ,  ...} } --+o+--MessageText--+o+-- <message>
        var args;
        var text_body;
        if(content.includes("--+o+--MessageText--+o+--")){
            var idx = content.indexOf("--+o+--MessageText--+o+--");
            args = JSON.parse(content.substring(0,idx));
            if (!args.hasOwnProperty('reactions')){
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
                return;
            }
            var text_body = content.substring(idx+"--+o+--MessageText--+o+--".length).trim();
        }
        else{
            args = JSON.parse(content);
            if (!args.hasOwnProperty('message') || !args.hasOwnProperty('reactions')){
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
                return;
            }
            var text_body = args.message;
        }
        
        var emotes = Object.keys(args.reactions);

        //check if roles and emotes exist
        for (_emote of emotes){
            var emote_info = utils.get_emote_id(_emote);
            var emote = emote_info.emote.trim();
            if (  (emote_info.type === "custom") && 
                    !( msg.guild.emojis.resolve(emote)  //.cache.find(emoji => ((emoji.name === emote) || (emoji.id === emote)))
                     || client.emojis.resolve(emote) )  ) {
                utils.botLogs(globals, "--invalid emote ::  "+_emote);
                msg.reply("Invalid emote -> "+_emote);
                return;
            }
            var _role = args.reactions[_emote];
            var server_roles = await msg.guild.roles.fetch();
            if ( !server_roles.cache.find(role => role.name.toLowerCase() === _role.toLowerCase()) ){
                utils.botLogs(globals, "--invalid role ::  "+_role);
                msg.reply("Invalid role -> "+_role);
                return;
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
                var emote_info = utils.get_emote_id(raw_emote);
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
                    utils.botLogs(globals, "__[reactRoleEvent]__collected an added reaction\n__user ["+user.username+":"+user.id+"]\n____reacted with ["+reaction.emoji.name+":"+reaction.emoji.id+"]\n____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                    if (reaction.emoji.id) //not null -> custom
                        var react_emote = reaction.emoji.id;
                    else //null -> unicode
                        var react_emote = reaction.emoji.name;
                    var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                    utils.botLogs(globals, "__[reactRoleEvent]__role to assign: "+role_to_assign+"\n__[reactRoleEvent]__resolving server role");

                    var server_roles = await server.roles.fetch();
                    var role = server_roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                    if (role){
                        utils.botLogs(globals, "____[reactRoleEvent]____found: "+role.name+":"+role.id+"\n__resolving server member");
                        var member = server.members.resolve(user.id); //.roles.add
                        if (member){
                            utils.botLogs(globals, "____[reactRoleEvent]____found: "+member.displayName+":"+member.id+"\n__removing existing reactions in react group");

                            var current_group = reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes'];
                            var reactrole_group = Object.keys(current_group);
                            var message_reactions = reaction.message.reactions.cache;
                            var msg_reacts = message_reactions.values(); //array/iterable of MessageReaction
                            var hadReact = false;
                            for (var msg_react of msg_reacts){
                                //console.log(msg_react.emoji.name+":"+msg_react.emoji.id);
                                //console.log(msg_react.users.cache.mapValues(_user => server.members.resolve(_user.id).displayName+":"+_user.id));
                                //console.log("new: "+role_to_assign+"    cur: "+current_group[ reactrole_group.includes(msg_react.emoji.id) ? msg_react.emoji.id : msg_react.emoji.name ]);
                                if ( msg_react.users.resolve(user.id) ){ //member has this reaction on this message
                                    if ( ( reactrole_group.includes(msg_react.emoji.name) || reactrole_group.includes(msg_react.emoji.id) ) //react is in reactrole group
                                        && !( (msg_react.emoji.id === react_emote) || (msg_react.emoji.name === react_emote) ) //react isn't the newly added reaction                            
                                    ){
                                        hadReact = true;
                                        msg_react.users.remove(user.id) //removing triggers the reaction 'remove' event and deals with the role removal
                                        .then(m_id => {
                                            utils.botLogs(globals, "____[reactRoleEvent]____removed user ["+user.id+"] from react ["+msg_react.emoji.name+":"+msg_react.emoji.id+"]");
                                            //apply the role after handling the deletion in 'remove' event to prevent race conditions
                                        })
                                        .catch(err => {
                                            utils.botLogs(globals, "____[reactRoleEvent]____failed to remove user ["+user.id+"] from react ["+msg_react.emoji.name+":"+msg_react.emoji.id+"]\n"+err);
                                        });
                                    }
                                }
                                else  utils.botLogs(globals, "____[reactRoleEvent]____user ["+server.members.resolve(user.id).displayName+":"+user.id+"] didnt have reaction on ["+msg_react.emoji.name+":"+msg_react.emoji.id+"]");
                            }

                            if (!hadReact){
                                utils.botLogs(globals, "__[reactRoleEvent]__giving role ["+role.name+":"+role.id+"] to member");
                                member.roles.add(role.id)
                                .then(m_id => {
                                    utils.botLogs(globals, "____[reactRoleEvent]____successfully added ["+role.name+":"+role.id+"] role to member ["+m_id+"]");
                                })
                                .catch(err => {
                                    utils.botLogs(globals, "____[reactRoleEvent]____failed to add role ["+role.name+":"+role.id+"] due to error\n"+err);
                                });
                            }
                        }
                        else utils.botLogs(globals, "____[reactRoleEvent]____member not found");
                    } 
                    else utils.botLogs(globals, "____[reactRoleEvent]____role not found");
                }
                collect_func(reaction, user);
            });
            
            /* reaction is removed */
            collector.on('remove', (reaction, user) => { //remove event is not being fired on emoji removal
                const remove_func = async (reaction, user) => {
                    var server = reaction.message.guild;
                    var channel = reaction.message.channel;
                    utils.botLogs(globals, "__[reactRoleEvent]__collected a removed reaction\n__user ["+user.username+":"+user.id+"]\n____removed reaction ["+reaction.emoji.name+":"+reaction.emoji.id+"]\n____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                    if (reaction.emoji.id) //not null -> custom
                        var react_emote = reaction.emoji.id;
                    else //null -> unicode
                        var react_emote = reaction.emoji.name;
                    var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                    utils.botLogs(globals, "__[reactRoleEvent]__role to remove: "+role_to_assign+"\n__resolving server role");

                    var server_roles = await server.roles.fetch();
                    var role = server_roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                    if (role){
                        utils.botLogs(globals, "____[reactRoleEvent]____role found: "+role.name+":"+role.id+"\n__resolving server member");
                        var member = server.members.resolve(user.id); //.roles.add
                        if (member){
                            utils.botLogs(globals, " ____[reactRoleEvent]____member found: "+member.displayName+":"+member.id+"\n__removing role ["+role.name+":"+role.id+"] from member");

                            member.roles.remove(role.id)
                            .then(m_id => {
                                utils.botLogs(globals, " ____[reactRoleEvent]____successfully removed role ["+role.name+":"+role.id+"] from member ["+m_id+"]");
                            })
                            .catch(err => {
                                utils.botLogs(globals, " ____[reactRoleEvent]____failed to remove role ["+role.name+":"+role.id+"] due to error\n")+err;
                            });

                            //give or restore role
                            utils.botLogs(globals, "__[reactRoleEvent]__removing existing reactions in react group");
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
                                    //console.log(reactrole_group);
                                    //console.log("includes " +  (reactrole_group.includes(msg_react.emoji.name) ? "name": "id"));
                                    var restored_role_name = current_group[ reactrole_group.includes(msg_react.emoji.name) ? msg_react.emoji.name : msg_react.emoji.id ]; 
                                    //console.log(restored_role_name);
                                    var restored_role = server_roles.cache.find(role => role.name.toLowerCase() === restored_role_name.toLowerCase());;
                                    utils.botLogs(globals, "__[reactRoleEvent]__giving role ["+restored_role.name+":"+restored_role.id+"] to member from switched react");
                                    member.roles.add(restored_role.id)
                                    .then(m_id => {
                                        utils.botLogs(globals, " ____[reactRoleEvent]____successfully added role ["+restored_role.name+":"+restored_role.id+"] to member ["+m_id+"]");
                                    })
                                    .catch(err => {
                                        utils.botLogs(globals, " ____[reactRoleEvent]____failed to add role ["+restored_role.name+":"+restored_role.id+"] due to error\n"+err);
                                    });
                                    break;
                                }
                            }
                        }
                        else utils.botLogs(globals, " ____[reactRoleEvent]____member not found");
                    } 
                    else utils.botLogs(globals, " ____[reactRoleEvent]____role not found");
                }
                remove_func(reaction, user);
            });
            
            utils.botLogs(globals, " ____[reactRoleEvent]____complete");
            //console.log(reactroles);
        });
    }
}
