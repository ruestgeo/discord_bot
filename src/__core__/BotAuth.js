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

const { Globals } = require('./_typeDef');
const logging = require('./BotLogging.js');



//#region Auth
/** Return a members highest authorization level for the current server 
 * @param {BotConfigs} configs the globals configs object 
 * @param {Discord.GuildMember} member the member to check for authorization level
 * @param {Discord.Snowflake} serverID the ID for the server
 * @return {Promise<[("default"|"universal"|"server*sID*"|Discord.Snowflake), Number]>} the highest authorization level of the member and the AuthSource. 
 ** The AuthSource is either "universal" for authorization by user for all servers, 
    * or "server" + snowflake (server ID) for authorization by user for current server, 
    * or snowflake (role ID) for authorization by role in the current server 
    * @throws {Error} if an error occurs
    */
 async function getMemberAuthorizationLevel (configs, member, serverID){
    let memberAuthLevel = 0;
    let authorizingSource = "default"; 
    member =  await member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
    if ( configs.authorization.authorizedUsers["_"]?.hasOwnProperty(member.id) ){
        let level = configs.authorization.authorizedUsers["_"][member.id];
        if (level > memberAuthLevel){
            memberAuthLevel = level;
            authorizingSource = "universal";
        }
    }
    if ( configs.authorization.authorizedUsers[serverID]?.hasOwnProperty(member.id) ){
        let level = configs.authorization.authorizedUsers[serverID][member.id];
        if (level > memberAuthLevel){
            memberAuthLevel = level;
            authorizingSource = "server"+serverID;
        }
    }
    for ( let roleID in configs.authorization.authorizedRoles[serverID] ){
        let level = configs.authorization.authorizedRoles[serverID][roleID];
        if ( member.roles.cache.has(roleID) && (level > memberAuthLevel) ){
            memberAuthLevel = level;
            authorizingSource = roleID; //member.roles.cache.get(roleID);
        }
    }
    return [authorizingSource, memberAuthLevel];
}

/** Return whether a member has sufficient authorization level
 * @param {Globals} globals 
 * @param {Discord.GuildMember} member the member to check for authorization level
 * @param {Number} requiredAuthLevel the required authorization level
 * @param {Discord.Snowflake} serverID the ID for the server
 * @param {Boolean | undefined } printlog whether to log the result
 * @return {Boolean} whether the member is authorized or not
 * @throws {Error} if an error occurs
 */
async function checkMemberAuthorized (globals, member, requiredAuthLevel, serverID, printlog){
    try {
        if( !printlog ) printlog = false;
        let configs = globals.configs;
        let authorizedRole = null;
        let isAuthorized = false;
        let memberAuthLevel = 0;

        if (member.user.id === globals.client.user.id){
            if (printlog)
                logging.log(globals,"* ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized as the client bot *");
            return true;
        }

        let adminBypass = false;
        if (configs.authorization.hasOwnProperty("adminBypass"))
            adminBypass = configs.channelAuth.adminBypass;
        if (adminBypass) { //check if admin
            if (member.permissions.has("ADMINISTRATOR")){
                if (printlog)
                    logging.log(globals,"* ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized by Administrator permissions *");
                return true;
            }
        }

        let channelAuth = await getMemberAuthorizationLevel(configs,member,serverID);
        let authSource = channelAuth[0];
        memberAuthLevel = channelAuth[1];
        if (authSource !== "universal" && !authSource.startsWith("server"))
            authorizedRole = member.roles.cache.get(authSource);

        isAuthorized = (memberAuthLevel >= requiredAuthLevel);
        if ( !isAuthorized ){
            if (printlog)
                logging.log(globals,"* ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] doesn't have sufficient authorization level *");
            return false;
        }
        else if ( !authorizedRole ){ //user Authorized
            if (printlog) 
                logging.log(globals,"* ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized through"+(authSource==="universal"?" universal":" server")+" user authorization *");
            return true;
        }
        else if ( authorizedRole ) { //role Authorized
            if (printlog) 
                logging.log(globals,"* ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized through the ["+authorizedRole.name+":"+authorizedRole.id+"] role authorization *");
            return true;
        }
        else throw new Error("error occured during authorization checking");
    }
    catch (err){
        throw (err);
    }
}


/**
 * Return whether the bot will ignore the message based on the server whitelist/blacklist.
 * if adminBypass is set true then a user with administrator permissions will not be restricted.
 * @param {Globals} globals 
 * @param {Discord.Snowflake} serverID 
 * @param {Discord.Snowflake} channelID 
 * @param {Discord.Snowflake} memberID 
 * @throws {Error} if an error occurs
 * @returns {{"commands": Boolean, "reactables": Boolean}}
 */ 
function checkChannelAuthorized (globals, serverID, channelID, memberID){
    let configs = globals.configs;
    let client = globals.client;
    let auth = {"commands": true, "reactables": true};
    if (!configs.hasOwnProperty("channelAuth")) //no channel auth -> free pass
        return auth;
    if (!configs.channelAuth.hasOwnProperty(serverID)) //server not configured for channel auth -> free pass
        return auth;
    if (configs.channelAuth[serverID].adminBypass) { //check if admin
        if (client.guilds.resolve(serverID).members.resolve(memberID).permissions.has("ADMINISTRATOR"))
            return auth;
    }
    /* check channel lists */
    if (configs.channelAuth[serverID].hasOwnProperty("listForCommands"))
        auth.commands = configs.channelAuth[serverID].commandAllowList ? 
            ( configs.channelAuth[serverID].listForCommands?.includes(channelID) ?? true ) : //default all allowed
            !( configs.channelAuth[serverID].listForCommands?.includes(channelID) ?? false ); //default all allowed
    if (configs.channelAuth[serverID].hasOwnProperty("listForReactables"))
        auth.reactables = configs.channelAuth[serverID].reactableAllowList ? 
            ( configs.channelAuth[serverID].listForReactables?.includes(channelID) ?? true ) : //default all allowed
            !( configs.channelAuth[serverID].listForReactables?.includes(channelID) ?? false ); //default all allowed
    return auth;
}
//#endregion Auth
module.exports.checkMemberAuthorized       = checkMemberAuthorized;
module.exports.getMemberAuthorizationLevel = getMemberAuthorizationLevel;
module.exports.checkChannelAuthorized      = checkChannelAuthorized;


