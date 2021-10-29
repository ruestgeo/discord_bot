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
const fs = require('fs'); 

const outputPath = "./_output/";


module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "**--channel-dump**  ->  *number_of_messages*  channel_id **/** name **/** *message_link*\n" +
            ".     *given a number of messages to fetch, dumps the latest messages to a text file in the _output folder and attaches that file to a reply message*\n"+
            ".     *if a message link is given then it will fetch the amount messages before that given message (including that message) *\n"+
            ".     *(max value of 9999)*",



    func: async function (globals, msg, content){ 
        let client = globals.client;
        let server = await msg.guild.fetch();
        let server_members = await server.members.fetch();
        let server_roles = await server.roles.fetch();
        
        let amount = parseInt( content.substr(0, content.indexOf(' ')).trim() );
        let target = content.substr(content.indexOf(' ')+1).trim();
        let before_message = null;
        let textChannel;

        if ( isNaN(amount) || amount > 9999 ){
            utils.botLogs(globals,  "----incorrect amount: "+amount);
            throw ("Invalid number of messages, please provide a number below 10'000");
        }

        if ( target.startsWith("https://discordapp.com/channels/") || target.startsWith("https://discord.com/channels/") ){
            utils.botLogs(globals,  "--fetching message ["+target+"]");
            var ids = target.startsWith("https://discordapp.com/channels/") ? target.substring("https://discordapp.com/channels/".length).split("/") : target.substring("https://discord.com/channels/".length).split("/");
            var server_id = ids[0];
            var channel_id = ids[1];
            var message_id = ids[2];
            
            if( server_id !== server.id ){
                utils.botLogs(globals,  "----cannot fetch message across servers");
                throw ("Cannot fetch message across servers.\nPlease use this command in the same server as the channel you wish to dump messages from.");
            }
            var channel = server.channels.resolve(channel_id);
            if ( !channel ){
                utils.botLogs(globals,  "----channel could not be resolved from id "+channel_id);
                throw ("Channel could not be resolved from id "+channel_id);
            }
            var message = await channel.messages.fetch(message_id)
            .catch(err => {
                utils.botLogs(globals,  err.stack);
                throw (err);
            });
            if (message.deleted){
                utils.botLogs(globals,  "----message "+message.id+" DELETED");
                throw ("Message with id ["+message_id+"] had been deleted");
            } 
            before_message = message;
            textChannel = channel;
        }
        else {
            utils.botLogs(globals,  "--resolving text channel ["+target+"]");
            textChannel = server.channels.resolve(target);
            if ( !textChannel && (target.startsWith("<#") && target.endsWith(">")) ) { //cant resolve links/tags for whatever reason
                target = target.substring(2, target.length-1);
                textChannel = server.channels.resolve(target);
            }
            if (!textChannel){
                utils.botLogs(globals,  "--resolving channel by name");
                if (content.startsWith("`")){
                    target = content.substring(1, content.indexOf("`",1)+1).trim();
                }
                textChannel = server.channels.cache.find(_channel => _channel.name === target);
                if (!textChannel) throw ("Could not find text channel ["+target+"] in server");
            }
        }

        if (textChannel.type !== "text"){
            throw new Error("Incorrect given text channel.  Given channel ["+target+"] is type: '"+textChannel.type+"'");
        }
        utils.botLogs(globals,"----channel resolved");
        let link_prefix = "https://discord.com/channels/"+server.id+"/"+textChannel.id+"/";

        
        /* create _out dir if not exist, create output file */
        let outputName_base = server.name+"-"+textChannel.name+"_messages-"+amount+"_recent";
        let outputName = outputName_base+".txt";
        if ( !fs.existsSync(outputPath) ){
            utils.botLogs(globals, "--creating ["+outputPath+"] dir(s)");
            fs.mkdirSync(outputPath, { recursive: true });
        }
        let duplNum = 1;
        utils.botLogs(globals, "--creating dump file");
        while ( fs.existsSync(outputPath+outputName) ){
            utils.botLogs(globals, "----name \""+outputName+"\" is already taken, attempting to generate new name");
            outputName = outputName_base+"--(file"+duplNum+").txt";
            duplNum++;
        }
        let filepath = outputPath+outputName;
        fs.writeFileSync(filepath, "Messages from the  ["+textChannel.name+"]  channel (id: "+textChannel.id+")  from the  ["+server.name+"]  discord server\n\n\n");
        utils.botLogs(globals, "--file created in ["+outputPath+"]:  "+outputName);
        
        let amount_remaining = amount;

        if (before_message){
            let message = before_message;
            amount_remaining--; 
            utils.botLogs(globals, "--dumping initial message "+link_prefix+message.id);
            let authorResolved = message.guild.members.resolve(message.author.id);
            fs.appendFileSync(filepath, 
                "Author:  "+message.author.username+"#"+message.author.discriminator+(authorResolved ? "  ["+authorResolved.displayName+"]" : "")+"  (id:"+message.author.id+")\n"+
                "Date:  "+message.createdAt.toString()+"\n"+
                "Attachments:  ["+[...message.attachments.values()].map(attachment => attachment.url).join(", ")+"]\n"+
                "Message:  "+link_prefix+message.id+"\n"+
                "------------------------------\n"+
                parseContent(message)+"\n"+ //message.content+"\n"+
                "==============================\n\n\n"
            );

        }

        /* dump messages in segments of 100 */
        utils.botLogs(globals,"--fetching messages ("+amount+")")
        let earliest_message = before_message ? before_message : null; //earliest in the segment
        while (amount_remaining > 100){
            amount_remaining -= 100;
            utils.botLogs(globals,"--fetching 100 messages;  remaining: "+amount_remaining);
            earliest_message = await dump_messages(globals, filepath, textChannel, 100, earliest_message);
        }
        earliest_message = await dump_messages(globals, filepath, textChannel, amount_remaining, earliest_message);

        /* post the output file in reply */
        msg.reply("Request complete; obtained messages between and including "
                +(before_message ? link_prefix+before_message.id : "*most recent message*")
                +" and "+link_prefix+earliest_message.id, 
            { files: [filepath] }
        );
    }
}

