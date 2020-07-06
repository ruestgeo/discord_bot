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
    "all.js"
    "-all.js"
    "--all.js"
    "--ping.js"
    "--version.js"
    "--help.js"
    "--commands.js"
    "--shutdown.js"


================================================================================


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






const utils = require('../utils.js'); //base utils is located in the base dir, if needed
//const custom_utils = require('../_utils/custom_utils'); //custom utils located in the _utils directory



/* Must include all of "version", "manual", "func", and "auth_level".

   The main function to call from bot.js should be named "func"

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
*/

module.exports = {
    version: 1.0,


    
    auth_level: 0,



    manual: "Example modular function manual.", 

    
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
    }

    
}

/*
MANUAL conventions are as follows:

.  commandName  ->  arguments 
.    any quotation marks, curly brackets, or square brackets are necessary are necessary
.    "..." implies that you can input more than one
.    encapsulating with < and > like "< args >" implies the argument is optional
.    do not include elipses, <, >, or single quotations in the command 
.    do not use double quotations in a key value pair;  instead use single quotations or escaped double quotations for example, for example
.    {"message": "i quote, "something" and it failed :<"}
.    {"message": "i quote, 'something' and it succeeded :>"}
.    {"message": "i quote, \"something\" and it succeeded :>"}
*/






