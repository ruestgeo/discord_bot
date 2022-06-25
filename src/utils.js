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

// Do NOT add or modify this file (unless bugged) 
//  If a file for common functions is needed see the _utils/README.txt







//#region Imports

const { Globals, BotConfigs } = require('./__core__/_typeDef.js');
const { url_prefix } = require('./__core__/_const.js');

const { getGlobals } = require('./__core__/_Globals.js');

const { botEventEmitter } = require('./__core__/BotEventEmitter.js');
const botCore = require('./__core__/_bot.js');
const logging = require('./__core__/BotLogging.js');
const auth = require('./__core__/BotAuth.js');
const timers = require('./__core__/BotTimers.js');
const listeners = require('./__core__/BotListeners.js');
const storage = require('./__core__/BotStorage.js');

const interactables = require('./__core__/Interactables.js');
const discordUtils = require('./__core__/DiscordUtils.js');
const stringUtils = require('./__core__/StringUtils.js');
const dateTimeUtils = require('./__core__/DateTimeUtils.js');
const eventUtils = require('./__core__/EventUtils.js');
const miscUtils = require('./__core__/MiscUtils.js');
const { Queue } = require('./__core__/Queue.js');

//#endregion Imports



//#region Export
module.exports.getGlobals = getGlobals;

module.exports.botEventEmitter = botEventEmitter;

module.exports.hasCommand          = botCore.hasCommand;
module.exports.commandIsBlocking   = botCore.commandIsBlocking;
module.exports.getCommandAuthLevel = botCore.getCommandAuthLevel;
module.exports.getCommandVersion   = botCore.getCommandVersion;
module.exports.getCommandManual    = botCore.getCommandManual;
module.exports.getCommandFunction  = botCore.getCommandFunction;
module.exports.addShutdownTasks    = botCore.addShutdownTasks;

module.exports.botLogs        = logging.log;
module.exports.awaitLogs      = logging.awaitLog;
module.exports.getLogFileName = logging.getLogFileName;
module.exports.loggerIsReady  = logging.isReady;

module.exports.getMemberAuthorizationLevel = auth.getMemberAuthorizationLevel;
module.exports.checkMemberAuthorized       = auth.checkMemberAuthorized;
module.exports.checkChannelAuthorized      = auth.checkChannelAuthorized;

module.exports.acquireTimeout  = timers.acquireTimeout;
module.exports.setTimeout      = timers.setTimeout;
module.exports.removeTimeout   = timers.removeTimeout;
module.exports.acquireInterval = timers.acquireInterval;
module.exports.setInterval     = timers.setInterval;
module.exports.removeInterval  = timers.removeInterval;

module.exports.acquireBotListener = listeners.acquireBotListener;
module.exports.addBotListener     = listeners.addBotListener;
module.exports.removeBotListener  = listeners.removeBotListener;

module.exports.getStorage = storage.getStorage;
module.exports.setStorage = storage.setStorage;
module.exports.BotStorage = storage.BotStorage;


module.exports.EphemeralReply    = interactables.EphemeralReply;
module.exports.button_confirm    = interactables.button_confirm;
module.exports.button_prompt     = interactables.button_prompt;
module.exports.button_controller = interactables.button_controller;
module.exports.react_confirm     = interactables.react_confirm;
module.exports.react_prompt      = interactables.react_prompt;
module.exports.react_controller  = interactables.react_controller;

module.exports.change_status = discordUtils.change_status;
module.exports.memberHasRole = discordUtils.memberHasRole;
module.exports.isEphemeral   = discordUtils.isEphemeral;
module.exports.getMessageLink    = discordUtils.getMessageLink;
module.exports.sendMessage       = discordUtils.sendMessage;
module.exports.messageChannel    = discordUtils.messageChannel;
module.exports.createFakeMessage = discordUtils.createFakeMessage;
module.exports.disableComponents     = discordUtils.disableComponents;
module.exports.getDisabledComponents = discordUtils.getDisabledComponents;
module.exports.resolveServer        = discordUtils.resolveServer;
module.exports.fetchServer          = discordUtils.fetchServer;
module.exports.resolveChannel       = discordUtils.resolveChannel;
module.exports.fetchChannel         = discordUtils.fetchChannel;
module.exports.resolveRole          = discordUtils.resolveRole;
module.exports.resolveMember        = discordUtils.resolveMember;
module.exports.resolveLink          = discordUtils.resolveLink;
module.exports.fetchMessageFromLink = discordUtils.fetchMessageFromLink;
module.exports.fetchMessage         = discordUtils.fetchMessage;
module.exports.fetchMessages        = discordUtils.fetchMessages;
module.exports.resolveVoiceChannels = discordUtils.resolveVoiceChannels;
module.exports.resolveEmote_string  = discordUtils.resolveEmote_string;
module.exports.resolveEmote         = discordUtils.resolveEmote;

module.exports.jsonFormatted       = stringUtils.jsonFormatted;
module.exports.cleanCommas         = stringUtils.cleanCommas;
module.exports.cleanSpaces         = stringUtils.cleanSpaces;
module.exports.countOccurrences    = stringUtils.countOccurrences;
module.exports.extractEncapsulated = stringUtils.extractEncapsulated;
module.exports.intToLetter         = stringUtils.intToLetter;
module.exports.letterToInt         = stringUtils.letterToInt;

module.exports.dayNum            = dateTimeUtils.dayNum;
module.exports.dayMatch          = dateTimeUtils.dayMatch;
module.exports.matchDay          = dateTimeUtils.matchDay;
module.exports.getWeekDays       = dateTimeUtils.getWeekDays;
module.exports.getWeekDate       = dateTimeUtils.getWeekDate;
module.exports.getWeekFromDate   = dateTimeUtils.getWeekFromDate;
module.exports.getDateTime       = dateTimeUtils.getDateTime;
module.exports.getDate           = dateTimeUtils.getDate;
module.exports.getTimeString     = dateTimeUtils.getTimeString;
module.exports.getTimeString2    = dateTimeUtils.getTimeString2;
module.exports.getDateTimeString = dateTimeUtils.getDateTimeString;

module.exports.event_once = eventUtils.event_once;
module.exports.event_on   = eventUtils.event_on;

module.exports.sleep            = miscUtils.sleep;
module.exports.getObjectName    = miscUtils.getObjectName;
module.exports.isAsync          = miscUtils.isAsync;
module.exports.deepFreeze       = miscUtils.deepFreeze;
module.exports.generateUniqueID = miscUtils.generateUniqueID;

module.exports.Queue = Queue;


module.exports.url_prefix = url_prefix;

module.exports.Globals = Globals;
module.exports.BotConfigs = BotConfigs;


//#endregion Export


