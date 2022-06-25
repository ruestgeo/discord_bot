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


const { EventEmitter } = require('events');


const botEventEmitter = new EventEmitter();
module.exports.botEventEmitter = botEventEmitter;


//#region Event doc

/** Client initialize
 * @event botEventEmitter#init
 */
/** Logging in via client token
 * @event botEventEmitter#login
 */
/** Login failed with error
 * @event botEventEmitter#loginError
 * @param {Error} err
 */
/** Bot has finished all setup, is logged in, and ready to listen on discord
 * @event botEventEmitter#ready
 */


/** Client will restart
 * @event botEventEmitter#restart
 */
/** Client restart complete
 * @event botEventEmitter#restartComplete
 */
/** Client will partially restart
 * @event botEventEmitter#softRestart
 */
/** Client soft restart complete
 * @event botEventEmitter#softRestartComplete
 */


/** Client will shutdown
 * @event botEventEmitter#shutdown
 */
/** Shutdown complete
 * @event botEventEmitter#exit
 */



/** Setting up the logging system
 * @event botEventEmitter#logsSetup
 * @param {"daily"|"newfile"|"overwrite"|"append"|"none"|""} logsFileMode the log file mode
 */
/** Log system ready
 * @event botEventEmitter#logsReady
 */
/** Creating a new file for logging on new file mode
 * @event botEventEmitter#logNewFile_start
 */
/** 'newfile' mode log file has been created and is ready for logging
 * @event botEventEmitter#logNewFile_end
 */
/** Creating a new file for logging on daily mode
 * @event botEventEmitter#logDaily_start
 */
/** 'daily' mode log file has been created and is ready for logging
 * @event botEventEmitter#logDaily_end
 */



/** Verifying the imported bot configs
 * @event botEventEmitter#verifyConfigs
 */
/** Bot configs have a critical error
 * @event botEventEmitter#configsCriticalError
 * @param {String[]} missingConfigs a list of configs that are missing
 * @param {String[]} invalidConfigs a list of configs that are invalid
 */
/** The bot has the following config errors
 ** arrays may be empty and no errors are encountered
 * @event botEventEmitter#configsError
 * @param {Error|null} error
 * @param {String[]} [missingConfigs] a list of configs that are missing
 * @param {String[]} [invalidConfigs] a list of configs that are invalid
 */
/** Bot configs have been verified and are sufficient to operate
 * @event botEventEmitter#configsVerified
 */



/** Acquiring command files from the command directory
 ** If emitted while in progress then an inner directory is being scanned (up to 1 layer deep)
 * @event botEventEmitter#acquiringCommands
 * @param {Number} amountFiles number of files to parse
 ** this value is used to show the current progress via botEventEmitter#acquiringCommand
 * @param {String} name of the directory
 */
/** Currently acquiring a command file
 * @event botEventEmitter#acquiringCommand
 * @param {Number} progress count of how many files have been parsed;  the index of the current file
 * @param {String|null} path the path of the current file being scanned
 */
/** Completed import of commands
 * @event botEventEmitter#acquiredCommands
 */


/** Acquiring bot-reactable files from the reactable directory
 ** only the main directory will be scanned, not any sub-directories
 * @event botEventEmitter#acquiringReactables
 * @param {Number} amountFiles number of files to parse
 * @param {String} name of the directory
 ** this value is used to show the current progress via botEventEmitter#acquiringReactable
 */
/** Currently acquiring a bot-reactable file
 * @event botEventEmitter#acquiringReactable
 * @param {Number} progress count of how many files have been parsed;  the index of the current file
 * @param {String|null} path the path of the current file being scanned
 */
/** Completed import of bot-reactables
 * @event botEventEmitter#acquiredReactables
 */



/** Running startup tasks from files in the startup directory
 ** If emitted while in progress then an inner directory is being scanned (up to 1 layer deep)
 * @event botEventEmitter#startupTasks
 * @param {Number} amount total number of tasks
 * @param {String} name of the directory or title of the task
 ** this value is used to show the current progress via botEventEmitter#startupTask
 */
/** Currently running a startup task
 * @event botEventEmitter#startupTask
 * @param {Number} progress count of how many files have been parsed;  the index of the current file
 * @param {String|null} description a description of the startup task, 
 * which is either the path of the startup file, or the requester.
 */
/** Completed all startup tasks
 * @event botEventEmitter#startupTasksComplete
 */
/** Error occured when running a startup task
 * @event botEventEmitter#startupError
 * @param {Error} err
 */



/** Client encountered an error
 * @event botEventEmitter#error
 * @param {Error} err
 */



/** Bot acknowledges a command has been received
 * @event botEventEmitter#commandAcknowledged
 * @param {Discord.Message} msg
 * @param {String} command
 * @param {String} content
 */
/** Command handler throws an error
 * @event botEventEmitter#commandError
 * @param {Error} err
 */
/** Command request has been completed
 * @event botEventEmitter#commandComplete
 * @param {String} command
 */


/** Bot client requested a command to run
 * @event botEventEmitter#selfCommandReceived
 * @param {String} token serverID + "/" + channelID + "/" + messageID
 * @param {String} reason the reason for running the command
 * @param {Boolean} sendMessage whether to send a message to the channel with the command and request body, or to use a fake message to handle the request
 * @param {String} command
 * @param {String} content
 */
/** Caught an error thrown while handling a command requested by the bot
 * @event botEventEmitter#selfCommandError
 * @param {Error} error
 */
/** Completed a command requested by the bot
 * @event botEventEmitter#selfCommandComplete
 */



/** Clearing timeouts
 * @event botEventEmitter#shutdownTimeouts
 * @param {Number} amountTimeouts the amount of timeouts to clear
 */
/** Clearing intervals
 * @event botEventEmitter#shutdownIntervals
 * @param {Number} amountIntervals the amount of intervals to clear
 */


/** Running shutdown tasks
 * @event botEventEmitter#shutdownTasks
 * @param {Number} amountTasks the amount of tasks to run
 */
/** Currently running a shutdown task
 * @event botEventEmitter#shutdownTask
 * @param {Number} progress count of how many tasks completed;  the index of the current task
 * @param {String|null} taskGroupName the name of the group of the shutdown task
 */
/** Shutdown tasks are completed
 * @event botEventEmitter#shutdownTasksComplete
 */




/*
 * @event botEventEmitter#
 */

//#endregion Event doc

