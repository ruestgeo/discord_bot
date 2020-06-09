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

const dumpToSheet = async (msg, globals, sheet_title, list, rowStart, rowEnd, colStart, colEnd) => {
    var doc = globals.doc;
    var configs = globals.configs;
    var rowSize;
    var colSize;
    if (configs.autoSheetSize){
        rowSize = rowEnd-rowStart;
        colSize = colEnd-colStart;
    }
    else { //take the default, or the min necessary amount of rows/cols to fit the data
        rowSize = Math.min(configs.defaultSheetRows , rowEnd-rowStart);
        colSize = Math.min(configs.defaultSheetCols , colEnd-colStart);
    }
    const sheet = await doc.addSheet({ title: sheet_title, gridProperties: { rowCount: rowSize, columnCount: colSize, frozenRowCount: (rowStart == 0 ? 1 : 0) } });
    await sheet.loadCells({
        startRowIndex: rowStart, endRowIndex: rowEnd, startColumnIndex: colStart, endColumnIndex: colEnd
    });
    
    for (var i=colStart; i<colEnd; i++){ //load headers with bold
        const cell = sheet.getCell(rowStart, i); 
        cell.textFormat = { bold: true };
        cell.value = list[i][0];
    }
    for (var j=rowStart+1; j<rowEnd; j++){
        for (var i=colStart; i<colEnd; i++){
            const cell = sheet.getCell(j, i);
            cell.value = list[i][j];
        }
    }
    await sheet.saveUpdatedCells();  // save all updates in one call
    msg.reply("Data has been dumped to doc "+"<https://docs.google.com/spreadsheets/d/"+doc.spreadsheetId+"#gid="+sheet.sheetId+">");
}



