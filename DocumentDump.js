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

//const utils = require('./utils.js');

const dumpToSheet = async (msg, doc, sheet_title, list, rowStart, rowEnd, colStart, colEnd) => {
    const sheet = await doc.addSheet({ title: sheet_title });
    await sheet.loadCells({
        startRowIndex: rowStart, endRowIndex: rowEnd, startColumnIndex: colStart, endColumnIndex: colEnd
    });
    
    for (var i=colStart; i<colEnd; i++){ //load headers with bold
        const cell = sheet.getCell(rowStart, i); 
        cell.textFormat = { bold: true };
        cell.value = list[i][0];
    }
    for (var j=rowStart+1; j<rowEnd; j++){ //row
        for (var i=colStart; i<colEnd; i++){ //load headers with bold
            const cell = sheet.getCell(j, i);
            cell.value = list[i][j];
        }
    }
    await sheet.saveUpdatedCells();  // save all updates in one call
    msg.reply("Data has been dumped to doc");
}

module.exports = {
    documentVoice: async function (doc, client, msg, content){
        console.log("--fetching channel ["+content+"]");
        client.channels.fetch(content.trim())
        .then(channel => {
            var voice_members = channel.members.values();
            var date = new Date(); //console.log(date.toISOString());
            //var channel_title = channel.type+" channel ["+channel.name+":"+channel.id+"] "+date.toUTCString();
            var channel_title = channel.type+" channel ["+channel.name+"] "+date.toUTCString();
            console.log("\n\n"+channel_title);
            var list = [];
            var col = [];
            col.push("#"+channel.name);
            for (member of voice_members){
                console.log("  "+member.displayName+"#"+member.user.discriminator+":"+member.id);
                col.push(member.displayName+"#"+member.user.discriminator);
            }
            list.push(col);

            /**  create new sheet and dump info  **/
            dumpToSheet(msg, doc, channel_title, list, 0, col.length, 0, 1);

        })
        .catch(err => {
            console.log(err.stack)
            msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
        });
        
    },


    documentReactions: async function (doc, client, msg, content){
        // https://discordapp.com/channels/<server>/<channel>/<message>
        content = content.trim();
        console.log("--fetching message ["+content+"]");
        if (! content.startsWith("https://discordapp.com/channels/")){
            console.log("----invalid message link"+content);
            msg.reply("Invalid message link: ["+content+"]");
            return;
        }
        var ids = content.substring("https://discordapp.com/channels/".length).split("/");
        var server_id = ids[0];
        var channel_id = ids[1];
        var message_id = ids[2];
        var server = client.guilds.resolve(server_id);
        if( !server){
            console.log("----server could not be resolved from id "+server_id);
            msg.reply("Server could not be resolved from id "+server_id)
            return;
        }
        var channel = server.channels.resolve(channel_id);
        if (!channel){
            console.log("----channel could not be resolved from id "+channel_id);
            msg.reply("Channel could not be resolved from id "+channel_id)
            return;
        }
        await channel.messages.fetch(message_id) //NOTE: currently only messages have links, if others have links then need to type check channel type
        .then(message => {
            if (message.deleted){
                console.log("----message "+message.id+" DELETED");
                msg.reply("Message with id ["+message_id+"] had been deleted")
            } 
            else {
                //console.log(message);
                var msg_reacts = message.reactions.cache.values();
                
                console.log("\n\nmessage ["+message.id+"]");
                var date = new Date();
                var reacts_title = "reacts "+date.toUTCString()+"  "+channel.name+"/"+message.id;
                const fetchUsers = async (doc, msg, message, msg_reacts) => { //declare the func, then later need to call it
                    var list = [];
                    var longest_col = 0;
                    for (msg_react of msg_reacts){
                        var col = [];
                        try{
                            var emote = msg_react.emoji.name+":"+msg_react.emoji.id;
                            col.push(emote);
                            console.log("  "+emote);
                            var _react_users = await msg_react.users.fetch();
                            var react_users = _react_users.values();
                            for (user of react_users){
                                var display_name = message.guild.members.resolve(user.id).displayName+"#"+user.discriminator;
                                col.push(display_name);
                                console.log("      "+display_name+":"+user.id);
                            }
                        } catch (err){
                            console.log(err.stack);
                            msg.reply("An error occurred, couldn't complete the request\n`"+err+"`");
                            return;
                        }
                        longest_col = Math.max(longest_col, col.length);
                        list.push(col);
                    }

                    /**  create new sheet and dump info  **/
                    dumpToSheet(msg, doc, reacts_title, list, 0, longest_col, 0, list.length);

                }
                fetchUsers(doc, msg, message, msg_reacts);
            }
        })
        .catch(err => {
            console.log(err);
            msg.reply("Couldn't fetch message from id "+message_id)
        });
    }
}