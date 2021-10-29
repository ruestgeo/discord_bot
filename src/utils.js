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


// Do NOT add or modify (unless bugged) this file.  
//  If a file for common functions is needed see the _utils/README.txt


const fs = require('fs'); 
const luxon = require('luxon');
const { Mutex } = require('async-mutex');
const Discord = require('discord.js');
const work_lock = new Mutex();
let release;

const url_prefix = "https://discord.com/channels/";


const DateTime = luxon.DateTime;


module.exports = {

    /** Acquire the work lock   (DO NOT USE WITHIN A COMMAND FUNCTION) */
    acquire_work_lock: async function(globals, requester){
        // await acquire_work_lock or  acquire_work_lock(~~).then(_ => { do stuff })
        console.log("* attempting to acquire work lock for "+requester+" *");
        if ( work_lock.isLocked() )  console.log("* work lock still active, waiting for unlock for "+requester+" *");
        release = await work_lock.acquire();
        globals.busy = true;
        this.botLogs(globals, "* acquired work lock for "+requester+" *");
    },
    /** Release the work lock (DO NOT USE UNLESS AFTER ACQUIRING) */
    release_work_lock: function(globals, holder){
        if ( !work_lock.isLocked() ) {console.log("*not locked DEBUG*"); return;}
        this.botLogs(globals, "* releasing work lock for "+holder+" *");
        globals.busy = false;
        release();  //work_lock.release();
        //console.log("DEBUG isLocked: "+work_lock.isLocked());
    },

    /** Log the content to file (if set) then to console */
    botLogs: function (globals, content){
        if (globals.LogsToFile)
            { fs.appendFileSync(globals.logsPath+globals.logsFileName, content+"\n"); }
        console.log(content);
    },
    /** Log the content when the work lock after waiting for some seconds (max 1 min) */
    awaitLogs: async function (globals, content, waitingSeconds){
        let timestamp = this.getTimeString(globals);
        if ( globals.__awaitLogs.content )   globals.__awaitLogs.content += "\n"+timestamp+"_"+content;
        else   globals.__awaitLogs.content = timestamp+"_"+content;
        if ( !waitingSeconds )   waitingSeconds = 0;
        else if ( typeof waitingSeconds !== 'number' )   waitingSeconds = 0;
        else if ( waitingSeconds < 0 )    waitingSeconds = 0;

        if ( !globals.__awaitLogs.timeout && waitingSeconds == 0 ){ //no existing timeout and no waitingSeconds, immediate log
            let temp = globals.__awaitLogs.content;
            globals.__awaitLogs.content = null;
            this.botLogs(globals, temp);
        }
        else if ( !globals.__awaitLogs.timeout && waitingSeconds > 0 ){ //set timeout
            //console.log("set timeout");
            waitingSeconds = Math.min(waitingSeconds, 60);
            globals.__awaitLogs.init_time = Date.now();
            globals.__awaitLogs.wait_time = waitingSeconds;
            globals.__awaitLogs.timeout = setTimeout(flushAwaitLogs, waitingSeconds*1000, globals, this.botLogs);
        }
        else if ( globals.__awaitLogs.timeout && waitingSeconds > 0 ){ //extend timeout if waitingSeconds
            clearTimeout(globals.__awaitLogs.timeout);
            //console.log("extend timeout");
            let elapsedTime = (Date.now() - globals.__awaitLogs.init_time)/1000.0;
            let remainingTime = globals.__awaitLogs.wait_time - elapsedTime;
            if (remainingTime < waitingSeconds)   waitingSeconds -= remainingTime;
            else /*if (remainingTime >= waitingSeconds)*/  return;  //maintain current timeout and wait time
            let waitingTime = Math.min(60, remainingTime + waitingSeconds);
            waitingSeconds = (waitingTime - remainingTime);
            globals.__awaitLogs.wait_time += waitingSeconds;
            //console.log("DEBUG\n  elapsed: "+elapsedTime+"\n  old remaining time: "+remainingTime+"\n  add waiting seconds: "+waitingSeconds+"\n  new waiting time: "+waitingTime+"\n  total wait from init: "+globals.__awaitLogs.wait_time);
            globals.__awaitLogs.timeout = setTimeout(flushAwaitLogs, waitingTime*1000, globals, this.botLogs);
        }
        //else timeout but no waitSeconds, so just append content and maintain the current timeout (at start)
    },

    



    /** Return the current time as a string (24h)
     * @param {*} globals
     * @return {String} return the date and time as a string (hour,minute,seconds)
     */
    getTimeString: function(globals){
        return this.getDateTime(globals).toLocaleString({hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit'});
    },
    /** Return the current time as a string (12h + TZ) 
     * @param {*} globals
     * @return {String} return the date and time as a string (hour,minute,seconds,timezone)
     */
    getTimeString2: function(globals){
        return this.getDateTime(globals).toLocaleString({hourCycle: 'h11', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: "short"});
    },

    /** Obtain a DateTime obj of the corresponding timezone
     * @param {*} globals
     * @return {luxon.DateTime} the current time in the set timezome
     */
    getDateTime: function(globals){
        let zone = globals.configs.IANAZoneTime;
        if (DateTime.local().setZone(zone).isValid) {
            return DateTime.fromISO(DateTime.utc(), {zone: zone});
        }
        else { //invalid IANA zone identifier, use UTC as default
            return DateTime.utc();
        }
        
    },

    /** Return the current date and time as a string
     * @param {*} globals
     * @return {String} return the date and time as a string (weekday, month,day,year,hour,minute,seconds,timezone)
     */
    getDateTimeString: function (globals) {
        return this.getDateTime(globals).toLocaleString({hourCycle: 'h11', weekday: 'short', month: 'short', day: '2-digit', year: "numeric", hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: "short" });
    },

    /** Return the date as a string 
     * @param {*} globals
     * @returns {String} the date in the format "year-MM-DD-weekday{3}-timezone{abbreviated}"
    */
    getDate: function (globals){
        return this.getDateTime(globals).toFormat("y'-'MM'-'dd'_'ccc'_'ZZZZ");
        //return this.getDateTime(globals).toLocaleString({ year: "numeric", month: 'short', day: '2-digit', weekday: 'short', timeZoneName: "short" });
    },




    /** Return whether a member (obj) has a specific role (id)
     * @param {Discord.GuildMember} member the member to check
     * @param {Discord.Snowflake} role_id the role ID
     */
    memberHasRole: async function(member, role_id){
        member =  await member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
        return member.roles.cache.has(role_id);
    },

    /** Return a members highest authorization level 
     * @param {*} configs the globals configs object 
     * @param {Discord.GuildMember} member the member to check for authorization level
     * @return {Number} the highest authorization level of the member
     * @throws {Error} if an error occurs
     */
    getMemberAuthorizationLevel: async function(configs, member){
        let memberAuthLevel = 0;
        member =  await member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
        if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
            memberAuthLevel = configs.authorization.authorizedUsers[member.id];
        }
        for ( let roleID in configs.authorization.authorizedRoles ){
            let roleAuthLevel = configs.authorization.authorizedRoles[roleID];
            if ( member.roles.cache.has(roleID) && (roleAuthLevel > memberAuthLevel) ){
                memberAuthLevel = roleAuthLevel;
            }                
        }
        return memberAuthLevel;
    },

    /** Return whether a member has sufficient authorization level
     * @param {*} globals 
     * @param {Discord.GuildMember} member the member to check for authorization level
     * @param {Number} requiredAuthLevel the required authorization level
     * @param {Boolean | undefined } printlog whether to log the result
     * @return {Boolean} whether the member is authorized or not
     * @throws {Error} if an error occurs
     */
    checkMemberAuthorized: async function(globals, member, requiredAuthLevel, printlog){
        try {
            if( !printlog ) printlog = false;
            let configs = globals.configs;
            let authorizedRole = null;
            let isAuthorized = false;
            let memberAuthLevel = 0;

            member =  await member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
            if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
                memberAuthLevel = configs.authorization.authorizedUsers[member.id];
            }
            if ( memberAuthLevel < requiredAuthLevel ){ 
                for ( let roleID in configs.authorization.authorizedRoles ){
                    let roleAuthLevel = configs.authorization.authorizedRoles[roleID];
                    if ( member.roles.cache.has(roleID) && (roleAuthLevel > memberAuthLevel) ){
                        memberAuthLevel = roleAuthLevel;
                        authorizedRole = member.roles.cache.get(roleID);
                    }                
                }
            } 
            isAuthorized = (memberAuthLevel >= requiredAuthLevel);
            if (!isAuthorized){
                if (printlog)
                    this.botLogs(globals,"-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] doesn't have sufficient authorization level");
                return false;
            }
            else if ( !authorizedRole ){ //user Authorized
                if (printlog) 
                    this.botLogs(globals,"-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized through user authorization");
                return true;
            }
            else if ( authorizedRole ) { //role Authorized
                if (printlog) 
                    this.botLogs(globals,"-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized through the ["+authorizedRole.name+":"+authorizedRole.id+"] role authorization");
                return true;
            }
            else throw new Error("error occured during authorization checking");
        }
        catch (err){
            throw (err);
        }
    },


    /** Change the status text of the bot 
     * @param {Discord.Client} client
     * @param {Discord.PresenceStatusData} status
     * @param {String} text the name of the activity
     * @param {Discord.ActivityType | Number} type the type of activity
     * @throws {Error} if an error occured when changing the bot status
    */
    change_status: async function(client, status, text, type){ //type is optional, defaults to PLAYING
        if (!type) type = "PLAYING";
        await client.user.setPresence({ activity: { name: text, type: type }, status: status })
        .catch(err => {
            console.log("## err ::  "+err); 
            throw new Error("An error occured when changing bot status");
        });
    },




    /** Post a message in the same channel as a given message, the content which is split into parts if exceeding 2000 char
     * @param {Discord.Message} msg a message in the desired channel to post a new message to
     * @param {String} content the content of the message to send
     * @return  {Discord.Message | Array <Discord.Message>} the posted message, or final message if the message is split into multiple due to character limit
    */
    message: async function (msg, content, reply){
        if ( !reply ) reply = false;

        if (content.length > 2000){
            let parts = [];
            while (content.length > 2000){
                let split_index = content.substr(1800, content.length).indexOf("\n")+1800;
                if (split_index < 0) split_index = content.substr(1800, content.length).indexOf(" ")+1800;
                if (split_index < 0)  throw new Error("Message is greater than 2000; bot was unable to split into segments.");
                parts.push(content.substr(0,split_index));
                content = content.substr(split_index, content.length);
            }
            for (let part of parts){
                reply ? 
                    await msg.reply(part, {split: true}) :
                    await msg.channel.send(part, {split: true}); 
            }
            if (content.trim() !== "") {  //last part
                let last_msg = (reply ? await msg.reply(content, {split: true}) :
                    await msg.channel.send(content, {split: true}) );
                console.log(last_msg);
                if (Array.isArray(last_msg)) last_msg = last_msg[last_msg.length-1]; //split option causes an array to be returned by send; return only the latest
                return last_msg;
            }
        }
        else if (content.trim() != "")  {
            let last_msg = (reply ? await msg.reply(content, {split: true}) :
                await msg.channel.send(content, {split: true}) );
                console.log(last_msg);
            if (Array.isArray(last_msg)) last_msg = last_msg[last_msg.length-1];
            return last_msg;
        }
    },
    /** Post a message in a channel, the content of which is split into parts if exceeding 2000 char 
     * @param {Discord.TextChannel | Discord.NewsChannel | Discord.DMChannel} channel the channel to send the message content to
     * @param {String} content the content of the message to send
     * @return  {Discord.Message | Array <Discord.Message} the posted message, or final message if the message is split into multiple due to character limit
    */
    messageChannel: async function (channel, content){
        if (content.length > 2000){
            let parts = [];
            while (content.length > 2000){
                let split_index = content.substr(1800, content.length).indexOf("\n")+1800;
                if (split_index < 0) split_index = content.substr(1800, content.length).indexOf(" ")+1800;
                if (split_index < 0)  throw new Error("Message is greater than 2000; bot was unable to split into segments.");
                parts.push(content.substr(0,split_index));
                content = content.substr(split_index, content.length);
            }
            for (let part of parts){
                await channel.send(part, {split: true}); 
            }
            if (content.trim() !== "") {  //last part
                return await channel.send(content, {split: true});
            }
        }
        else if (content.trim() != "")  {
            return await channel.send(content, {split: true});
        }
    },





    /**
     * Resolve the server by id
     * @param {*} globals 
     * @param {String} targetServer the target server ID
     * @param {Boolean} log whether to print to botLogs
     * @param {String} log_prefix a prefix to add to the botLogs, if set
     * @returns {Discord.Guild } the resolved server (Discord.Guild), or throws an error if unable to resolve
     * @throws {Error} if cannot resolve
     */
    resolveServer: function (globals, targetServer, log, log_prefix){
        if (log)  this.botLogs(globals,  (log_prefix ? log_prefix : "")+"--resolving target server ["+targetServer+"]");
        let server = globals.client.guilds.resolve(targetServer);
        if (!server) throw ("Could not find server ["+targetServer+"] in the bot cache");
        return server;
    },
    /**
     * Fetch the server by id
     * @param {*} globals 
     * @param {String} targetServer the target server ID
     * @param {Boolean} log whether to print to botLogs
     * @param {String} log_prefix a prefix to add to the botLogs, if set
     * @returns {Discord.Guild } the resolved server (Discord.Guild), or throws an error if unable to resolve
     * @throws {Error} if cannot resolve
     */
    fetchServer: async function (globals, targetServer, log, log_prefix){
        if (log)  this.botLogs(globals,  (log_prefix ? log_prefix : "")+"--resolving target server ["+targetServer+"]");
        let server = await globals.client.guilds.fetch(targetServer);
        if (!server) throw ("Invalid server:  Could not find server ["+targetServer+"] in the list of bot servers");
        return server;
    },


    /**
     * Resolve the channel (in the provided server) by id, name, or link/mention;  if case-sensitive name match is not found, any case-insensitive matches will be returned
     * @param {*} globals 
     * @param {String} targetChannel the target ID, name, or link/mention
     * @param {Discord.GuildChannelManager} server_channels the server_channels, the server of which should be fetched prior to calling this function
     * @param {Boolean} log whether to print to botLogs
     * @param {String} log_prefix a prefix to add to the botLogs, if set
     * @returns {Discord.TextChannel | Discord.VoiceChannel | Discord.CategoryChannel | Discord.NewsChannel | Discord.StoreChannel | Discord.DMChannel} the resolved channel (Discord.GuildChannel), or throws an error if unable to resolve
     * @throws {Error} if cannot resolve
     */
    resolveChannel: function (globals, targetChannel, server_channels, log, log_prefix){
        if (log)  this.botLogs(globals,  (log_prefix ? log_prefix : "")+"--resolving target channel ["+targetChannel+"]");
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
    },
    /**
     * Fetch the channel by id
     * @param {*} globals 
     * @param {String} channelID the target ID
     * @param {Boolean} log whether to print to botLogs
     * @param {String} log_prefix a prefix to add to the botLogs, if set
     * @returns {Discord.TextChannel | Discord.VoiceChannel | Discord.CategoryChannel | Discord.NewsChannel | Discord.StoreChannel} the resolved channel (Discord.GuildChannel), or throws an error if unable to resolve
     * @throws {Error} if cannot resolve
     */
    fetchChannel: async function (globals, channelID, log, log_prefix){
        if (log)  this.botLogs(globals,  (log_prefix ? log_prefix : "")+"--fetching target channel ["+channelID+"]");
        let channel = await globals.client.channels.fetch(channelID);
        if ( !channel ) throw ("Could not find channel ["+channelID+"] in server");
        return channel;
    },


    /**
     * Resolve the role (in the provided server) by id, name, or link/mention
     * @param {*} globals 
     * @param {String} targetRole the target ID, name, or link/mention
     * @param {Discord.RoleManager} server_roles the server_roles, which should already be fetched prior to calling this function
     * @param {Boolean} log whether to print to botLogs
     * @param {String} log_prefix a prefix to add to the botLogs, if set
     * @returns {Discord.Role} the resolved role, or throws an error if unable to resolve
     * @throws {Error} if cannot resolve
     */
    resolveRole: function (globals, targetRole, server_roles, log, log_prefix){
        if (log)  this.botLogs(globals,  (log_prefix ? log_prefix : "")+"--resolving target role ["+targetRole+"]");
        if ( targetRole.startsWith("<@&") && targetRole.endsWith(">") ){
            targetRole = targetRole.substring( 3, targetRole.length-1);
        }
        let role = server_roles.resolve(targetRole);
        if ( !role ){
            role = server_roles.cache.find(_role => _role.name === targetRole);
        }
        if ( !role ) throw ("Could not find role ["+targetRole+"] in server");
        return role;
    },


    /**
     * Resolve the member (in the provided server) by id, name, or link/mention
     * @param {*} globals 
     * @param {String} targetMember the target ID, name, or link/mention
     * @param {Discord.GuildMemberManager | Discord.Collection} server_members either the members Collection or the GuildMemberManager
     * @param {Boolean} log whether to print to botLogs
     * @param {String} log_prefix a prefix to add to the botLogs, if set
     * @returns {Discord.Member} the resolved member, or throws an error if unable to resolve
     * @throws {Error} if cannot resolve
     */
    resolveMember: function (globals, targetMember, server_members, log, log_prefix){
        if (log)  this.botLogs(globals,  (log_prefix ? log_prefix : "")+"--resolving target member ["+targetMember+"]");
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
    },

    /**
     * Resolve a discord link, which may link to either a guild, channel, or message
     * @param {String} link the link to resolve IDs from, which may not be valid or may not link to either a guild, channel, or message
     * @returns an array of the resolved IDs
     */
    resolveLink: function(link){
        link = link.replace(/[<>]+/g, '');
        if ( !link.startsWith("https://discordapp.com/channels/") && !link.startsWith("https://discord.com/channels/"))
            return null;
        let ids = (link.startsWith("https://discordapp.com/channels/") ? 
            link.substring("https://discordapp.com/channels/".length).split("/") : 
            link.substring("https://discord.com/channels/".length).split("/"));
        return ids;
    },

    /**
     * Fetch the message given the server, channel, and message IDs
     * @param {*} globals 
     * @param {String} serverID 
     * @param {String} channelID 
     * @param {String} messageID 
     * @param {Boolean} log whether to print to botLogs
     * @param {String} log_prefix a prefix to add to the botLogs, if set
     * @returns {Discord.Message} the resolved mesage, or throws an error if unable to resolve
     */
    fetchMessage: async function (globals, serverID, channelID, messageID, log, log_prefix){
        if (log)   this.botLogs(globals,  (log_prefix ? log_prefix : "")+"--fetching message");
        let server = globals.client.guilds.resolve(serverID);
        if ( !server ){
            throw ("Server could not be resolved from id "+serverID);
        }
        let channel = server.channels.resolve(channelID);
        if (!channel){
            throw ("Channel could not be resolved from id "+channelID);
        }
        let message = await channel.messages.fetch(messageID)
        .catch(err => {
            if (log)   this.botLogs(globals,  err.stack);
            throw (err);
        });
        return message;
    },
    /**
     * Fetch an amount of messages from a channel
     * @param {*} globals 
     * @param {Discord.MessageManager} channel_messages the message manager of the channel to search
     * @param {Object} options an object describing various options
     * @param {String} options.before a messageID of which to use as a start point to fetch earlier messages
     * @param {Number} options.amount the amount of messages to fetch (defaults to 30)
     * @param {Boolean} options.forceAmount whether to forcefully get the full amount of messages that satisfy the requisites or just match among the amount
     * @param {Boolean} log whether to log or not
     * @returns {Array<Discord.Message>} an array of discord messages
     * @throws if an error occurs
     */
    fetchMessages: async function (globals, channel_messages, options, log){
        let channel = channel_messages.channel;
        let fetchAmount = options.amount ? options.amount : 30;
        if (log) this.botLogs(globals,"--acquiring "+fetchAmount+" latest messages from  "+(channel.type=="dm"?"DM":channel.name)+"  id:"+channel.id+ "   type: "+channel.type);
        

        let messages = await channel.messages.fetch({ limit: fetchAmount }).catch(err => {throw (err);});
        messages = messages.sort(function(a, b){return a.createdTimestamp - b.createdTimestamp}); //ascending (earliest first, latest last)
        let last_message = messages.lastKey();
        messages = messages.filter(message => !message.deleted);
        let countFetches = 1;
        let countAmount = fetchAmount;
        if ( options.forceAmount ){
            while (messages.size < fetchAmount){
                if (log) this.botLogs(globals,"----fetching additional messages to force amount");
                let more_messages = await channel.messages.fetch({ limit: fetchAmount, before: last_message }).catch(err => {throw (err);});
                messages = messages.sort(function(a, b){return a.createdTimestamp - b.createdTimestamp}); //ascending (earliest first, latest last)
                last_message = more_messages.lastKey();
                more_messages = more_messages.filter(message => !message.deleted);
                messages = messages.concat(more_messages);
                countFetches++;
                countAmount += fetchAmount;
            }
        }
        if (log) this.botLogs(globals,"--fetched a total of "+countAmount+" messages through "+countFetches+" API calls, resulting in "+messages.size+" fetched undeleted messages");
        if (messages.size > fetchAmount)   return [...messages.first(fetchAmount)];
        return [...messages.values()]; 
    },


    /**
     * Fetch the voice channel connection the bot has in on the given server (otherwise null)
     * @param {Discord.Client} client 
     * @param {String} serverID 
     * @returns {Discord.VoiceConnection | null}
     */
    getVoiceConnection: function (client, serverID){
        for ( let connection of Array.from(client.voice.connections.values()) ){
            if (connection.channel.guild.id === serverID)
                return connection;
        }
        return null;
    },

    /**
     * @typedef {Object} resolvedVoiceChannels
     * @property {String} voiceChannelNames a string of all voice channels joined by ",  "
     * @property {Array<String>} targetVoiceChannels an array of channel IDs
     */
    /**
     * Resolve all voice channels from an array of category or voice channel resolvables
     * @param {*} globals 
     * @param {Array} resolvables an array of voice channel or category resolvables
     * @param {Discord.Guild} server 
     * @param {Boolean} log whether to log or not
     * @returns {resolvedVoiceChannels}
     * @throws {Error} if cannot resolve
     */
    resolveVoiceChannels: function (globals, resolvables, server, log){
        //  @returns {Object : { "voiceChannelNames": String, "targetVoiceChannels": Array<String>, "channels": Array<Discord.VoiceChannel> }}
        let voiceChannelNames;
        let targetVoiceChannels = [];
        //let channelHandles = [];
        let voiceNames = [];
        for (let target of  resolvables){
            let channel = this.resolveChannel(globals, target, server.channels, log);
            if (log)   this.botLogs(globals,  "--channel type:  "+channel.type);
            if ( channel.type === "category" ){
                for (let _channel of [...channel.children.filter(_channel => _channel.type === "voice").values()]){
                    voiceNames.push(_channel.name+":"+_channel.id);
                    //channelHandles.push(_channel);
                    targetVoiceChannels.push(_channel.id);
                }
                if (log)   this.botLogs(globals, "----found voice channels in category  ["+channel.name+"] ::  "+voiceNames);
            }
            else if ( channel.type === "voice" ){
                voiceNames.push(channel.name+":"+channel.id);
                //channelHandles.push(channel);
                targetVoiceChannels.push(channel.id);
            }
            else   throw new Error("Invalid given channel resolvable ::  ["+target+"] is type: '"+channel.type+"'");
    
            voiceChannelNames = voiceNames.join(",  ");
        }
        return { "voiceChannelNames": voiceChannelNames, "targetVoiceChannels": targetVoiceChannels, /*"channels": channelHandles*/ };
    },
    

    /**
     * @typedef {Object} resolvedEmote
     * @property {String} emote the emote identifier, either the unicode character or the custom emote ID
     * @property {String} type the type of emote;  either 'custom' or 'unicode'
     * @property {String} string  the string representation of the emote
     */
    /**
     * Return the emote id, its type (custom/unicode), and its string representation
     * @param {String} content the string emote to parse (should be either a unicode emoji or of the form <:name:id>)
     * @returns {resolvedEmote}
     */
    resolveEmote_string: function (content){
        content = content.trim();
        return ((content.startsWith('<:') && content.endsWith('>')) ?
            {'emote': content.substring(1, content.length-1).split(":")[(content.match(/:/g) || []).length], 'type': "custom", 'string': content}:
            {'emote': content, 'type': "unicode", 'string': content});
    },

    /**
     * Return the emote id, its type (custom/unicode), and its string representation
     * @param {Discord.GuildEmoji | Discord.ReactionEmoji} emoteObj the string emote to parse (should be either a unicode emoji or of the form <:name:id>)
     * @returns {resolvedEmote}
     */
    resolveEmote: function (emoteObj){
        return ( emoteObj.id ?
            {'emote': emoteObj.id, 'type': "custom", 'string': "<:"+emoteObj.identifier+">"} :
            {'emote': emoteObj.name, 'type': "unicode", 'string': emoteObj.name});
    },









    /**
     * @async 
     * @callback reactPromptCallback aync
     * @param {*} globals 
     * @param {String} serverID 
     * @param {String} userID 
     * @returns {undefined}
     */
    /**
     * Create a react confirmation prompt on a target message which remains active for a certain window and runs a callback depending on the reaction;
     *  callbacks shouldn't attempt acquiring work_lock
     * @param {Object} globals --
     * @param {String} requester_title the title of the requesting command to create a react prompt
     * @param {Discord.Message} target_msg the message to use as a controller
     * @param {Number} window_seconds the number of seconds for the react prompt to stay active (or until bot shutdown/restart if 0 or less)
     * @param {Array} authorized_user_IDs an array of user IDs who are authorized to activate the react callbacks by reacting to the target message
     * @param {reactPromptCallback} ACCEPT_callback the callback function that is executed when the 🟢 emote is reacted by an authorized user;  callback will await work_lock
     * @param {reactPromptCallback} REJECT_callback the callback function that is executed when the 🟥 emote is reacted by an authorized user;  callback will await work_lock
     * @throws if a react prompt or an error occurs
     * @return {String} the message_token used to identify the react confirm prompt
     */
    react_confirm: async function (globals, requester_title, target_msg, window_seconds, authorized_user_IDs, ACCEPT_callback, REJECT_callback){
        this.botLogs(globals, "Creating react confirmation prompt");
        await target_msg.react('🟢').catch(err => {throw (err)});
        await target_msg.react('🟥').catch(err => {throw (err)});
        let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
        if ( globals.__react_confirm.hasOwnProperty(msg_token) )  throw ("a react_confirm prompt for the target message already exists");
        /* add the react_confirm info */
        globals.__react_confirm[msg_token] = {
            'hasWindow': (window_seconds > 0),
            'timeout':  null,
            'disabler': null,
            'requester': requester_title,
            'authorized': authorized_user_IDs,
            'accept': ACCEPT_callback,
            'reject': REJECT_callback
        };
        /* create the eventlistener */
        this.botLogs(globals, "--setting up react event listener");
        globals.__react_confirm[msg_token]['disabler'] = this.event_on(globals.client,'messageReactionAdd', async (messageReaction, user) => {
            let message = messageReaction.message;
            let emote = this.resolveEmote(messageReaction.emoji);
            let msg_token = message.guild.id+"/"+message.channel.id+"/"+message.id;
            if ( user.id === globals.client.user.id )   return;
            if ( !globals.__react_confirm.hasOwnProperty(msg_token) )   return;
            if ( emote.string !== '🟢' && emote.string !== '🟥' )   return;
            if ( !globals.__react_confirm[msg_token].authorized.includes(user.id) ){ //auth user
                let authReply = await message.channel.send("<@"+user.id+"> you are not authorized to use this react_confirm prompt <"+url_prefix+msg_token+">.\n*this message will delete itself in 9 seconds*");
                authReply.delete({ timeout: 9000 }).catch(console.error);
                messageReaction.users.remove(user);
                return;
            }    
            if (globals.__react_confirm[msg_token]['disabler'])  globals.__react_confirm[msg_token]['disabler']();        
            if (globals.__react_confirm[msg_token].hasWindow) 
                clearTimeout(globals.__react_confirm[msg_token].timeout);
            let requester = globals.__react_confirm[msg_token].requester;
            switch (emote.string) {
                case '🟢':{
                    await this.acquire_work_lock(globals, "react_confirm["+msg_token+"]"+requester+"-"+emote.string);
                    try {
                        await globals.__react_confirm[msg_token]['accept'](globals, message.guild.id, user.id);
                    }
                    finally {
                        delete globals.__react_confirm[msg_token];
                        this.release_work_lock(globals, "react_confirm["+msg_token+"]"+requester+"-"+emote.string);
                    }
                    break;
                }
                case '🟥':{
                    if (globals.__react_confirm[msg_token]['reject']){
                        await this.acquire_work_lock(globals, "react_confirm["+msg_token+"]"+requester+"-"+emote.string);
                        try {
                            await globals.__react_confirm[msg_token]['reject'](globals, message.guild.id, user.id);
                        }
                        finally {
                            delete globals.__react_confirm[msg_token];
                            this.release_work_lock(globals, "react_confirm["+msg_token+"]"+requester+"-"+emote.string);
                        }
                    }
                    else   delete globals.__react_confirm[msg_token];
                    break;
                }
                default:
                    throw ("an error occurred during react_confirm");
            }
        });
        /* create the timeout */
        if ( window_seconds > 0 ){
            this.botLogs(globals, "--setting expiration timeout for "+window_seconds+" seconds");
            globals.__react_confirm[msg_token]['timeout'] = setTimeout(async (globals, msg_token) => {
                this.awaitLogs(globals,  "REACT_CONFIRM expired ["+globals.__react_confirm[msg_token].requester+"] "+url_prefix+msg_token, 5);
                if (globals.__react_confirm[msg_token]['disabler'])  globals.__react_confirm[msg_token]['disabler']();
                let resolvables = msg_token.split("/");
                let server = await globals.client.guilds.fetch( resolvables[0] );
                let channel = server.channels.resolve( resolvables[1] );
                let message = await channel.messages.fetch( resolvables[2] );
                if (!message.deleted) {
                    let timeoutMessage = await message.channel.send("<"+url_prefix+msg_token+"> reaction confirmation prompt has timed out and expired.\n*this message will delete itself in 30 seconds*");
                    timeoutMessage.delete({ timeout: 30000 }).catch(console.error);
                }
                delete globals.__react_confirm[msg_token];
            }, 1000*window_seconds, globals, msg_token);
        }
        this.botLogs(globals, "--react confirm prompt setup complete");
        return msg_token;
    },

    /**
     * Create message with the given content that runs callbacks on certain reactions which remains active for a certain window;  
     *  callbacks will await work_lock and shouldn't attempt to acquire the worklock
     * @param {Object} globals --
     * @param {String} requester_title the title of the requesting command to create a react prompt
     * @param {Discord.Message} target_msg the message to use as a controller
     * @param {Number} window_seconds the number of seconds for the react prompt to stay active (or until bot shutdown/restart if 0 or less)
     * @param {Array<String>} authorized_user_IDs an array of user IDs who are authorized to activate the react callbacks by reacting to the target message
     * @param {{String: reactPromptCallback}} react_callbacks An object with keys being a react emote and each value is the callback function for that emote  (example: { "🟢": func1, "<:custom:1234>": func2, ... });  callbacks will await work_lock
     * @throws if a react prompt or an error occurs
     * @return {String} the message_token used to identify the react prompt
     */
    react_prompt: async function (globals, requester_title, target_msg, window_seconds, authorized_user_IDs, react_callbacks){
        this.botLogs(globals, "Creating react prompt");
        for ( let react_key of Object.keys(react_callbacks) ){ 
            let emote = this.resolveEmote_string(react_key);
            await target_msg.react( emote.emote ).catch(err => {throw (err)});
            if (emote.emote === react_key)  continue;
            react_callbacks[emote.emote] = react_callbacks[react_key];
            delete react_callbacks[react_key];
        }
        let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
        if ( globals.__react_prompt.hasOwnProperty(msg_token) )  throw ("a react prompt for the target message already exists");
        /* add the react_prompt info */
        globals.__react_prompt[msg_token] = {
            'hasWindow': (window_seconds > 0),
            'timeout':  null,
            'disabler': null,
            'requester': requester_title,
            'authorized': authorized_user_IDs,
            'callbacks': react_callbacks
        };
        /* create the eventlistener */
        this.botLogs(globals, "--setting up react event listener");
        globals.__react_prompt[msg_token]['disabler'] = this.event_on(globals.client,'messageReactionAdd', async (messageReaction, user) => {
            let message = messageReaction.message;
            let emote = this.resolveEmote(messageReaction.emoji);
            let msg_token = message.guild.id+"/"+message.channel.id+"/"+message.id;
            if ( user.id === globals.client.user.id )    return;
            if ( !globals.__react_prompt.hasOwnProperty(msg_token) )    return;
            if ( !globals.__react_prompt[msg_token].callbacks.hasOwnProperty(emote.emote) )   return;
            if ( !globals.__react_prompt[msg_token].authorized.includes(user.id) ){ //auth user
                let authReply = await message.channel.send("<@"+user.id+"> you are not authorized to use this react prompt <"+url_prefix+msg_token+">.\n*this message will delete itself in 9 seconds*");
                authReply.delete({ timeout: 9000 }).catch(console.error);
                messageReaction.users.remove(user);
                return;
            }    
            if (globals.__react_prompt[msg_token]['disabler'])  globals.__react_prompt[msg_token]['disabler']();        
            if (globals.__react_prompt[msg_token].hasWindow) 
                clearTimeout(globals.__react_prompt[msg_token].timeout);
            let requester = globals.__react_prompt[msg_token].requester;
            await this.acquire_work_lock(globals, "react_prompt["+msg_token+"]"+requester+"-"+emote.string);
            try {
                await globals.__react_prompt[msg_token].callbacks[emote.emote](globals, message.guild.id, user.id);
            }
            finally {
                delete globals.__react_prompt[msg_token];
                this.release_work_lock(globals, "react_prompt["+msg_token+"]"+requester+"-"+emote.string);
            }
        });
        /* create the timeout */
        if ( window_seconds > 0 ){
            this.botLogs(globals, "--setting expiration timeout for "+window_seconds+" seconds");
            globals.__react_prompt[msg_token]['timeout'] = setTimeout(async (globals, msg_token) => {
                this.awaitLogs(globals,  "REACT_PROMPT expired ["+globals.__react_prompt[msg_token].requester+"] "+url_prefix+msg_token, 5);
                if (globals.__react_prompt[msg_token]['disabler'])  globals.__react_prompt[msg_token]['disabler']();
                let resolvables = msg_token.split("/");
                let server = await globals.client.guilds.fetch( resolvables[0] );
                let channel = server.channels.resolve( resolvables[1] );
                let message = await channel.messages.fetch( resolvables[2] );
                if (!message.deleted) {
                    let timeoutMessage = await message.channel.send("<"+url_prefix+msg_token+"> react prompt has timed out and expired.\n*this message will delete itself in 30 seconds*");
                    timeoutMessage.delete({ timeout: 30000 }).catch(console.error);
                }
                delete globals.__react_prompt[msg_token];
            }, 1000*window_seconds, globals, msg_token);
        }
        this.botLogs(globals, "--react prompt setup complete");
        return msg_token;
    },


    /**
     * @async 
     * @callback reactControllerAuth aync
     * @param {*} globals 
     * @param {String} serverID 
     * @param {String} userID 
     * @returns {Boolean}
     */
    /**
     * @async 
     * @callback reactControllerCallback aync
     * @param {*} globals 
     * @param {String} serverID 
     * @param {String} userID 
     * @param {String} msg_token the token or key used to identify the react controller;  globals.__react_controller[msg_token]
     * @returns {undefined}
     */
    /**
     * @typedef reactControllerEmote
     * @property {Boolean} awaitLock whether to await the work lock when running the callback
     * @property {reactControllerCallback} callback the callback to run when this emote is reacted to by an authorized user
     */
    /**
     * Create message with the given content that runs callbacks on certain reactions which remains active for a certain window;
     *   callbacks shouldn't request worklock within the function, instead set the 'awaitLock' property as true
     * @param {Object} globals --
     * @param {String} requester_title the title of the requesting command to create a react controller
     * @param {Discord.Message} target_msg the message to use as a controller
     * @param {reactControllerAuth} isAuthorized a function that will return whether a user is permitted to use the controller
     * @param {{String: reactControllerEmote}} react_callbacks An object with keys being a react emote and each value is the callback function for that emote  (example: { "🟢": func1, "<:custom:1234>": func2, ... })  ❌ reserved for destroying the controller, but additional functionality can be added.  
     * if 'awaitLock' is true then the callback function will await the work_lock
     * @throws if a react prompt or an error occurs
     * @return {String} the message_token used to identify the react controller
     */
     react_controller: async function (globals, requester_title, target_msg, isAuthorized, react_callbacks){
        this.botLogs(globals, "Creating react controller");
        for ( let react_key of Object.keys(react_callbacks) ){
            if (!react_callbacks[react_key].hasOwnProperty('callback')) throw ("error: 'callback' for ["+react_key+"] is missing");
            if (typeof react_callbacks[react_key].callback !== 'function') throw ("error: callback for ["+react_key+"] must be a function");
            let emote = this.resolveEmote_string(react_key);
            //if (emote.emote === '❌') throw ("❌ is not allowed as a controller button");
            await target_msg.react( emote.emote ).catch(err => {throw (err)});
            if (emote.emote === react_key)  continue;
            react_callbacks[emote.emote] = react_callbacks[react_key];
            delete react_callbacks[react_key];
        }

        let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
        if ( globals.__react_controller.hasOwnProperty(msg_token) )  throw ("a react controller for the target message already exists");
        /* add the react_controller info */
        globals.__react_controller[msg_token] = {
            'disabler': null,
            'requester': requester_title,
            'isAuthorized': isAuthorized,
            'callbacks': react_callbacks
        };
        /* add ❌ callback to destroy the controller */
        if (react_callbacks.hasOwnProperty('❌')){
            let temp = react_callbacks['❌'];
            react_callbacks['❌'] = {
                'callback': async (globals, serverID, userID, msg_token) => {
                    temp.callback(globals, serverID, userID, msg_token);
                    this.botLogs(globals, "Destroying react controller "+msg_token);
                    if (globals.__react_controller[msg_token]['disabler'])  
                        globals.__react_controller[msg_token]['disabler']();
                    delete globals.__react_controller[msg_token];
                    //delete controller message
                    let resolvables = msg_token.split("/");
                    let message = await this.fetchMessage(globals, resolvables[0], resolvables[1], resolvables[2], true);
                    if ( !message.deleted ) await message.delete({ reason: "deleting controller due to ❌ reaction by authorized user" });
                },
                'awaitLock': (temp.hasOwnProperty('awaitLock') ? temp.awaitLock : false)
            };
        }
        else{
            react_callbacks['❌'] = {'callback': async (globals, serverID, userID, msg_token) => {
                this.botLogs(globals, "Destroying react controller "+msg_token);
                if (globals.__react_controller[msg_token]['disabler'])  
                    globals.__react_controller[msg_token]['disabler']();
                delete globals.__react_controller[msg_token];
                //delete controller message
                let resolvables = msg_token.split("/");
                let message = await this.fetchMessage(globals, resolvables[0], resolvables[1], resolvables[2], true);
                if ( !message.deleted ) await message.delete({ reason: "deleting controller due to ❌ reaction by authorized user" });
            }};
            await target_msg.react( '❌' ).catch(err => {throw (err)});
        }
        
        
        /* create the eventlistener */
        this.botLogs(globals, "--setting up react event listener");
        globals.__react_controller[msg_token]['disabler'] = this.event_on(globals.client,'messageReactionAdd', async (messageReaction, user) => {
            let message = messageReaction.message;
            let emote = this.resolveEmote(messageReaction.emoji);
            let msg_token = message.guild.id+"/"+message.channel.id+"/"+message.id;
            if ( user.id === globals.client.user.id )    return;
            if ( !globals.__react_controller.hasOwnProperty(msg_token) )    return;
            if ( !globals.__react_controller[msg_token].callbacks.hasOwnProperty(emote.emote) )   return;
            messageReaction.users.remove(user);
            try{
                if ( !(await globals.__react_controller[msg_token].isAuthorized(globals, message.guild.id, user.id)) ){ //auth user
                    let authReply = await user.send("<@"+user.id+"> you are not authorized to use this react controller <"+url_prefix+msg_token+">.\n*this message will delete itself in 9 seconds*").catch(err => {console.error(err); return;});
                    authReply.delete({ timeout: 9000 });
                    return;
                }
            }
            catch (err){
                this.awaitLogs(globals, "REACT_CONTROLLER ERROR ["+globals.__react_controller[msg_token].requester+"] "+url_prefix+msg_token+"\n"+err, 5);
                let errMsg = await message.channel.send("An error occurred:\n"+err).catch(err => {console.error(err); return;});
                errMsg.delete({timeout: 9000});
                return;
            }
            
            let requester = globals.__react_controller[msg_token].requester;
            if (globals.__react_controller[msg_token].callbacks[emote.emote].awaitLock){
                await this.acquire_work_lock(globals, "react_controller["+msg_token+"]"+requester+"-"+emote.string);
                try {
                    await globals.__react_controller[msg_token].callbacks[emote.emote].callback(globals, message.guild.id, user.id, msg_token);
                }
                finally {
                    this.release_work_lock(globals, "react_controller["+msg_token+"]"+requester+"-"+emote.string);
                }
            }
            else
                await globals.__react_controller[msg_token].callbacks[emote.emote].callback(globals, message.guild.id, user.id, msg_token);
        });
        this.botLogs(globals, "--react controller setup complete");
        return msg_token;
    },



    /** Create an event listener for a target lister and return a function to remove the specific event listener */
    event_once: function (target, event_type, func) {
        target.once(event_type, func);
        return function() {
            if (target.off)
                target.off(event_type, func);
        };
    },
    /** Create an event listener for a target lister and return a function to remove the specific event listener */
    event_on: function (target, event_type, func) {
        target.on(event_type, func);
        return function() {
            target.off(event_type, func);
        };
    },


    /** Any startup procedures for all utils */
    util_startup: async function (globals){
        globals["__awaitLogs"] = {};
        globals.__awaitLogs["content"] = null;
        globals.__awaitLogs["timeout"] = null;
        globals.__awaitLogs["init_time"] = null;
        globals.__awaitLogs["wait_time"] = 0;
        globals["__react_confirm"] = {};
        globals["__react_prompt"] = {};
        globals["__react_controller"] = {};
    },
    /** Any shutdown procedures for all utils */
    util_shutdown: async function (globals){
        console.log("Utils Shutdown");

        if ( globals.hasOwnProperty("__awaitLogs") ){
            if (globals.__awaitLogs.timeout){
                console.log("    __attemptLogs :  flushing content");
                try{
                    clearTimeout(globals.__awaitLogs.timeout);
                } catch (err){console.error}
                this.botLogs(globals, globals.__awaitLogs.content);
                globals.__awaitLogs.content = null;
                globals.__awaitLogs.timeout = null;
                globals.__awaitLogs.init_time = null;
                globals.__awaitLogs.wait_time = 0;
            }
        }

        if ( globals.hasOwnProperty("__react_confirm") ){
            let keys = Object.keys(globals.__react_confirm);
            console.log("    __react_confirm  ("+keys.length+")");
            for (let msg_token of keys ){
                console.log("        shutdown for "+msg_token);
                if (globals.__react_confirm[msg_token]['disabler']) globals.__react_confirm[msg_token]['disabler']();        
                if (globals.__react_confirm[msg_token].hasWindow) 
                    clearTimeout(globals.__react_confirm[msg_token].timeout);
                delete globals.__react_confirm[msg_token];
            }
        }
        if ( globals.hasOwnProperty("__react_prompt") ){
            let keys = Object.keys(globals.__react_prompt);
            console.log("    __react_prompt  ("+keys.length+")");
            for (let msg_token of keys ){
                console.log("        shutdown for "+msg_token);
                if (globals.__react_prompt[msg_token]['disabler'])  globals.__react_prompt[msg_token]['disabler']();        
                if (globals.__react_prompt[msg_token].hasWindow) 
                    clearTimeout(globals.__react_prompt[msg_token].timeout);
                delete globals.__react_prompt[msg_token];
            }
        }
        if ( globals.hasOwnProperty("__react_controller") ){
            let keys = Object.keys(globals.__react_controller);
            console.log("    __react_controller  ("+keys.length+")");
            for (let msg_token of keys ){
                console.log("        shutdown for "+msg_token);
                if (globals.__react_controller[msg_token]['disabler'])  globals.__react_controller[msg_token]['disabler']();
                delete globals.__react_controller[msg_token];
            }
        }

    },

    sleep,
    json_formatted,
    cleanCommas,
    cleanSpaces,
    countOccurrences,
    extractEncapsulated,
    url_prefix,
    //Queue
}


