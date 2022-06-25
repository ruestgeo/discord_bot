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
const { EventEmitter } = require('events');




//#region typedef
/**
 * The following properties cannot be modified:
 ** client :  the discord client
 ** bot_id :  the user id of the bot
 ** configs :  the bot configs
 ** botEventEmitter :  the bot event emitter to listen or emit on
 ----
 Additional properties can be added in as needed
 * @typedef Globals
 * @property {Discord.Client} client the discord client
 * @property {Discord.Snowflake} bot_id 
 * @property {BotConfigs} configs the bot configs
 * @property {EventEmitter} botEventEmitter 
 * @property {*} * any other useful items can be added
 */

/* Extend def via 
 * @typedef {Globals & {newProperty: Type}} Globals2 
 */



/**
 * @typedef BotConfigs see configs.example
 * @property {String} prefix
 * @property {{
 *      adminBypass? : Boolean,
 *      authorizedRoles? : {[serverID: Discord.Snowflake]: Number},
 *      authorizedUsers? : {
 *          [serverID: Discord.Snowflake] : Number,
 *          "_" : Number }
 * }} authorization
 * @property {{
 *      [serverID: Discord.Snowflake]: {
 *          adminBypass?: Boolean,
 *          commandAllowList?: Boolean,
 *          reactableAllowList?: Boolean,
 *          listForCommands?: Discord.Snowflake[],
 *          listForReactables?: Discord.Snowflake[] }
 * }} channelAuth
 * @property {{[built_in_command: String]: Number}} [built_in_AuthLevels]
 * @property {String} DiscordAuthFilePath
 * @property {Number} [workQueueCapacity]
 * @property {Boolean} [timestamp]
 * @property {String} [IANAZoneTime]
 * @property {"append"|"overwrite"|"newfile"|"none"|""} [logsFile]
 * @property {String} [startupStatusText]
 * @property {String} [idleStatusText]
 * @property {String} [shutdownStatusText]
 */


//#endregion typedef



//#region Exports

module.exports.Globals    = this.Globals;
module.exports.BotConfigs = this.BotConfigs;

//#endregion Exports
