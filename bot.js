/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code when asked if not already made public

--currently uses in-memory storage so the amount of reactroles that can be held is limited

--requires manage-roles permissions
*/



const Discord = require('discord.js');
const client = new Discord.Client();


const token = require('./auth.json').token;
const configs = require('./configs.json');
const prefix = configs.prefix;

var reactroles = {};
var bot_id = null;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    bot_id = client.user.id;
    console.log("  bot client id: "+bot_id);

    //test
    //console.log(client.emojis.resolveIdentifier("👍"));
});

client.on('message', msg => {
    //console.log(msg);
    
    if (msg.content === 'ping') {
        msg.reply('pong');
        msg.channel.send('i ponged, i big bot now!');
        console.log('\ni see ping, i send pong!');
    }
    
    //to get emotes either post "\:emote:" and copy the resulting unicode icon, or use bot through "..jijaebot :emote:" and copy the result from the bot logs
    else if (msg.content === '👍') {  //🤔   🍌
        //msg.channel.send(':thumbsup:');
        msg.react('👍');
        console.log('\n:thumbsup:');
    }
    else if (msg.content.toLowerCase() === 'ook') {
        //msg.channel.send(':thumbsup:');
        msg.react('🍌');
        console.log('\nook');
    }

    
    /*** bot commands ***/
    else if (msg.content.startsWith(prefix)) {
        var requestBody = msg.content.substring(prefix.length);
        console.log("\nrequestBody:: "+requestBody);
        if (requestBody.includes(' ')){
            var command = requestBody.substr(0,requestBody.indexOf(' '));
            var content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
        }
        else {
            var command = requestBody.trim();
            var content = "{}";
        }
        console.log("__command:: "+command);
        console.log("__content:: "+content);

        if (command === '--ook'){
            msg.react('🍌');
            console.log('ook :banana:');
        }

        else if (command === '--emoji'){
            //"<:name:snowflake_id>";
            console.log("starts with '<'  : "+content.startsWith('<'));
            console.log("ends with '<'  : "+content.endsWith('>'));
            console.log("contains with ':'  : "+content.includes(':'));
            var emote = get_emote_id(content).emote;
            
            msg.react(emote); //unicode or id
            msg.reply(content); //unicode or <:name:id> code
        }


        /* Display a post with all available commands */
        else if (command === '--help' || command === '--commands'){
            console.log("received request [help] or [commands]");
            var reply = "The bot commands are as follows, \n"+
            ".  ***commandName  ->  arguments*** \n"+
            ".    any quotation marks, curly brackets, or square brackets are necessary are necessary\n"+
            ".    `\"...\"` implies that you can input more than one\n"+
            ".    `encapsulating with < and > like \"< args >\"` implies the argument is optional\n"+
            ".    do not use double quotations in a key value pair;  instead use single quotations or escaped double quotations for example, for example\n"+
            ".    `{\"message\": \"i quote, \"something\" and it failed :<\"}`\n"+
            ".    `{\"message\": \"i quote, 'something' and it succeeded :>\"}`\n"+
            ".    `{\"message\": \"i quote, \\\"something\\\" and it succeeded :>\"}`\n"+
            "================================\n"+
            //"**--**  ->  ``\n" +
            //".     *description* \n" +
            //"- - - - - - - - - \n"+
            "**--ook**  ->  *none*" +
            ".     *description* \n" +
            "- - - - - - - - - \n"+
            "**--shutdown**  ->  *none*" +
            ".     *close the discord-bot (bot process is also closed)* \n" +
            "- - - - - - - - - \n"+
            "**--create-reactrole-any**  ->  `{\"message\": \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }` \n" +
            ".     *Create a post with reactions that will assign roles like checkboxes.  Each reaction can freely assign/remove a role* \n" +
            "- - - - - - - - - \n"+
            "**--create-reactrole-switch**  ->  `{\"message\": \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }` \n" +
            ".     *Create a post with reactions that will assign roles like a radio button (switching logic).  Only one reaction at a time, reacting to any others in this group will result in removal of the existing role and reaction then adding the new role (react on B removes role A and react on A, then gives role B)* \n" +
            "- - - - - - - - - \n"+
            //TODO repeat events for schedule,  maybe --schedule-repeat {time} --*event to repeat* *event args*
            "**--give-role-condition**  ->  `{\"give-role\": ['roleName', ...] <,  \"has-role\": ['roleName', ...]> <,  \"missing-role\": ['roleName', ...]>  }` \n" +
            ".     *Give role(s) to a user in the server if they have or doesn't have some role.  Must give at least one \"give-role\", but \"has-role\" and \"missing-role\" are optional. Give at least one has-role for better performance.*  \n" +
            "- - - - - - - - - \n"+
            "**--remove-role-condition**  ->  `{\"remove-role\": ['roleName', ...] <,  \"has-role\": ['roleName', ...]> <,  \"missing-role\": ['roleName', ...]>  }` \n" +
            ".     *Remove role(s) from a user in the server if they have or doesn't have some role.  Must give at least one \"remove-role\", but \"has-role\" and \"missing-role\" are optional. Give at least one has-role for better performance.*  \n" +
            "- - - - - - - - - \n"+
            "**--document-reacts**  ->  `TBD` \n" +
            ".     *Dumps the reaction information of a specified post (via ID) into a specified google doc/sheet* \n" +
            "- - - - - - - - - \n"+
            "**--document-reacts**  ->  `TBD` \n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID) into a specified google doc/sheet* \n" +
            "";
            msg.reply(reply);
        }



        /* "checkbox" reactions post */
        else if (command === '--create-reactrole-any'){
            console.log("received request [create-reactrole-any]");
            //{"message": "*the post text*" ,  "reactions": {"emote": "roleName" ,  ...} }
            const args = JSON.parse(content);
            if (!args.hasOwnProperty('message') || !args.hasOwnProperty('reactions')){
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.  It should be of the following form: \n"+
                    "`{message: \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }`");
                return;
            }

            var text_body = args.message;
            var emotes = Object.keys(args.reactions);

            //check if roles and emotes exist
            for (_emote of emotes){
                var emote_info = get_emote_id(_emote);
                var emote = emote_info.emote;
                if (  (emote_info.type === "custom") && //skip unicode, cuz i dunno how to verify
                        !( msg.guild.emojis.resolve(emote)  //.cache.find(emoji => ((emoji.name === emote) || (emoji.id === emote)))
                         || client.emojis.resolve(emote) )  ) {
                    console.log("--invalid emote ::  "+_emote);
                    msg.reply("Invalid emote -> "+_emote);
                    return;
                }
                var _role = args.reactions[_emote];
                if ( !msg.guild.roles.cache.find(role => role.name.toLowerCase() === _role.toLowerCase()) ){
                    console.log("--invalid role ::  "+_role);
                    msg.reply("Invalid role -> "+_role);
                    return;
                }
            }

            console.log("--setting up bot message");
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
                    console.log("----message posted with id ["+bot_message_id+"] in channel ["+channel_id+"] in server ["+server_id+"]");
                    var current_post = reactroles[server_id][channel_id][bot_message_id];
                    current_post['type'] = "any"; //
                    current_post['emotes'] = {};
                    console.log("--setting up reactions");
                    for (var raw_emote of emotes){
                        console.log('--set up reaction on bot message: '+raw_emote); 
                        var emote_info = get_emote_id(raw_emote);
                        var emote = emote_info.emote;
                        var emote_type = emote_info.type;
                        switch (emote_type){
                            case "unicode":
                                console.log("----unicode emote");
                                break;
                            case "custom":
                                console.log("----custom emote");
                                break;
                        }
                        current_post['emotes'][emote] = args.reactions[raw_emote];
                        await bot_message.react(emote); 
                        console.log("----complete");
                    };

                    console.log("--creating reaction collector");
                    //if filter returns true then check event, otherwise ignore
                    const filter = (reaction, user) => {
                        //console.log("user react: "+(user.id !== client.user.id));
                        //console.log(Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']));
                        //console.log(Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.name));
                        //console.log(Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.id));
                        return ((user.id !== bot_id)
                            && ( Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.name) 
                                || Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.id) ));
                    };
                    const collector = bot_message.createReactionCollector(filter,{dispose: true});
                    //current_post['collector'] = collector; //currently not needed

                    /* reaction is added */
                    collector.on('collect', (reaction, user) => {
                        console.log("\n__collected an added reaction");
                        var server = reaction.message.guild;
                        var channel = reaction.message.channel;
                        console.log("__user ["+user.username+":"+user.id+"]");
                        console.log("____reacted with ["+reaction.emoji.name+":"+reaction.emoji.id+"]");
                        console.log("____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                        if (reaction.emoji.id) //not null -> custom
                            var react_emote = reaction.emoji.id;
                        else //null -> unicode
                            var react_emote = reaction.emoji.name;
                        var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                        console.log("__role to assign: "+role_to_assign);

                        console.log("--resolving server role");
                        var role = server.roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                        if (role){
                            console.log("----found: "+role.name+":"+role.id);
                            console.log("--resolving server member");
                            var member = server.members.resolve(user.id); //.roles.add
                            if (member){
                                console.log("----found: "+member.displayName+":"+member.id);
                                console.log("--giving role to member");
                                member.roles.add(role.id)
                                .then(m_id => console.log("----successfully added role to member ["+m_id+"]"))
                                .catch(err => {
                                    console.log("----failed to add role due to error");
                                    console.log(err);
                                });
                            }else console.log("----member not found");
                        } else console.log("----role not found");
                    });
                    
                    /* reaction is removed */
                    collector.on('remove', (reaction, user) => { //remove event is not being fired on emoji removal
                        console.log("\n__collected a removed reaction");
                        var server = reaction.message.guild;
                        var channel = reaction.message.channel;
                        console.log("__user ["+user.username+":"+user.id+"]");
                        console.log("____removed reaction ["+reaction.emoji.name+":"+reaction.emoji.id+"]");
                        console.log("____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                        if (reaction.emoji.id) //not null -> custom
                            var react_emote = reaction.emoji.id;
                        else //null -> unicode
                            var react_emote = reaction.emoji.name;
                        var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                        console.log("__role to remove: "+role_to_assign);

                        console.log("--resolving server role");
                        var role = server.roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                        if (role){
                            console.log("----role found: "+role.name+":"+role.id);
                            console.log("--resolving server member");
                            var member = server.members.resolve(user.id); //.roles.add
                            if (member){
                                console.log("----member found: "+member.displayName+":"+member.id);
                                console.log("--giving role to member");
                                member.roles.remove(role.id)
                                .then(m_id => console.log("----successfully removed role from member ["+m_id+"]"))
                                .catch(err => {
                                    console.log("----failed to remove role due to error");
                                    console.log(err);
                                });
                            }else console.log("----member not found");
                        } else console.log("----role not found");
                    });
                    
                    console.log("----complete");
                    //console.log(reactroles);
                });
        }



        /* "radio button" reactions post */
        else if (command === '--create-reactrole-switch'){
            console.log("received request [create-reactrole-switch]");
            //{"message": "*the post text*" ,  "reactions": {"emote": "roleName" ,  ...} }
            const args = JSON.parse(content);
            if (!args.hasOwnProperty('message') || !args.hasOwnProperty('reactions')){
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.  It should be of the following form: \n"+
                    "`{message: \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }`");
                return;
            }

            var text_body = args.message;
            var emotes = Object.keys(args.reactions);

            //check if roles and emotes exist
            for (_emote of emotes){
                var emote_info = get_emote_id(_emote);
                var emote = emote_info.emote;
                if (  (emote_info.type === "custom") && //skip unicode, cuz i dunno how to verify
                        !( msg.guild.emojis.resolve(emote)  //.cache.find(emoji => ((emoji.name === emote) || (emoji.id === emote)))
                         || client.emojis.resolve(emote) )  ) {
                    console.log("--invalid emote ::  "+_emote);
                    msg.reply("Invalid emote -> "+_emote);
                    return;
                }
                var _role = args.reactions[_emote];
                if ( !msg.guild.roles.cache.find(role => role.name.toLowerCase() === _role.toLowerCase()) ){
                    console.log("--invalid role ::  "+_role);
                    msg.reply("Invalid role -> "+_role);
                    return;
                }
            }

            console.log("--setting up bot message");
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
                    console.log("----message posted with id ["+bot_message_id+"] in channel ["+channel_id+"] in server ["+server_id+"]");
                    var current_post = reactroles[server_id][channel_id][bot_message_id];
                    current_post['type'] = "switch"; //
                    current_post['emotes'] = {};
                    console.log("--setting up reactions");
                    for (var raw_emote of emotes){
                        console.log('--set up reaction on bot message: '+raw_emote); 
                        var emote_info = get_emote_id(raw_emote);
                        var emote = emote_info.emote;
                        var emote_type = emote_info.type;
                        switch (emote_type){
                            case "unicode":
                                console.log("----unicode emote");
                                break;
                            case "custom":
                                console.log("----custom emote");
                                break;
                        }
                        current_post['emotes'][emote] = args.reactions[raw_emote];
                        await bot_message.react(emote); 
                        console.log("----complete");
                    };

                    console.log("--creating reaction collector");
                    //if filter returns true then check event, otherwise ignore
                    const filter = (reaction, user) => {
                        return ((user.id !== bot_id)
                            && ( Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.name) 
                                || Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']).includes(reaction.emoji.id) ));
                    };
                    const collector = bot_message.createReactionCollector(filter,{dispose: true});

                    /* reaction is added */
                    collector.on('collect', (reaction, user) => {
                        console.log("\n__collected an added reaction");
                        var server = reaction.message.guild;
                        var channel = reaction.message.channel;
                        console.log("__user ["+user.username+":"+user.id+"]");
                        console.log("____reacted with ["+reaction.emoji.name+":"+reaction.emoji.id+"]");
                        console.log("____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                        if (reaction.emoji.id) //not null -> custom
                            var react_emote = reaction.emoji.id;
                        else //null -> unicode
                            var react_emote = reaction.emoji.name;
                        var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                        console.log("__role to assign: "+role_to_assign);

                        console.log("--resolving server role");
                        var role = server.roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                        if (role){
                            console.log("----found: "+role.name+":"+role.id);
                            console.log("--resolving server member");
                            var member = server.members.resolve(user.id); //.roles.add
                            if (member){
                                console.log("----found: "+member.displayName+":"+member.id);
                                console.log("--giving role to member");
                                member.roles.add(role.id)
                                .then(m_id => {
                                    console.log("----successfully added role to member ["+m_id+"]");
                                    /* after addding role, remove other roles in this reactrole group */
                                    var reactrole_group = Object.keys(reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes']);
                                    
                                    var message_reactions = reaction.message.reactions.cache;
                                    var vals = message_reactions.values(); //array/iterable of MessageReaction
                                    for (val of vals){
                                        //console.log(val.emoji.name+":"+val.emoji.id);
                                        //console.log(val.users.cache.mapValues(user => server.members.resolve(user.id).displayName+":"+user.id));
                                        if ((reactrole_group.includes(val.emoji.name) || reactrole_group.includes(val.emoji.id)) //react is in reactrole group
                                            && !((val.emoji.id === react_emote) || (val.emoji.name === react_emote)) ) //react isn't the newly added reaction
                                            val.users.remove(user.id) //removing triggers the reaction 'remove' event and deals with the role removal
                                            .then(console.log("--removed user ["+user.id+"] from react ["+val.emoji.name+":"+val.emoji.id+"]"))
                                            .catch(err => {
                                                console.log("--failed to remove user ["+user.id+"] from react ["+val.emoji.name+":"+val.emoji.id+"]");
                                                console.log(err);
                                            });
                                        //var switch_off_role = reactroles[reaction.message.guild.id][reaction.message.channel.id][reaction.message.id]['emotes'][emote];
                                    }
                                })
                                .catch(err => {
                                    console.log("----failed to add role due to error");
                                    console.log(err);
                                });
                            }else console.log("----member not found");
                        } else console.log("----role not found");
                    });
                    
                    /* reaction is removed */
                    collector.on('remove', (reaction, user) => { //remove event is not being fired on emoji removal
                        console.log("\n__collected a removed reaction");
                        var server = reaction.message.guild;
                        var channel = reaction.message.channel;
                        console.log("__user ["+user.username+":"+user.id+"]");
                        console.log("____removed reaction ["+reaction.emoji.name+":"+reaction.emoji.id+"]");
                        console.log("____on message ["+reaction.message.id+"] in channel ["+channel.name+":"+channel.id+"] in server ["+server.name+":"+server.id+"]");
                        if (reaction.emoji.id) //not null -> custom
                            var react_emote = reaction.emoji.id;
                        else //null -> unicode
                            var react_emote = reaction.emoji.name;
                        var role_to_assign = reactroles[server.id][channel.id][reaction.message.id]['emotes'][react_emote];
                        console.log("__role to remove: "+role_to_assign);

                        console.log("--resolving server role");
                        var role = server.roles.cache.find(role => role.name.toLowerCase() === role_to_assign.toLowerCase()); //.resolve()
                        if (role){
                            console.log("----role found: "+role.name+":"+role.id);
                            console.log("--resolving server member");
                            var member = server.members.resolve(user.id); //.roles.add
                            if (member){
                                console.log("----member found: "+member.displayName+":"+member.id);
                                console.log("--giving role to member");
                                member.roles.remove(role.id)
                                .then(m_id => console.log("----successfully removed role from member ["+m_id+"]"))
                                .catch(err => {
                                    console.log("----failed to remove role due to error");
                                    console.log(err);
                                });
                            }else console.log("----member not found");
                        } else console.log("----role not found");
                    });
                    
                    console.log("----complete");
                    //console.log(reactroles);
                });
        }



        /* give a role if members have certain roles or are missing certain roles */
        else if (command === '--give-role-conditioned'){ //for all users
            //{"give-role": ['roleName', ...] <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }
            console.log("received request [give-role-conditioned]");
            const args = JSON.parse(content);

            var server = msg.guild;
            var roles = [];
            if (args.hasOwnProperty("give-role")){
                //roles.concat(args["give-role"]);
                for (role of args["give-role"])
                    roles.push(role);
            } else {
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct. 'give-role' is necessary.  It should be of the following form: \n"+
                    "`{\"give-role\": ['roleName', ...] <,  \"has-role\": ['roleName', ...]> <,  \"missing-role\": ['roleName', ...]>  }`");
                return;
            }
            if (args.hasOwnProperty("has-role")){
                console.log("----has-role");
                //roles.concat(args["has-role"]);
                for (role of args["has-role"])
                    roles.push(role);
            }
            if (args.hasOwnProperty("missing-role")){
                console.log("----missing-role");
                //roles.concat(args["missing-role"]);
                for (role of args["missing-role"])
                    roles.push(role);
            }
            for (role of roles){
                if ( !server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                    console.log("--invalid role ::  "+role);
                    msg.reply("Invalid role -> "+role);
                    return;
                }
            }

            var list;
            var has_role = null;
            if (args.hasOwnProperty("has-role")){ //use list of first has-role
                if(Object.keys(args['has-role']).length > 0){
                    var role = server.roles.cache.find(role => role.name.toLowerCase() === args['has-role'][0].toLowerCase());
                    list = role.members.values();
                    has_role = args['has-role'].slice(1); //skip the first
                }
                else{  //use entire server member list
                    list = server.members.cache.values();
                    has_role = args['has-role'];
                }
            }
            else //use entire server member list
                list = server.members.cache.values();

            for (member of list){
                var skip = false;
                if (has_role){
                    for (role of has_role){ //check if member doesn't have role, if so skiptrue and break
                        if ( !member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                            skip = true;
                            //console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: doesn't have role) "+role);
                            break;
                        }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: has role) "+role);
                    }
                    if (skip) continue;
                }
                if(args.hasOwnProperty("missing-role")){
                    for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                        if ( member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                            skip = true;
                            //console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: has role) "+role);
                            break;
                        }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: doesn't have role) "+role);
                    }
                    if (skip) continue;
                }
                //give role(s)
                for (role of args["give-role"])
                    var role_to_add = server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                    member.roles.add(role_to_add.id)
                    .then(m_id => console.log("----successfully added role ["+role_to_add.name+":"+role_to_add.id+"] to member ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                    .catch(err => {
                        console.log("----failed to add role ["+role_to_add.name+":"+role_to_add.id+"] to member ["+m_id+"] due to error");
                        console.log(err);
                    });
            }
        }



        /* remove a role if members have certain roles or are missing certain roles */
        else if (command === '--remove-role-conditioned'){ //for all users
            //{"give-role": ['roleName', ...] <,  "has-role": ['roleName', ...]> <,  "missing-role": ['roleName', ...]>  }
            console.log("received request [give-role-conditioned]");
            const args = JSON.parse(content);

            var server = msg.guild;
            var roles = [];
            if (args.hasOwnProperty("give-role")){
                //roles.concat(args["give-role"]);
                for (role of args["give-role"])
                    roles.push(role);
            } else {
                msg.reply("Incorrect request body.  Please ensure that the input arguments are correct. 'give-role' is necessary.  It should be of the following form: \n"+
                    "`{\"give-role\": ['roleName', ...] <,  \"has-role\": ['roleName', ...]> <,  \"missing-role\": ['roleName', ...]>  }`");
                return;
            }
            if (args.hasOwnProperty("has-role")){
                console.log("----has-role");
                //roles.concat(args["has-role"]);
                for (role of args["has-role"])
                    roles.push(role);
            }
            if (args.hasOwnProperty("missing-role")){
                console.log("----missing-role");
                //roles.concat(args["missing-role"]);
                for (role of args["missing-role"])
                    roles.push(role);
            }
            for (role of roles){
                if ( !server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()) ){
                    console.log("--invalid role ::  "+role);
                    msg.reply("Invalid role -> "+role);
                    return;
                }
            }

            var list;
            var has_role = null;
            if (args.hasOwnProperty("has-role")){ //use list of first has-role
                if(Object.keys(args['has-role']).length > 0){
                    var role = server.roles.cache.find(role => role.name.toLowerCase() === args['has-role'][0].toLowerCase());
                    list = role.members.values();
                    has_role = args['has-role'].slice(1); //skip the first
                }
                else{  //use entire server member list
                    list = server.members.cache.values();
                    has_role = args['has-role'];
                }
            }
            else //use entire server member list
                list = server.members.cache.values();

            for (member of list){
                var skip = false;
                if (has_role){
                    for (role of has_role){ //check if member doesn't have role, if so skiptrue and break
                        if ( !member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                            skip = true;
                            //console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: doesn't have role) "+role);
                            break;
                        }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (A: has role) "+role);
                    }
                    if (skip) continue;
                }
                if(args.hasOwnProperty("missing-role")){
                    for (role of args["missing-role"]){ //check if member has role, if so skiptrue and break
                        if ( member.roles.cache.has(server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase()).id ) ){
                            skip = true;
                            //console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: has role) "+role);
                            break;
                        }//else console.log("member ["+member.displayName+":"+member.id+"] -- skip (B: doesn't have role) "+role);
                    }
                    if (skip) continue;
                }
                //give role(s)
                for (role of args["give-role"])
                    var role_to_remove = server.roles.cache.find(_role => _role.name.toLowerCase() === role.toLowerCase());
                    member.roles.remove(role_to_remove.id)
                    .then(m_id => console.log("----successfully removed role ["+role_to_remove.name+":"+role_to_remove.id+"] from member ["+server.members.resolve(m_id).displayName+":"+m_id+"] "))
                    .catch(err => {
                        console.log("----failed to remove role ["+role_to_remove.name+":"+role_to_remove.id+"] from member ["+m_id+"] due to error");
                        console.log(err);
                    });
            }
        }



        /* dump reacts of a post to a doc */
        else if (command === '--document-reacts'){
            console.log("received request [document-reacts]");
            //TODO
        }



        /* dump names of members in voice channel to a doc */
        else if (command === '--document-voice'){
            console.log("received request [document-voice]");
            //TODO
        }



        /*  *//*
        else if (command === '--'){
            //
            //JSON.parse(content)
        }*/



        /* shutdown the bot */
        else if (command === '--shutdown'){
            msg.channel.send("i must go, my pepol call me!").then(msg => client.destroy());
            console.log('--bot shutting down');
        }   

        else {
            msg.reply("`"+prefix+command+"` command unknown, try --help or --commands for a list of commands and short documentation");
        }
    }
});