module.exports = {
    documentVoice: async function (globals, msg, content){
        var client = globals.client;

        utils.botLogs(globals,  "--fetching channel ["+content+"]");
        client.channels.fetch(content.trim())
        .then(channel => {
            var voice_members = channel.members.values();
            
            var date = utils.getDateTimeString(globals);
            var channel_title = channel.type+" channel ["+channel.name+"] "+date;

            utils.botLogs(globals,  "\n\n"+channel_title);
            var list = [];
            var col = [];
            col.push("#"+channel.name);
            for (member of voice_members){
                utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                col.push(member.displayName+"#"+member.user.discriminator);
            }
            list.push(col);

            /**  create new sheet and dump info  **/
            dumpToSheet(msg, globals, channel_title, list, 0, col.length, 0, 1);

        })
        .catch(err => {
            utils.botLogs(globals,  err.stack)
            msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
        });
        
    },




    documentReactions: async function (globals, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>
        var client = globals.client;
        
        content = content.trim();
        utils.botLogs(globals,  "--fetching message ["+content+"]");
        if (! content.startsWith("https://discordapp.com/channels/")){
            utils.botLogs(globals,  "----invalid message link"+content);
            msg.reply("Invalid message link: ["+content+"]");
            return;
        }
        var ids = content.substring("https://discordapp.com/channels/".length).split("/");
        var server_id = ids[0];
        var channel_id = ids[1];
        var message_id = ids[2];
        var server = client.guilds.resolve(server_id);
        if( !server){
            utils.botLogs(globals,  "----server could not be resolved from id "+server_id);
            msg.reply("Server could not be resolved from id "+server_id)
            return;
        }
        var channel = server.channels.resolve(channel_id);
        if (!channel){
            utils.botLogs(globals,  "----channel could not be resolved from id "+channel_id);
            msg.reply("Channel could not be resolved from id "+channel_id)
            return;
        }
        await channel.messages.fetch(message_id) //NOTE: currently only messages have links, if others have links then need to type check channel type
        .then(message => {
            if (message.deleted){
                utils.botLogs(globals,  "----message "+message.id+" DELETED");
                msg.reply("Message with id ["+message_id+"] had been deleted")
            } 
            else {
                var msg_reacts = message.reactions.cache.values(); //doesn't fetch reaction users
                
                utils.botLogs(globals,  "\n\nmessage ["+message.id+"] reactions");
                
                var date = utils.getDateTimeString(globals);
                var reacts_title = "reacts "+date+"  "+channel.name+"/"+message.id;

                const fetchUsers = async (globals, msg, message, msg_reacts, reacts_title) => { //declare the func, then later need to call it
                    var list = [];
                    var longest_col = 0;
                    for (msg_react of msg_reacts){
                        var col = [];
                        try{
                            var emote = msg_react.emoji.name+":"+msg_react.emoji.id;
                            col.push(emote);
                            utils.botLogs(globals,  "  "+emote);
                            var _react_users = await msg_react.users.fetch();
                            var react_users = _react_users.values();
                            for (user of react_users){
                                var display_name = message.guild.members.resolve(user.id).displayName+"#"+user.discriminator;
                                col.push(display_name);
                                utils.botLogs(globals,  "      "+display_name+":"+user.id);
                            }
                        } catch (err){
                            utils.botLogs(globals,  err.stack);
                            msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
                            return;
                        }
                        longest_col = Math.max(longest_col, col.length);
                        list.push(col);
                    }

                    /**  create new sheet and dump info  **/
                    dumpToSheet(msg, globals, reacts_title, list, 0, longest_col, 0, list.length);

                }
                fetchUsers(globals, msg, message, msg_reacts, reacts_title);
            }
        })
        .catch(err => {
            utils.botLogs(globals,  err);
            msg.reply("Couldn't fetch message from id "+message_id)
        });
    },
    
    


    
    
    
    documentVoice_v2: async function (globals, msg, content){
        var client = globals.client;
        
        if (!content.includes(' ')){
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            utils.botLogs(globals,  "----incorrect request body");
            return;
        }
        var target = content.substr(0, content.indexOf(' ')).trim();
        var targetRole = content.substr(content.indexOf(' ')+1).trim();
        utils.botLogs(globals,  "----target:: "+target+"\n----targetRole:: "+targetRole);
        var server = msg.guild;

        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying role is valid");
        var role = server_roles.cache.find(_role => _role.name.toLowerCase() === targetRole.toLowerCase());
        if ( !role ){
            utils.botLogs(globals,  "----invalid role ::  "+targetRole);
            msg.reply("Invalid role -> "+targetRole);
            return;
        }
        var role = await server.roles.fetch(role.id); //for cache
        
        var list = [];
        var col = [];
        var members = [];
        var notInChannel = [];
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        col.push(role.name);
        for (member of role.members.values()){
            col.push(member.displayName+"#"+member.user.discriminator);
            members.push(member.id);
        }
        list.push(col);
        utils.botLogs(globals,  "----complete");

        utils.botLogs(globals,  "--fetching channel ["+target+"]");
        client.channels.fetch(target.trim())
        .then(channel => {
            var voice_members = channel.members;

            var date = utils.getDateTimeString(globals);
            var channel_title = channel.type+" channel ["+channel.name+"] "+date;
            utils.botLogs(globals,  "\n\n"+channel_title);

            col = [];
            col.push("#"+channel.name);
            for (memberID of members){ 
                var isMemberInChannel = voice_members.has(memberID);
                col.push(isMemberInChannel);
                if(isMemberInChannel){
                    var member = voice_members.get(memberID);
                    utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                } else notInChannel.push(memberID);
            }
            list.push(col);

            /* print out members not in channel */
            utils.botLogs(globals,  "\n\nUsers not in channel");
            for (memberID of notInChannel){
                var member = server.members.fetch(memberID).then(member => {
                    utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                }); 
                
            }

            /**  create new sheet and dump info  **/
            dumpToSheet(msg, globals, channel_title, list, 0, col.length, 0, list.length);

        })
        .catch(err => {
            utils.botLogs(globals,  err.stack)
            msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
        });
        
    },




    documentReactions_v2: async function (globals, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>
        var client = globals.client;
        
        if (!content.includes(' ')){
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            utils.botLogs(globals,  "----incorrect request body");
            return;
        }
        var target = content.substr(0, content.indexOf(' ')).trim();
        var targetRole = content.substr(content.indexOf(' ')+1).trim();
        utils.botLogs(globals,  "----target:: "+target+"\n----targetRole:: "+targetRole);
        var server = msg.guild;

        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying role is valid");
        var role = server_roles.cache.find(_role => _role.name.toLowerCase() === targetRole.toLowerCase());
        if ( !role ){
            utils.botLogs(globals,  "----invalid role ::  "+targetRole);
            msg.reply("Invalid role -> "+targetRole);
            return;
        }
        var role = await server.roles.fetch(role.id); //for cache
        
        var list = [];
        var col = [];
        var members = [];
        var noReaction = {}; 
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        col.push("Users");
        for (member of role.members.values()){
            var member = await server.members.fetch(member);
            col.push(member.displayName+"#"+member.user.discriminator);
            members.push(member.id);
            noReaction[member.id] = true; //later updated to false if member has reacted
        }
        list.push(col);
        utils.botLogs(globals,  "----complete");

        utils.botLogs(globals,  "--fetching message ["+target+"]");
        if (! target.startsWith("https://discordapp.com/channels/")){
            utils.botLogs(globals,  "----invalid message link"+target);
            msg.reply("Invalid message link: ["+target+"]");
            return;
        }
        var ids = target.substring("https://discordapp.com/channels/".length).split("/");
        var server_id = ids[0];
        var channel_id = ids[1];
        var message_id = ids[2];
        var server = client.guilds.resolve(server_id);  //not really neccessary, could use `msg.guild` for more restrictive use
        if( !server){
            utils.botLogs(globals,  "----server could not be resolved from id "+server_id);
            msg.reply("Server could not be resolved from id "+server_id)
            return;
        }
        var channel = server.channels.resolve(channel_id);
        if (!channel){
            utils.botLogs(globals,  "----channel could not be resolved from id "+channel_id);
            msg.reply("Channel could not be resolved from id "+channel_id)
            return;
        }
        await channel.messages.fetch(message_id) //NOTE: currently only messages have links, if others have links then need to type check channel type
        .then(message => {
            if (message.deleted){
                utils.botLogs(globals,  "----message "+message.id+" DELETED");
                msg.reply("Message with id ["+message_id+"] had been deleted")
            } 
            else{
                var msg_reacts = message.reactions.cache.values(); //doesn't fetch reaction users
                
                utils.botLogs(globals,  "\n\nmessage ["+message.id+"] reactions");
                var date = utils.getDateTimeString(globals);
                var reacts_title = "reacts "+date+"  "+channel.name+"/"+message.id;

                const fetchUsers = async (globals, msg, message, msg_reacts, reacts_title, list, members, noReaction) => { //declare the func, then later need to call it
                    var longest_col = 0;
                    for (msg_react of msg_reacts){
                        var col = [];
                        try{
                            var emote = msg_react.emoji.name+":"+msg_react.emoji.id;
                            col.push(emote);
                            utils.botLogs(globals,  "  "+emote);
                            var _react_users = await msg_react.users.fetch();
                            var react_users = _react_users;
                            for (memberID of members){
                                var hasReacted = react_users.has(memberID);
                                col.push(hasReacted);
                                if(hasReacted){
                                    var member = message.guild.members.resolve(memberID);
                                    utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                                }
                                noReaction[memberID] = ((!hasReacted) && noReaction[memberID]); //only true if NOT hasReacted for all reactions
                            }
                        } catch (err){
                            utils.botLogs(globals,  err.stack);
                            msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
                            return;
                        }
                        longest_col = Math.max(longest_col, col.length);
                        list.push(col);
                    }

                    /* print out members without reaction and insert col to doc */
                    utils.botLogs(globals,  "\n\nUsers without reaction");
                    var col = [];
                    col.push("No Reaction");
                    var noReacts = Object.keys(noReaction).filter(memberID => noReaction[memberID] == true); // only get the ones that didnt react
                    for (memberID of noReacts){ //for (memberID of members){
                        var member = await server.members.fetch(memberID); 
                        var hasNotReacted = noReaction[memberID];
                        col.push(hasNotReacted);
                        utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                    }
                    list.push(col);
                    

                    /**  create new sheet and dump info  **/
                    dumpToSheet(msg, globals, reacts_title, list, 0, longest_col, 0, list.length);

                }
                fetchUsers(globals, msg, message, msg_reacts, reacts_title, list, members, noReaction);
            }
        })
        .catch(err => {
            utils.botLogs(globals,  err);
            msg.reply("Couldn't fetch message from id "+message_id)
        });
    },







    documentVoice_v3: async function (globals, msg, content){
        var client = globals.client;
        
        if (!content.includes(' ')){
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            utils.botLogs(globals,  "----incorrect request body");
            return;
        }
        var target = content.substr(0, content.indexOf(' ')).trim();
        var targetRole = content.substr(content.indexOf(' ')+1).trim();
        utils.botLogs(globals,  "----target:: "+target+"\n----targetRole:: "+targetRole);
        var server = msg.guild;

        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying role is valid");
        var role = server_roles.cache.find(_role => _role.name.toLowerCase() === targetRole.toLowerCase());
        if ( !role ){
            utils.botLogs(globals,  "----invalid role ::  "+targetRole);
            msg.reply("Invalid role -> "+targetRole);
            return;
        }
        var role = await server.roles.fetch(role.id); //for cache
        
        var members = [];
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        for (member of role.members.values()){
            members.push(member.id);
        }
        utils.botLogs(globals,  "----complete");

        const fetchUsers = async (client, msg, globals, members, roleName) => {
            var list = [];
            var col_IN = [];
            var col_NOT = [];
            utils.botLogs(globals,  "--fetching channel ["+target+"]");
            var channel = await client.channels.fetch(target.trim())
            .catch(err => {
                utils.botLogs(globals,  err.stack)
                msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
            });
            var voice_members = channel.members;
            
            var date = utils.getDateTimeString(globals);
            var channel_title = roleName+" in "+channel.type+" ["+channel.name+"] "+date;
            utils.botLogs(globals,  "\n\n"+channel_title);
            
            col_IN.push("#"+channel.name);
            col_NOT.push("Not in Channel");
            for (memberID of members){ 
                var member = channel.guild.members.resolve(memberID);
                if(voice_members.has(memberID)){
                    col_IN.push(member.displayName+"#"+member.user.discriminator);    
                    utils.botLogs(globals,  "  "+member.displayName+"#"+member.user.discriminator);
                } else col_NOT.push(member.displayName+"#"+member.user.discriminator);
            }
            list.push(col_IN);
            list.push(col_NOT);

            /* print out members not in channel */
            utils.botLogs(globals,  "\n\nUsers not in channel");
            for (var idx=1; idx < col_NOT.length; idx++){
                utils.botLogs(globals,  "  "+col_NOT[idx]);
                
            }

            /**  create new sheet and dump info  **/
            dumpToSheet(msg, globals, channel_title, list, 0, Math.max(col_IN.length, col_NOT.length), 0, list.length);
        }
        await fetchUsers(client, msg, globals, members, role.name);
    },




    documentReactions_v3: async function (globals, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>
        var client = globals.client;
        
        if (!content.includes(' ')){
            msg.reply("Incorrect request body.  Please ensure that the input arguments are correct.");
            utils.botLogs(globals,  "----incorrect request body");
            return;
        }
        var target = content.substr(0, content.indexOf(' ')).trim();
        var targetRole = content.substr(content.indexOf(' ')+1).trim();
        utils.botLogs(globals,  "----target:: "+target+"\n----targetRole:: "+targetRole);
        var server = msg.guild;

        var server_roles = await server.roles.fetch();
        utils.botLogs(globals,  "--verifying role is valid");
        var role = server_roles.cache.find(_role => _role.name.toLowerCase() === targetRole.toLowerCase());
        if ( !role ){
            utils.botLogs(globals,  "----invalid role ::  "+targetRole);
            msg.reply("Invalid role -> "+targetRole);
            return;
        }
        var role = await server.roles.fetch(role.id); //for cache
        
        var noReaction = {}; 
        var members = [];
        utils.botLogs(globals,  "--fetching users with role ["+role.name+":"+role.id+"]");
        for (member of role.members.values()){
            var member = await server.members.fetch(member);
            members.push(member.id);
            noReaction[member.id] = true; //later updated to false if member has reacted
        }
        utils.botLogs(globals,  "----complete");

        utils.botLogs(globals,  "--fetching message ["+target+"]");
        if (! target.startsWith("https://discordapp.com/channels/")){
            utils.botLogs(globals,  "----invalid message link"+target);
            msg.reply("Invalid message link: ["+target+"]");
            return;
        }
        var ids = target.substring("https://discordapp.com/channels/".length).split("/");
        var server_id = ids[0];
        var channel_id = ids[1];
        var message_id = ids[2];
        var server = client.guilds.resolve(server_id);  //not really neccessary, could use `msg.guild` for more restrictive use
        if( !server){
            utils.botLogs(globals,  "----server could not be resolved from id "+server_id);
            msg.reply("Server could not be resolved from id "+server_id)
            return;
        }
        var channel = server.channels.resolve(channel_id);
        if (!channel){
            utils.botLogs(globals,  "----channel could not be resolved from id "+channel_id);
            msg.reply("Channel could not be resolved from id "+channel_id)
            return;
        }
        var message = await channel.messages.fetch(message_id) //NOTE: currently only messages have links, if others have links then need to type check channel type
        .catch(err => {
            utils.botLogs(globals,  err);
            msg.reply("Couldn't fetch message from id "+message_id);
            return;
        });
        if (message.deleted){
            utils.botLogs(globals,  "----message "+message.id+" DELETED");
            msg.reply("Message with id ["+message_id+"] had been deleted")
        } 
        else {
            var msg_reacts = message.reactions.cache.values(); //doesn't fetch reaction users
            utils.botLogs(globals,  "\n\nmessage ["+message.id+"] reactions");
            
            var date = utils.getDateTimeString(globals);
            var reacts_title = role.name+" reacts "+date+"  "+channel.name+"/"+message.id;

            const fetchUsers = async (globals, msg, message, msg_reacts, reacts_title, members, noReaction) => {  //declare the func, then later need to call it
                var list = [];
                var longest_col = 0;
                for (msg_react of msg_reacts){
                    var col = [];
                    try{
                        var emote = msg_react.emoji.name+":"+msg_react.emoji.id;
                        col.push(emote);
                        utils.botLogs(globals,  "  "+emote);
                        var _react_users = await msg_react.users.fetch();
                        var react_users = _react_users;
                        for (memberID of members){
                            var member = message.guild.members.resolve(memberID);
                            var hasReacted = react_users.has(memberID);
                            if(hasReacted){
                                utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator);
                                col.push(member.displayName+"#"+member.user.discriminator);
                            }
                            noReaction[memberID] = ((!hasReacted) && noReaction[memberID]); //only true if NOT hasReacted for all reactions
                        }
                    } catch (err){
                        utils.botLogs(globals,  err.stack);
                        msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
                        return;
                    }
                    longest_col = Math.max(longest_col, col.length);
                    list.push(col);
                }

                /* print out members without reaction and insert col to doc */
                utils.botLogs(globals,  "\n\nUsers without reaction");
                var col = [];
                col.push("No Reaction");
                var noReacts = Object.keys(noReaction).filter(memberID => noReaction[memberID] == true); // only get the ones that didnt react
                for (memberID of noReacts){
                    var member = await server.members.fetch(memberID);
                    col.push(member.displayName+"#"+member.user.discriminator);
                    utils.botLogs(globals,  "      "+member.displayName+"#"+member.user.discriminator);
                }
                longest_col = Math.max(longest_col, col.length);
                list.push(col);

                /**  create new sheet and dump info  **/
                dumpToSheet(msg, globals, reacts_title, list, 0, longest_col, 0, list.length);

            }
            await fetchUsers(globals, msg, message, msg_reacts, reacts_title, members, noReaction);
        }
    },







    /*
    createAttendanceSheet: async function (globals, msg, content){
        //create a sheet with the first column being a list of member names, then return the sheet ID
        var doc = globals.doc;
        var client = globals.client;
        
    },




    insertReactAttendance: async function (globals, msg, content){
        var doc = globals.doc;
        var client = globals.client;
        
        await doc.loadInfo();
        //parse for the ID, obtain the new info to insert, find a column to insert the data 
        //var sheet = doc.sheetsById[sheetID];
    },




    insertVoiceAttendance: async function (globals, msg, content){
        var doc = globals.doc;
        var client = globals.client;
        
        await doc.loadInfo();
        //parse for the ID, obtain the new info to insert, find a column to insert the data
        //var sheet = doc.sheetsById[sheetID];
    }*/
}