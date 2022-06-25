#!/usr/bin/env node

/*
GNU General Public License v3.0

Permissions of this strong copyleft license are conditioned on making available 
complete source code of licensed works and modifications, which include larger 
works using a licensed work, under the same license. Copyright and license 
notices must be preserved. Contributors provide an express grant of patent 
rights.

Made by JiJae (ruestgeo)
--feel free to use or distribute the code as you like, however according to the license you must share the source-code if distributing any modifications

--currently uses in-memory storage so the amount of reactroles that can be held is limited

--requires manage-roles permissions to use ConditionedRoles functions
--requires google sheets setup to use DocumentDump functions
*/

const VERSION = 2.0; //VERSION of main.js


//if argv includes "--full-trace" then hijack console log, warn, error, info, debug
//alternatively pipe to file with "node main.js > console.txt"
const commandlineArgs = process.argv.slice(2);
if (commandlineArgs.includes("--full-trace")){
    const fs = require('fs');
    fs.writeFileSync("./console.txt", "Starting --full-trace\n\n\n");

    let originalLog = console.log;
    console.log = function(...args){
        originalLog(...args);
        fs.appendFileSync("./console.txt", args[0]+(args.length > 1 ? "\noptArgs{"+args.slice(1).join(", ")+"}" : ""));
    }
    let originalWarn = console.warn;
    console.warn = function(...args){
        originalWarn(...args);
        fs.appendFileSync("./console.txt", args[0]+(args.length > 1 ? "\noptArgs{"+args.slice(1).join(", ")+"}" : ""));
    }
    let originalError = console.error;
    console.error = function(...args){
        originalError(...args);
        fs.appendFileSync("./console.txt", args[0]+(args.length > 1 ? "\noptArgs{"+args.slice(1).join(", ")+"}" : ""));
    }
    let originalInfo = console.info;
    console.info = function(...args){
        originalInfo(...args);
        fs.appendFileSync("./console.txt", args[0]+(args.length > 1 ? "\noptArgs{"+args.slice(1).join(", ")+"}" : ""));
    }
    let originalDebug = console.debug;
    console.debug = function(...args){
        originalDebug(...args);
        fs.appendFileSync("./console.txt", args[0]+(args.length > 1 ? "\noptArgs{"+args.slice(1).join(", ")+"}" : ""));
    }

    process.on('uncaughtException', err => {
        console.error(err);
        process.exit(1); // mandatory (as per the Node.js docs)
    });
}



console.log("[main.js] "+VERSION+"\n--importing bot.js");
const bot = require(process.cwd()+"/__core__/_bot.js");  //using cwd should prevent bot.js from being included in executable compilation
//const bot = require("./__core__/_bot.js");

console.log("--starting bot \n");
bot.set_exit_handler();
bot.init({press_enter_to_exit: true}).catch(err => console.log(err));








