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

// Do NOT import this file nor modify (unless bugged or upgrading)
//  import utils.js for any required utility functions



const Discord = require('discord.js');
const { ChannelType } = require('discord.js');

const { Globals } = require('./_typeDef');
const { url_prefix } = require('./_const.js');
const logging = require('./BotLogging.js');


//#region Status

/** Change the status text of the bot 
 * @param {Discord.Client} client
 * @param {Discord.PresenceStatusData} status
 * @param {String} text the name of the activity
 * @param {Discord.ActivityType | Number} type the type of activity
 * @throws {Error} if an error occured when changing the bot status
*/
async function change_status (client, status, text, type){ //type is optional, defaults to PLAYING
    if (!type) type = "PLAYING";
    try{ client.user.setPresence({ activities: [{ name: text, type: type }], status: status }) }
    catch (err) {
        console.log("## err ::  "+err); 
        throw new Error("An error occured when changing bot status");
    };
}

//#endregion Status
module.exports.change_status = change_status;



//#region Boolean

/** Return whether a member (obj) has a specific role (id)
 * @param {Discord.GuildMember} member the member to check
 * @param {Discord.Snowflake} role_id the role ID
 */
 async function memberHasRole (member, role_id){
    member =  await member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
    return member.roles.cache.has(role_id);
}


/** @param {Discord.Message} msg  */
function isEphemeral (msg){
    return msg.flags.has(Discord.MessageFlags.FLAGS.EPHEMERAL);
}

//#endregion Boolean
module.exports.memberHasRole = memberHasRole;
module.exports.isEphemeral   = isEphemeral;



//#region Message
/**
 * Return a link to the given discord message
 * @param {Discord.Message} message a discord message object
 * @returns {String} link to the discord message
 */
function getMessageLink (message){
    return url_prefix+message.guild.id+"/"+message.channel.id+"/"+message.id;
}


/** Post a message in the same channel as a given message, the content which is split into parts if exceeding 2000 char
 * @param {Discord.Message} msg a message in the desired channel to post a new message to
 * @param {String} content the content of the message to send
 * @return  {Discord.Message} the posted message, or final message if the message is split into multiple due to character limit
*/
async function sendMessage (msg, content, reply){
    if ( !reply ) reply = false;
    let last_msg = (reply ? 
        await msg.reply({content: content, split: true}) :
        await msg.channel.send({content: content, split: true}) );
    if (Array.isArray(last_msg)) last_msg = last_msg[last_msg.length-1];
    return last_msg;
}
/** Post a message in a channel, the content of which is split into parts if exceeding 2000 char 
 * @param {Discord.TextChannel | Discord.NewsChannel | Discord.DMChannel} channel the channel to send the message content to
 * @param {String} content the content of the message to send
 * @return  {Discord.Message} the posted message, or final message if the message is split into multiple due to character limit
*/
async function messageChannel (channel, content){
    return await channel.send({content: content, split: true});
}


/**
 * Create a fake message object (one with no message id)
 ** If a messageID is provided then the created message will contain that id
 ----
 ** Do not attempt to edit, delete, react, reply, or call any Message methods on the created message.
 * @param {Discord.Client} client 
 * @param {Discord.Snowflake} channelID 
 * @param {Discord.Snowflake} serverID 
 * @param {Discord.Snowflake|""|undefined} [messageID] optionally can add a message id to target an existing message
 * @param {String} content 
 * @returns {Promis<Discord.Message|null>}
 */