async function dump_messages(globals, filepath, channel, amount, before_msg){
    let messages;
    let link_prefix = "https://discord.com/channels/"+channel.guild.id+"/"+channel.id+"/";
    if ( !before_msg )   messages = await channel.messages.fetch({ limit: amount }).catch(err => {throw (err);});
    else   messages = await channel.messages.fetch({ limit: amount , before: before_msg.id }).catch(err => {throw (err);});

    messages = messages.sort(function(a, b){return b.createdTimestamp - a.createdTimestamp})
    .each(message => { //write to file
        
        utils.botLogs(globals, "----dumping message "+link_prefix+message.id);
        let authorResolved = message.guild.members.resolve(message.author.id);
        fs.appendFileSync(filepath, 
            "Author:  "+message.author.username+"#"+message.author.discriminator+(authorResolved ? "  ["+authorResolved.displayName+"]" : "")+"  (id:"+message.author.id+")\n"+
            "Date:  "+message.createdAt.toString()+"\n"+
            "Attachments:  ["+[...message.attachments.values()].map(attachment => attachment.url).join(", ")+"]\n"+
            "Message:  "+link_prefix+message.id+"\n"+
            "------------------------------\n"+
            parseContent(message)+"\n"+ //message.content+"\n"+
            "==============================\n\n\n"
        );
    });
    return messages.last();
}

function parseContent (message){
    let content = message.content;
    let occurences = [];
    let replacements = {};
    let pos = content.indexOf("<@");
    if (pos > -1)  occurences.push(pos);
    while ( pos > -1 ){
        pos = content.indexOf("<@", pos+1);
        if (pos > -1)  occurences.push(pos);
    }
    for (let pos of occurences){
        let temp = content.substring( pos, content.indexOf(">", pos)+1 ).trim();
        let id = null;
        let replacement = null;
        if (temp.startsWith("<@&")){
            //resolve role or <@deleted role; id>
            id = temp.substring(3, temp.length-1);
            let role = message.guild.roles.resolve(id);
            replacement = role ? "<role@"+role.name+" : "+role.id+">" : "<@unknown role : "+id+">";
        }
        else if (temp.startsWith("<@")){
            //try to resolve, or <@unknown user; id>
            id = temp.substring(temp.startsWith("<@!") ?3:2, temp.length-1);
            let member = message.guild.members.resolve(id);
            replacement = member ? "<@"+member.displayName+"#"+member.user.discriminator+" : "+member.id+">" : "<@unknown user : "+id+">";
        }
        else   continue;
        replacements[temp] = replacement;
    }
    for (let to_replace in replacements){
        content = content.replace(to_replace, replacements[to_replace]);
    }
    return content;
}









