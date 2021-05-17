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
const Discord = require('discord.js');

const outputPath = "./_output/";


module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "**--channel-dump-to-channel**  ->  *integer_amount_of_messages*  *source_message_link*  *destination_message_link*\n" +
            ".     *given a number of messages to fetch, a source message link, and a destination message link (a simple anchor), duplicate the content of the specified amount of messages from the source into the destination channel*\n"+
            ".     *the amount of messages to be fetched will be those before and including the source message from the provided link*\n"+
            ".     *(max amount of 100)*",



    func: async function (globals, msg, content){ 
        let client = globals.client;
                
        let args = content.split(" ").map(elem => elem.trim());
        let amount = parseInt( args[0] );
        let source = args[1];
        let destination = args[2];
        let before_message = null;
        let srcChannel;
        let dstChannel;
        let srcServer;
        let dstServer;

        
        if ( isNaN(amount) || amount > 100 ){
            utils.botLogs(globals,  "----incorrect amount: "+amount);
            throw ("Invalid number of messages, please provide a number below or equal to 100");
        }

        /* fetch source channel via link */
        if ( source.startsWith("https://discordapp.com/channels/") || source.startsWith("https://discord.com/channels/") ){
            utils.botLogs(globals,  "--fetching message ["+source+"]");
            var ids = source.startsWith("https://discordapp.com/channels/") ? source.substring("https://discordapp.com/channels/".length).split("/") : source.substring("https://discord.com/channels/".length).split("/");
            var server_id = ids[0];
            var channel_id = ids[1];
            var message_id = ids[2];
            var server = client.guilds.resolve(server_id);
            if( !server ){
                utils.botLogs(globals,  "----[Source] server could not be resolved from id "+server_id);
                throw ("[Source] Server could not be resolved from id "+server_id);
            }
            var channel = server.channels.resolve(channel_id);
            if ( !channel ){
                utils.botLogs(globals,  "----[Source] channel could not be resolved from id "+channel_id);
                throw ("[Source] Channel could not be resolved from id "+channel_id);
            }
            var message = await channel.messages.fetch(message_id)
            .catch(err => {
                utils.botLogs(globals,  err.stack);
                throw (err);
            });
            if (message.deleted){
                utils.botLogs(globals,  "----[Source] message "+message.id+" DELETED");
                throw ("[Source] Message with id ["+message_id+"] had been deleted");
            } 
            before_message = message;
            srcChannel = channel;
            srcServer = server;
        }
        else {
            throw ("Invalid input, please provide a message link for the source");
        }
        if ( srcChannel.type !== "text" ){
            throw new Error("Incorrect given source text channel.  Given channel ["+source+"] is type: '"+srcChannel.type+"'");
        }
        utils.botLogs(globals,"----src channel resolved");


        /* fetch destination channel via link */
        if ( destination.startsWith("https://discordapp.com/channels/") || destination.startsWith("https://discord.com/channels/") ){
            utils.botLogs(globals,  "--fetching message ["+destination+"]");
            var ids = destination.startsWith("https://discordapp.com/channels/") ? destination.substring("https://discordapp.com/channels/".length).split("/") : destination.substring("https://discord.com/channels/".length).split("/");
            var server_id = ids[0];
            var channel_id = ids[1];
            var message_id = ids[2];
            var server = client.guilds.resolve(server_id);
            if( !server ){
                utils.botLogs(globals,  "----[Destination] server could not be resolved from id "+server_id);
                throw ("[Destination] Server could not be resolved from id "+server_id);
            }
            var channel = server.channels.resolve(channel_id);
            if ( !channel ){
                utils.botLogs(globals,  "----[Destination] channel could not be resolved from id "+channel_id);
                throw ("[Destination] Channel could not be resolved from id "+channel_id);
            }
            var message = await channel.messages.fetch(message_id)
            .catch(err => {
                utils.botLogs(globals,  err.stack);
                throw (err);
            });
            if (message.deleted){
                utils.botLogs(globals,  "----[Destination] message "+message.id+" DELETED");
                throw ("[Destination] Message with id ["+message_id+"] had been deleted");
            } 
            dstChannel = channel;
            dstServer = server;
        }
        else {
            throw ("Invalid input, please provide a message link for the destination");
        }
        if ( dstChannel.type !== "text" ){
            throw new Error("Incorrect given destination text channel.  Given channel ["+destination+"] is type: '"+dstChannel.type+"'");
        }
        utils.botLogs(globals,"----dst channel resolved");


        let src_link_prefix = "https://discord.com/channels/"+srcServer.id+"/"+srcChannel.id+"/";
        let dst_link_prefix = "https://discord.com/channels/"+dstServer.id+"/"+dstChannel.id+"/";
        
        /* dump each message */
        utils.botLogs(globals,"----fetching message cache from src channel and dumping to dst channel");
        amount--; //the source message is done separately
        let messages;
        if ( amount > 0 ){
            messages = await srcChannel.messages.fetch({ limit: amount , before: before_message.id }).catch(err => {throw (err);});
            messages = messages.sort(function(a, b){return a.createdTimestamp - b.createdTimestamp})
            .each(async (message) => {
                if ( !message.deleted ){
                    utils.botLogs(globals, "----dumping message "+src_link_prefix+message.id);
                    if (message.content.trim() !== "")   await dstChannel.send(message.content).catch(err => {utils.botLogs(globals, "----ERROR: "+err)});
                    if ( message.embeds.length > 0 ){
                        for (let embed of message.embeds){
                            let cloneEmbed = new Discord.MessageEmbed(embed);
                            await dstChannel.send(cloneEmbed).catch(err => {utils.botLogs(globals, "----ERROR: "+err)});
                        }
                    }
                    if ( message.attachments.size > 0 )   await dstChannel.send("__**Attachments:**__  \n"+[...message.attachments.values()].map(attachment => attachment.url).join("\n")).catch(err => {utils.botLogs(globals, "----ERROR: "+err)});
                }
                else {
                    utils.botLogs(globals, "----skipped message "+src_link_prefix+message.id);
                }
            });
        }
        if (before_message.content.trim() !== "")   await dstChannel.send(before_message.content).catch(err => {utils.botLogs(globals, "----ERROR: "+err)});
        if ( before_message.embeds.length > 0 ){
            for (let embed of before_message.embeds){
                let cloneEmbed = new Discord.MessageEmbed(embed);
                await dstChannel.send(cloneEmbed).catch(err => {utils.botLogs(globals, "----ERROR: "+err)});
            }
        }
        if ( message.attachments.size > 0 )   await dstChannel.send("__**Attachments:**__  \n"+[...message.attachments.values()].map(attachment => attachment.url).join("\n")).catch(err => {utils.botLogs(globals, "----ERROR: "+err)});

        /* post the output file in reply */
        msg.reply("Request complete; dumped messages from \n"+
            "__["+srcServer.name+"]__ **"+srcChannel.name+"** between (latest) __<"+source+">__ and (earliest) __"+(amount > 0 ? "<"+src_link_prefix+messages.last().id+">" : "*\\*same as latest\\**")+"__\nto\n"+
            "__["+dstServer.name+"]__ **"+dstChannel.name+"** __<"+dst_link_prefix+">__"
        );
    }
}