async function createFakeMessage (client,channelID,serverID, content, messageID){
    let server = client.guilds.resolve(serverID);
    if (!server) return null;
    /** @type {Discord.TextBasedChannel} */
    let channel = server.channels.resolve(channelID);
    if (!channel) return null;
    let message = messageID === "" ? null : await channel.messages.fetch(messageID); //check if provided valid messageID
    //messageID = message?.id ?? null; //check if valid id
    messageID = message?.id ?? Discord.SnowflakeUtil.generate(Date.now()); //generate a snowflake to use if it doesn't exist
    
    //option 1:  create a new Discord.Message (might cache)
    // -- message cannot be replied to if invalid messageID
    // -- if message is fake and cached then reacting will throw an error (likely the same for edit/fetch/delete/ ...)
    /*
    let msg = new Discord.Message(client, {
        id: messageID,
        channel_id: channelID,
        guild_id: serverID,
        type: 0,
        content: content,
        author: {id: client.user.id},
        //bare minimum msg.data, other values are null or some form of empty collection
        webhook_id: message ? null : true, //prevents some caching if defined
    });
    if (message) await channel.messages.fetch({message: messageID, force: true, cache: true}); //force fetch the real message to fix any bad caching
    //else if (!message) channel.messages.cache.set(messageID, msg); //to add fake message to the cache
    console.log(channel.messages.resolve(messageID));
    return msg;
    */

    //option 2: deepfake a message via Object
    //*
    let token = serverID+"/"+channelID+(messageID ? "/"+messageID : "");
    let replyFunc = message ? async (args) => { return channel.send({content: args, reply:{messageReference: messageID}})} : async (args) => { return channel.send(args) };
    let reactions = message ? message.reactions : null; //might encounter errors
    let mentions = message ? message.mentions : null; //might encounter errors
    let createdTimestamp = message ? message.createdTimestamp : Date.now().toString;
    let msg = {
        constructor: {name: "Message"},
        client: client,
        type: 0,
        content: content,
        author: client.user,
        member: server.members.resolve(client.user.id),
        id: messageID,
        channelId: channelID,
        channel: channel,
        guildId: serverID,
        guild: server,

        webhookId: null,
        applicationId: null,
        activity: null,
        nonce: null,
        editedTimestamp: null,
        createdTimestamp: createdTimestamp,
        groupActivityApplication: null,
        reference: null,
        interaction: null,
        
        flags: new Discord.MessageFlagsBitField(),//BitField(), MessageFlags
        pinned: false,
        tts: false,
        editable: false,
        deletable: false,
        pinnable: false,
        crosspostable: false,
        hasThread: false,
        partial: true,
        system: false, 
        url: "https://discord.com/channels/"+token,

        embeds: [],
        components: [],
        attachments: new Discord.Collection(),
        stickers: new Discord.Collection(),
        reactions: reactions,
        mentions: mentions,

        reply: replyFunc,
        react: async (emote) => {console.log("[fakeMessage_"+(message?"":"fake*")+messageID+"] attempted reacted with: "+emote)},
        edit: async (content) => { console.log("[fakeMessage_"+(message?"":"fake*")+messageID+"] attempted edit with ::  "+content) },
        delete: async _ => { console.log("[fakeMessage_"+(message?"":"fake*")+messageID+"] attempted delete") },
        fetch: async _ => { console.log("[fakeMessage_"+(message?"":"fake*")+messageID+"] attempted fetch") },
    }
    return msg;
    //*/
}

//#endregion Message
module.exports.getMessageLink    = getMessageLink;
module.exports.sendMessage       = sendMessage;
module.exports.messageChannel    = messageChannel;
module.exports.createFakeMessage = createFakeMessage;



//#region MessageUtils

/** Disable components on an editable message.
 * @param {Discord.Message} msg
 * @param {String[]} [customIDs] (optional) if provided, disable only the components with the provided customIDs
 */
async function disableComponents (msg, customIDs){
    if ( !msg.editable ) return;
    let actionRows = await getDisabledComponents(msg, customIDs);
    await msg.edit({content: msg.content, components: actionRows});
}


/** Return an array of disabled components on an editable message.
 * @param {Discord.Message} msg
 * @param {String[]} [customIDs] (optional) if provided, disable only the components with the provided customIDs
 * @returns {Discord.ActionRowBuilder[]|void}
 */
function getDisabledComponents (msg, customIDs){
    if ( !msg.editable ) return;
    return msg.components.map(  actionRow => {
        actionRow.components.map(component =>  {
            if (customIDs?.includes(component.customId) ?? true)
                Discord.ButtonBuilder.from(component).setDisabled(true);
            return component;
        }); 
        return actionRow;
    }  );
}

