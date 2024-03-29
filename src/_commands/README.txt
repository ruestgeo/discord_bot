All commands should be made modular and placed in this directory.
The command is the same as the file name excluding the ".js" extension (entire string is case-sensitive).

see  below  for format and such

It is up to the command in specific to implement reply logic other than errors.
For example  "msg.reply("request complete");"  when the command is finished its work,
and "throw (err);"  on errors (alternatively  "throw ("custom error message ::    "+err)", and so on)


If auth_level is defined 0 for a command then it is recommended not to use botLog, 
or at least wait until the unlock event is emitted before acquiring the lock, writing, then unlocking (examples in bot.js)


By convention, prefix the command name with "--" for disambiguation, however this is not strictly needed.
Similarly lowercase is used by convention, however not required.

The following file names cannot be used:
    ".js"
    "all.js"
    "-all.js"
    "--all.js"
    "--ping.js"
    "--version.js"
    "--help.js"
    "--commands.js"
    "--shutdown.js"
    "--import.js"
    "--reimport.js"


================================================================================


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





const Discord = require('discord.js');
const utils = require(process.cwd()+'/utils.js'); //base utils is located in the base dir, if needed
//const custom_utils = require(process.cwd()+'/_utils/custom_utils'); //custom utils located in the _utils directory



/* Must include all of "version", "manual", "func", and "auth_level".
    The "requisites" property may be optionally included for further validation.

   The main function to call from bot.js should be named "func".

   "manual" should include usage of this function. 
   Limit this to 2000 chars as per Discord post restrictions; preferably keep it
   short.

   "auth_level" defines what level of authorization the role or user requires to
   use this command.  
   Users with higher level will be able to use any command with equal or lower 
   auth_level.
   For example a user with auth level of 2 will be able to use 
   commands with an auth level of 2, 1, and 0 (or lower).
   All users have an auth level of 0, so commands with auth_level of 0 
   (or lower) and means any user can use the command.

    "version" is used to help identify changes/updates to the command.

    "requisites" defines the requisite files for the command.
    Each object should contain the requisite file name as well as the path to 
    that file from the main directory (not including the file name).
*/

module.exports = {
    version: 1.0, //major#.minor#   :  major if breaking changes, minor if small or bug fixes

    
    auth_level: 0,  

    /*set and modify auth_level the values as desired;
     * 0 and less means anyone can use the command,
     * otherwise only those with the same level or higher auth level can use the command
     */



    requisites: {
        "commands" : [/*"path/to/file/from/_commands/fileName.js", ...*/],

        "startupTasks": {
            files: [/*"path/to/file/from/_startup/fileName.js", ...*/],
            functions: [/*{title: "task1", func: (globals) => void|Promise} || func: (globals) => void|Promise, ...*/]   //if no title is provided then it will be labeled "_" under the fileName
        },

        "shutdownTasks": [/*{title: "task1", func: (globals) => void|Promise} || func: (globals) => void|Promise, ...*/]   //if no title is provided then it will be labeled "_" under the fileName
    },
    /* If needing to use the functions of commands listed in requisites.commands then there are two options:
     * a) [regular import] import the command file like regular with the path relative to the current working directory (which should be where main.js is located)
     * b) [dynamic import] create a startup task to import the command file via utils.getCommandFunction, which should work regardless of the location of either file
     */


    //manual: "Example modular function manual.", 
    manual: "**--command**  ->  args\n" +
            "~~**•** >~~  *description* \n" +
            "~~**•** >~~  *description*" +

    
/** @param {Globals} globals   @param {Discord.Message} msg   @param {String} args   @returns {String|void} */
    func: async function (globals, msg, args){ 
        /*
         *   the parameters provided are (globals, msg, args)
         * --globals contains the general configs, client handle, and so on
         * -- msg is the triggering Message object
         * -- args is the request contents
         * 
         * these parameters are fixed until further expansion
         */
        console.log("this is an example modular function from example-function.js");
        msg.reply("this is an example modular function from example-function.js");
        return "this will reply to the request message";
    }

    
}

/*
MANUAL conventions are as follows:

commandName  ->  arguments 
.    any (escaped) quotation marks, curly brackets, or square brackets are necessary are necessary
.    any regular brackets indicate a grouping, intended for alternative arg groups indicated with a (bolded?) forward slash
.    any backticks (grave accent/marks) imply a literal string or word input, not including escaped backticks which imply literal backtick required in args
.    any args italicized mean to refer to placeholder text for instruction, for example *roleResolvable* means to replace with a role resolvable such as id, name, or mention
.    any link args should be italicized and underlined
.    "..." implies that you can input more than one
.    encapsulating with < and > like "< args >" implies the argument is optional
.    do not include elipses, <, >, or single quotations in the command 
.    do not use double quotations in a key value pair;  instead use single quotations or escaped double quotations for example, for example
.    {"message": "i quote, "something" and it failed :<"}
.    {"message": "i quote, 'something' and it succeeded :>"}
.    {"message": "i quote, \"something\" and it succeeded :>"}
*/