async function flushAwaitLogs(globals, botLogs){
    //clear awaitLogs prior to mutex to prevent race
    let temp = globals.__awaitLogs.content;
    globals.__awaitLogs.content = null;
    globals.__awaitLogs.timeout = null;
    globals.__awaitLogs.init_time = null;
    globals.__awaitLogs.wait_time = 0;
    release = await work_lock.acquire();
    botLogs(globals, temp);
    release();  //work_lock.release();
}



/** Sleep for some amount of milliseconds
 * @param {Number} ms
 * @return {Promise <undefined>}
 */
function sleep (ms) { //example:  await sleep(1000);
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/** Return an object formatted in a 'pretty' way 
 * @param {Object} jsonObj a regular js object
 * @return {String} the formatted object
*/
function json_formatted (jsonObj){
    return JSON.stringify(jsonObj,null,'  ');
}

/**
 * Replace the spaces after commas with a specified number of spaces
 * @param {String} str the string to clean
 * @param {Number} numSpaces the nunmber of spaces to fill after commas
 * @returns {String}
 */
function cleanCommas(str, numSpaces){
    return str.replace(/ +(?<=, +)/g, " ".repeat(numSpaces));
}
/**
 * Clean the extra spacing between characters to at most 1 space
 * @param {String} str the string to clean
 * @returns {String}
 */
function cleanSpaces(str){
    return str.replace(/ +(?= )/g, '');
}
/**
 * Count the number of occurences of a substring within a string
 * @param {String} str the string to count within
 * @param {String} countString the sub-string to count within the main string
 * @returns {Number}
 */
function countOccurrences(str, countString){
    return (str.match(new RegExp(countString,"g")) || []).length;
}
/** Return an array containing the substring before the shell encapsulating the core string, the core string, and the substring after the core 
 * @param {String} str the string to parse
 * @param {String} shellString the encapsulating sub-string, or "shell string", to the left and right of the core string
 * @return {Array <String>} the left,core, and right sub-strings (not including the shell string)
 */
function extractEncapsulated(str, shellString){
    if (countOccurrences(str, shellString) < 2) return null;
    let beginIndex = str.indexOf(shellString);
    let endIndex = str.indexOf(shellString, beginIndex + shellString.length);
    let left = str.substring(0, beginIndex);
    let core = str.substring(beginIndex + shellString.length, endIndex);
    let right = str.substring(endIndex + shellString.length);
    return [left,core,right];
}



//exports.Queue = Queue;
/***
 * Basic queue.
 * if given capacity then there is a limit to the size, otherwise no limit.
 * if given an array then the queue is created using that array
 ***/
class Queue {
    constructor(capacity, array) {
        if (capacity) {
            if (!Number.isInteger(capacity))
                throw new Error("Invalid arg given:  [" + capacity + "] is not an integer");
            if (capacity < 1)
                throw new Error("Invalid arg given:  capacity less than 1");
            if (array) {
                if (array.length > capacity)
                    throw new Error("Invalid args:  Array is larger than given capacity");
            }
        }
        if (array !== undefined && !Array.isArray(array))
            throw new Error("Invalid arg for array");

        this._elements = (array !== undefined ? array : []);
        this._capacity = capacity;
    }
    /**
     * add element to the end of the queue
     * @param {*} element item to add to the queue
     * @throws {Error} if queue has capacity and is full
     **/
    enqueue(element) {
        if (this._capacity && this._elements.length == this._capacity)
            throw new Error(`Queue is full ( ${this._elements.length} / ${this._capacity} )`);
        this._elements.push(element);
    }
    /**
     * return and remove the first element of the queue
     * @return {*} return the first item from the queue
     **/
    dequeue() {
        if (this._elements.length < 1)
            throw new Error(this._capacity ? `Queue is empty ( ${this._elements.length} / ${this._capacity} )` : "Queue is empty");
        return this._elements.shift();
    }
    /**
     * alias for enqueue
     * @param {*} element item to add to the queue
     * @throws {Error} if queue has capacity and is full
     **/
    push(element) {
        try { this.enqueue(element); }
        catch (err) { throw (err); }
    }
    /**
     * alias for dequeue
     * @return {*} return the first item from the queue
     **/
    pop() {
        try { return this.dequeue(); }
        catch (err) { throw (err); }
    }
    /**
     * return true if empty
     * @return {Boolean} whether the queue is empty
     **/
    isEmpty() {
        return this._elements.length == 0;
    }
    /**
     * return the first element of the queue without removing, or undefined
     * @return {*} return the first item on the queue
     **/
    peek() {
        return (this.isEmpty() ? null : this._elements[0]);
    }
    /**
     * return current size of the queue
     * @return {Number} the length of the queue
     **/
    length() {
        return this._elements.length;
    }
    /**
     * return current size of the queue
     * @return {Number} the length of the queue
     **/
    size() {
        return this._elements.length;
    }
    /**
     * return capacity (might be undefined)
     * @return {Number | undefined } the capacity of the queue or undefined if there is no capacity
     **/
    capacity() {
        return this._capacity;
    }
    /**
     * remove first instance of element from queue and returns it
     * @param {*} element the item to look for to remove
     * @return {*} the removed element
     **/
    remove(element) {
        let index = this._elements.indexOf(element);
        if (index < 0)
            throw new Error("element not found in Queue");
        return this._elements.splice(index, 1);
    }
    /** 
     * @callback findIndexPredicate
     * @param {*} element The current element being processed in the array
     * @param {Number | undefined} index [OPTIONAL] The index of the current element being processed in the array
     * @param {Array <*> | undefined} array [OPTIONAL] The array findIndex() was called upon
     * @return {Boolean} returns true an element satisfies the condition
     */
    /**
     * remove the first element to satisfy the conditionFunction and return it
     * @param {findIndexPredicate} conditionFunction a function that is executed on each item on the queue until it finds one that returns true
     * @return {*} the removed element
     */
    removeOneConditioned(conditionFunction) {
        let index = this._elements.findIndex(conditionFunction);
        if (index < 0)
            throw new Error("element not found in Queue");
        return this._elements.splice(index, 1);
    }
    /**
     * remove element at index of queue
     * @param {Number} index the index of the item to remove
     * @return {*} the removed element
     **/
    removeIndex(index) {
        return this._elements.splice(index, 1);
    }
    /**
     * remove element at index of queue
     * @param {Number} index the index of the item to remove
     * @return {*} the removed element
     **/
    removePosition(index) {
        return this._elements.splice(index, 1);
    }
    /**
     * remove all instances of element from queue
     * @param {*} element the item to remove all instances of
     **/
    removeAll(element) {
        this._elements = this._elements.filter(Q_item => Q_item !== element);
    }
    /**
     * clear the queue
     **/
    clear() {
        this._elements = [];
    }
    /**
     * insert element into the queue at position
     * @param {*} element the item to insert into the queue
     * @param {Number} index the index to insert at
     * @throws {Error} if the queue has a capacity and it is full
     **/
    insert(element, index) {
        if (this._capacity && this._elements.length == this._capacity)
            throw new Error("Queue is full ( " + this._elements.length + " / " + this._capacity + " )");
        this._elements.splice(index, 0, element);
    }
    /**
     * return whether queue contains element
     * @param {*} element the item to search for
     **/
    has(element) {
        return this._elements.includes(element);
    }
    /**
     * return whether queue contains element
     * @param {*} element the item to search for
     **/
    includes(element) {
        return this._elements.includes(element);
    }
    /**
     * return index of first occurence of element (optional startIndex and endIndex)
     * @param {*} element the item to search for
     * @param {Number} startIndex 
     * @param {Number} endIndex 
     **/
    indexOf(element, startIndex, endIndex) {
        if (endIndex)
            return this._elements.substring(startIndex, endIndex).indexOf(element) + startIndex;
        if (startIndex)
            return this._elements.substring(startIndex).indexOf(element) + startIndex;
        return this._elements.indexOf(element);
    }
    /**
     * return number of occurences of element in queue
     * @param {*} element the item to count occurences of
     * @return {Number} the number of occurences
     **/
    count(element) {
        return this._elements.filter(Q_item => Q_item === element).length;
    }
    /**
     * return a key-value copy of queue with indices as keys
     * @return {Object}
     **/
    toKeyValue() {
        let keyval = {};
        for (let idx = 0; idx < this._elements.length; idx++) {
            keyval[idx] = this._elements[idx];
        }
        return keyval;
    }
    /**
     * @callback arrayMappingFunction
     * @param {*} element The current element being processed in the array
     * @param {Number | undefined} index [OPTIONAL] The index of the current element being processed in the array
     * @param {Array<*> | undefined} array [OPTIONAL] The array map was called upon
     */
    /**
     * apply a map function on a copy of the queue and return the result
     * @param {arrayMappingFunction} mappingFunction a function to apply on each item in the queue
     * @return {Array <*>} the resulting queue array
     */
    map(mappingFunction) {
        return this._elements.map(mappingFunction);
    }
    /**
     * @callback arrayFilterFunction
     * @param {*} element The current element being processed in the array
     * @param {Number | undefined} index [OPTIONAL] The index of the current element being processed in the array
     * @param {Array<*> | undefined} array [OPTIONAL] The array filter was called upon
     * @return {Boolean} returns true if the element satisfies the condition
     */
    /**
     * apply a filter function on a copy of the queue and return the result
     * @param {arrayFilterFunction} filterFunction a function to apply to each item in the queue
     * @return {Array <*>} the resulting queue array
     */
    filter(filterFunction) {
        return this._elements.filter(filterFunction);
    }
    /**
     * return a shallow copy of queue
     * @return {Array <*>}
     **/
    copy() {
        return Array.from(this._elements);
    }
    /**
     * return queue array as a string
     * @return {String}
     **/
    toString() {
        return `[${this._elements.toString()}]`;
    }
    /**
     * stringify the queue
     * @return {String}
     **/
    stringify() {
        return JSON.stringify(this._elements);
    }
    /**
     * create a new Queue from the array with a given capacity
     * @param {Array <*>} array
     * @param {Number | undefined} capacity [OPTIONAL]
     * @return {Queue}
     **/
    static from(array, capacity) {
        try { return new Queue(capacity, array); }
        catch (err) { throw (err); }
    }
}
module.exports.Queue = Queue;