//#endregion MessageUtils
module.exports.disableComponents     = disableComponents;
module.exports.getDisabledComponents = getDisabledComponents;



//#region Get, Fetch, Resolve

//#region Server

/**
 * Resolve the server by id
 * @param {Globals} globals 
 * @param {String} targetServer the target server ID
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @returns {Discord.Guild} the resolved server (Discord.Guild), or throws an error if unable to resolve
 * @throws {Error} if cannot resolve
 */
function resolveServer (globals, targetServer, log, log_prefix){
    if (log)  logging.log(globals,  (log_prefix ? log_prefix : "")+"--resolving target server ["+targetServer+"]");
    let server = globals.client.guilds.resolve(targetServer);
    if (!server) throw ("Could not find server ["+targetServer+"] in the bot cache");
    return server;
}


/**
 * Fetch the server by id
 * @param {Globals} globals 
 * @param {String} targetServer the target server ID
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @returns {Discord.Guild} the resolved server (Discord.Guild), or throws an error if unable to resolve
 * @throws {Error} if cannot resolve
 */
async function fetchServer (globals, targetServer, log, log_prefix){
    if (log)  logging.log(globals,  (log_prefix ? log_prefix : "")+"--resolving target server ["+targetServer+"]");
    let server = await globals.client.guilds.fetch(targetServer);
    if (!server) throw ("Invalid server:  Could not find server ["+targetServer+"] in the list of bot servers");
    return server;
}

//#endregion Server



//#region Channel

/**
 * Resolve the channel (in the provided server) by id, name, or link/mention;  if case-sensitive name match is not found, any case-insensitive matches will be returned
 * @param {Globals} globals 
 * @param {String} targetChannel the target ID, name, or link/mention
 * @param {Discord.GuildChannelManager} server_channels the server_channels, the server of which should be fetched prior to calling this function
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @returns {Discord.TextChannel | Discord.VoiceChannel | Discord.CategoryChannel | Discord.NewsChannel | Discord.StoreChannel | Discord.DMChannel} the resolved channel (Discord.GuildChannel), or throws an error if unable to resolve
 * @throws {Error} if cannot resolve
 */
function resolveChannel (globals, targetChannel, server_channels, log, log_prefix){
    if (log)  logging.log(globals,  (log_prefix ? log_prefix : "")+"--resolving target channel ["+targetChannel+"]");
    if ( targetChannel.startsWith("<#") && targetChannel.endsWith(">") ){
        targetChannel = targetChannel.substring( (isNaN(targetChannel.charAt(2)) ? 3 : 2), targetChannel.length-1);
    }
    let channel = server_channels.resolve(targetChannel);
    if ( !channel ){
        channel = server_channels.cache.find(_channel => _channel.name === targetChannel);
    }
    if ( !channel ){
        channel = server_channels.cache.find(_channel => _channel.name.toLowerCase() === targetChannel.toLowerCase()); 
    }
    if ( !channel ) throw ("Could not find channel ["+targetChannel+"] in server");
    return channel;
}


/**
 * Fetch the channel by id
 * @param {Globals} globals 
 * @param {String} channelID the target ID
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @returns {Discord.TextChannel | Discord.VoiceChannel | Discord.CategoryChannel | Discord.NewsChannel | Discord.StoreChannel} the resolved channel (Discord.GuildChannel), or throws an error if unable to resolve
 * @throws {Error} if cannot resolve
 */
async function fetchChannel (globals, channelID, log, log_prefix){
    if (log)  logging.log(globals,  (log_prefix ? log_prefix : "")+"--fetching target channel ["+channelID+"]");
    let channel = await globals.client.channels.fetch(channelID);
    if ( !channel ) throw ("Could not find channel ["+channelID+"] in server");
    return channel;
}

//#endregion Channel



//#region Role

