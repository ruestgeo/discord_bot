#!/usr/bin/env node

/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code when asked if not already made public

--currently uses in-memory storage so the amount of reactroles that can be held is limited

--requires manage-roles permissions to use ConditionedRoles functions
--requires google sheets setup to use DocumentDump functions
*/

console.log("[main.js]\n--importing bot.js");
const bot = require("./bot.js");
console.log("--starting bot \n");

bot.set_exit_handler();
/*await*/ bot.init();