/*
client.on( => {
    //
});
*/


function get_emote_id(content){
    if (content.startsWith('<') && content.endsWith('>') && content.includes(':')){
        var type = "custom";
        var temp = content.substring(1, content.length-1);
        //console.log(temp);
        var temp2 = temp.split(":");
        //console.log(temp2);
        //console.log(temp2.length);
        var emote = temp2[temp2.length-1];
        //console.log("custom emote: "+emote);
        //const emote_info = client.emojis.resolve(emote);
        //console.log(emote_info);
    }
    else { //otherwise unicode supported emoji -> use raw
        var emote = content;
        var type = "unicode";
        //console.log("unicode emote: "+emote);
    }
    return {'emote': emote, 'type': type};
}



/***   scheduled reactroles garbage collection   ***/
var time_interval = 1000*60*60*24; // 24 hours
setInterval(reactroles_garbage_collection, time_interval); 
function reactroles_garbage_collection(){
    console.log("\nBeginning reactrole garbage collection");
    for(_server of reactroles){
        var server = client.guilds.resolve(_server);
        if (server.deleted){
            console.log("--server "+server.name+":"+server.id+" DELETED");
            delete reactroles[_server];
        }
        else {
            console.log("--server "+server.name+":"+server.id+" \\");
            for (_channel of reactroles[_server]){
                var channel = server.channels.resolve(_channel);
                if (channel.deleted){
                    console.log("----channel "+channel.name+":"+channel.id+" DELETED");
                    delete reactroles[_server][_channels];
                }
                else {
                    console.log("----channel "+channel.name+":"+channel.id+" \\");
                    for (_message of reactroles[_server][_channel]){
                        channel.messages.fetch(_message) //not tested fully
                        .then(message => {
                            if (message.deleted){
                                console.log("------message "+message.id+" DELETED");
                                delete reactroles[_server][_channels][_message];
                            } else console.log("------message "+message.id+" >>|");
                        })
                        .catch(console.error);
                    }
                }
            }
        }
    }
}



client.login(token);