/**
 * Resolve the role (in the provided server) by id, name, or link/mention
 * @param {Globals} globals 
 * @param {String} targetRole the target ID, name, or link/mention
 * @param {Discord.RoleManager} server_roles the server_roles, which should already be fetched prior to calling this function
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @returns {Discord.Role} the resolved role, or throws an error if unable to resolve
 * @throws {Error} if cannot resolve
 */
function resolveRole (globals, targetRole, server_roles, log, log_prefix){
    if (log)  logging.log(globals,  (log_prefix ? log_prefix : "")+"--resolving target role ["+targetRole+"]");
    if ( targetRole.startsWith("<@&") && targetRole.endsWith(">") ){
        targetRole = targetRole.substring( 3, targetRole.length-1);
    }
    let role = server_roles.get(targetRole);
    if ( !role ){
        role = server_roles.find(_role => _role.name === targetRole);
    }
    if ( !role ) throw ("Could not find role ["+targetRole+"] in server");
    return role;
}

//#endregion Role



//#region Member

/**
 * Resolve the member (in the provided server) by id, name, or link/mention
 * @param {Globals} globals 
 * @param {String} targetMember the target ID, name, or link/mention
 * @param {Discord.GuildMemberManager | Discord.Collection} server_members either the members Collection or the GuildMemberManager
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @returns {Discord.Member} the resolved member, or throws an error if unable to resolve
 * @throws {Error} if cannot resolve
 */
function resolveMember (globals, targetMember, server_members, log, log_prefix){
    if (log)  logging.log(globals,  (log_prefix ? log_prefix : "")+"--resolving target member ["+targetMember+"]");
    if ( targetMember.startsWith("<@") && targetMember.endsWith(">") ){
        targetMember = targetMember.substring( (isNaN(targetMember.charAt(2)) ? 3 : 2), targetMember.length-1);
    }
    let member;

    if (server_members instanceof Discord.GuildMemberManager){
        member = server_members.resolve(targetMember);
        if ( !member ){
            let discriminator = (targetMember.charAt(targetMember.length-5)==='#') ? targetMember.substring(targetMember.length-4) : null;
            let name = discriminator ? targetMember.substring(0, targetMember.length-5) : targetMember;
            member = server_members.cache.find(_member => (discriminator ? _member.user.discriminator === discriminator : true) && (_member.user.username === name || _member.displayName === name));
        }
        if ( !member ) throw ("Could not find member ["+targetMember+"] in server");
    }
    else if (server_members instanceof Discord.Collection){
        if ( !server_members.has(targetMember) ) {
            let discriminator = (targetMember.charAt(targetMember.length-5)==='#') ? targetMember.substring(targetMember.length-4) : null;
            let name = discriminator ? targetMember.substring(0, targetMember.length-5) : targetMember;
            member = server_members.find(_member => (discriminator ? _member.user.discriminator === discriminator : true) && (_member.user.username === name || _member.displayName === name));
            if (!member)   throw ("Could not find member ["+targetMember+"] in server");
        }
        else   return server_members.get(targetMember);
    }
    else  throw new Error("Invalid server_members instanceof");

    return member;
}

//#endregion Member



//#region Message

/**
 * Resolve a discord link, which may link to either a guild, channel, or message
 * @param {String} link the link to resolve IDs from, which may not be valid or may not link to either a guild, channel, or message
 * @throws {Error} if unable to resolve or an error occurs
 * @returns {[serverID: Discord.Snowflake, channelID: Discord.Snowflake, messageID: Discord.Snowflake]} an array of the resolved IDs
 */
function resolveLink (link){
    link = link.replace(/[<>]+/g, '');
    if ( !link.startsWith("https://discordapp.com/channels/") && !link.startsWith("https://discord.com/channels/"))
        return null;
    let ids = (link.startsWith("https://discordapp.com/channels/") ? 
        link.substring("https://discordapp.com/channels/".length).split("/") : 
        link.substring("https://discord.com/channels/".length).split("/"));
    return ids;
}


/**
 * Fetch a discord message from a provided link to a message
 * @param {Globals} globals 
 * @param {String} link the discord message link
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @throws {Error} if unable to resolve or an error occurs
 * @returns {Discord.Message|undefined} the resolved mesage, or throws an error if unable to resolve
 */
async function fetchMessageFromLink (globals, link, log, log_prefix){
    let ids = resolveLink(link);
    if ( !ids  ||  ids.length != 3 ) {  throw new Error("Invalid link");  }
    return await fetchMessage(globals,ids[0],ids[1],ids[2],log,log_prefix).catch(err => {throw(err);});
}


/**
 * Fetch the message given the server, channel, and message IDs
 * @param {Globals} globals 
 * @param {String} serverID 
 * @param {String} channelID 
 * @param {String} messageID 
 * @param {Boolean} log whether to print to botLogs
 * @param {String} log_prefix a prefix to add to the botLogs, if set
 * @throws {Error} if unable to resolve or an error occurs
 * @returns {Discord.Message|undefined} the resolved mesage, or undefined if messageID cannot resolve
 */
async function fetchMessage (globals, serverID, channelID, messageID, log, log_prefix){
    if (log)   logging.log(globals,  (log_prefix ? log_prefix : "")+"--fetching message");
    let server = globals.client.guilds.resolve(serverID);
    if ( !server ){  throw ("Server could not be resolved from id "+serverID);  }
    /** @type {Discord.TextBasedChannel} */
    let channel = server.channels.resolve(channelID);
    if (!channel){  throw ("Channel could not be resolved from id "+channelID);  }
    let message = await channel.messages.fetch(messageID)
    .catch(err => {
        if (log)   logging.log(globals,  err.stack);
        throw (err);
    });
    return message;
}


/**
 * Fetch an amount of messages from a channel
 * @param {Globals} globals 
 * @param {Discord.MessageManager} channel_messages the message manager of the channel to search
 * @param {Object} options an object describing various options
 * @param {String} options.before a messageID of which to use as a start point to fetch earlier messages
 * @param {Number} options.amount the amount of messages to fetch (defaults to 30)
 * @param {Boolean} options.forceAmount whether to forcefully get the full amount of messages that satisfy the requisites or just match among the amount
 * @param {Boolean} log whether to log or not
 * @throws {Error} if unable to resolve or an error occurs
 * @returns {Array<Discord.Message>} an array of discord messages
 */
async function fetchMessages (globals, channel_messages, options, log){
    let channel = channel_messages.channel;
    let fetchAmount = options.amount ? options.amount : 30;
    if (log) logging.log(globals,"--acquiring "+fetchAmount+" latest messages from  "+(channel.type === ChannelType.DM?"DM":channel.name)+"  id:"+channel.id+ "   type: "+channel.type);
    let messages = await channel.messages.fetch({ limit: fetchAmount }).catch(err => {throw (err);});
    messages = messages.sort(function (a, b){return a.createdTimestamp - b.createdTimestamp}); //ascending (earliest first, latest last)
    let last_message = messages.lastKey();
    let countFetches = 1;
    let countAmount = fetchAmount;
    if ( options.forceAmount ){
        while (messages.size < fetchAmount){
            if (log) logging.log(globals,"----fetching additional messages to force amount");
            let more_messages = await channel.messages.fetch({ limit: fetchAmount, before: last_message }).catch(err => {throw (err);});
            messages = messages.sort(function (a, b){return a.createdTimestamp - b.createdTimestamp}); //ascending (earliest first, latest last)
            last_message = more_messages.lastKey();
            messages = messages.concat(more_messages);
            countFetches++;
            countAmount += fetchAmount;
        }
    }
    if (log) logging.log(globals,"--fetched a total of "+countAmount+" messages through "+countFetches+" API calls, resulting in "+messages.size+" fetched undeleted messages");
    if (messages.size > fetchAmount)   return [...messages.first(fetchAmount)];
    return [...messages.values()]; 
}

//#endregion Message



//#region Voice

/**
 * Resolve all voice channels from an array of category or voice channel resolvables
 * @param {Globals} globals 
 * @param {Array} resolvables an array of voice channel or category resolvables
 * @param {Discord.Guild} server 
 * @param {Boolean} log whether to log or not
 * @returns {{voiceChannelNames: String, targetVoiceChannels: String[]}}
 * @throws {Error} if cannot resolve
 */
function resolveVoiceChannels (globals, resolvables, server, log){ 
    //  @returns {Object : { "voiceChannelNames": String, "targetVoiceChannels": Array<String>, "channels": Array<Discord.VoiceChannel> }}
    let voiceChannelNames;
    let targetVoiceChannels = [];
    //let channelHandles = [];
    let voiceNames = [];
    for (let target of  resolvables){
        let channel = resolveChannel(globals, target, server.channels, log);
        if (log)   logging.log(globals,  "--channel type:  "+channel.type);
        if ( channel.type === ChannelType.GuildCategory ){
            for (let _channel of [...channel.children.cache.filter(_channel => _channel.type === ChannelType.GuildVoice).values()]){
                voiceNames.push(_channel.name+":"+_channel.id);
                //channelHandles.push(_channel);
                targetVoiceChannels.push(_channel.id);
            }
            if (log)   logging.log(globals, "----found voice channels in category  ["+channel.name+"] ::  "+voiceNames);
        }
        else if ( channel.type === ChannelType.GuildVoice ){
            voiceNames.push(channel.name+":"+channel.id);
            //channelHandles.push(channel);
            targetVoiceChannels.push(channel.id);
        }
        else   throw new Error("Invalid given channel resolvable ::  ["+target+"] is type: '"+channel.type+"'");

        voiceChannelNames = voiceNames.join(",  ");
    }
    return { "voiceChannelNames": voiceChannelNames, "targetVoiceChannels": targetVoiceChannels, /*"channels": channelHandles*/ };
}

//#endregion Voice



//#region Emote

/**
 * Return the emote id, its type (custom/unicode), and its string representation
 * @param {String} content the string emote to parse (should be either a unicode emoji or of the form <:name:id>)
 * @returns {{emote: String, type: String, string: String}}
 **  "emote":    the emote identifier, either the unicode character or the custom emote ID
    **  "type":    the type of emote;  either 'custom' or 'unicode'
    **  "string":    the string representation of the emote
    */
function resolveEmote_string (content){
    content = content.trim();
    return ((content.startsWith('<:') && content.endsWith('>')) ?
        {'emote': content.substring(1, content.length-1).split(":")[(content.match(/:/g) || []).length], 'type': "custom", 'string': content}:
        {'emote': content, 'type': "unicode", 'string': content});
}


/**
 * Return the emote id, its type (custom/unicode), and its string representation
 * @param {Discord.GuildEmoji | Discord.ReactionEmoji} emoteObj the string emote to parse (should be either a unicode emoji or of the form <:name:id>)
 * @returns {{emote: String, type: String, string: String}}
 */
function resolveEmote (emoteObj){
    return ( emoteObj.id ?
        {'emote': emoteObj.id, 'type': "custom", 'string': "<:"+emoteObj.identifier+">"} :
        {'emote': emoteObj.name, 'type': "unicode", 'string': emoteObj.name});
}

//#endregion Emote

//#endregion Get, Fetch, Resolve
module.exports.resolveServer        = resolveServer;
module.exports.fetchServer          = fetchServer;
module.exports.resolveChannel       = resolveChannel;
module.exports.fetchChannel         = fetchChannel;
module.exports.resolveRole          = resolveRole;
module.exports.resolveMember        = resolveMember;
module.exports.resolveLink          = resolveLink;
module.exports.fetchMessageFromLink = fetchMessageFromLink;
module.exports.fetchMessage         = fetchMessage;
module.exports.fetchMessages        = fetchMessages;
module.exports.resolveVoiceChannels = resolveVoiceChannels;
module.exports.resolveEmote_string  = resolveEmote_string;
module.exports.resolveEmote         = resolveEmote;








