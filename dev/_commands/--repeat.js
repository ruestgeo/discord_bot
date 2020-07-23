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



const utils = require('../utils.js');
const bot = require('../dev_bot.js');

//https://www.npmjs.com/package/node-persist

const databasePath = './';
const repeat_min_seconds = 9;
const max_held_repeats = 9; //10 instances of this command can run at once


module.exports = {
    version: 1.0, //dev
    auth_level: 3,



    manual: "**--repeat**  ->  `{<\"seconds\": integer>  <,\"minutes\": integer>  <,\"hours\": integer>  <,\"days\": integer>  <, \"numRepeats\": integer> }` *\\n* `\*command_to_repeat with args\*`\n" +
            ".     *a JSON containing* `seconds`*,* `minutes`*,* `hours`*, and/or* `days`.*\n"+
            ".     *The command on the next line (shift+ENTER) is repeated every interval*\n"+
            ".     *(for example every 1day 2hours 30sseconds or equivalently every 93600seconds)*\n"+
            ".     *The total interval time must be greater than "+repeat_min_seconds+" seconds.*\n"+
            ".     *If* `numRepeats` *is provided then the command will only repeat that number of times before ending.*",



    func: async function (globals, msg, content){ 
        var client = globals.client;
        if (!content.includes('\n')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }

        var _args = content.substr(0, content.indexOf('\n')).trim();
        var request_to_repeat = content.substr(content.indexOf('\n')+1).trim();

        if ( request_to_repeat.startsWith("--repeat") ){
            throw ("Invalid request.  Cannot repeat the repeat command");
        }
        
        var args;
        try{
            args = JSON.parse(_args);
        }
        catch (err){
            throw ("Error when parsing JSON ::  "+ err);
        }
        if ( !args.hasOwnProperty("seconds") && !args.hasOwnProperty("minutes") && !args.hasOwnProperty("hours") && !args.hasOwnProperty("days") ){
            throw ("Invalid request args.  Empty JSON isn't allowed, must specify at least one of seconds, minutes, hours, or days");
        }
        if (args.hasOwnProperty("numRepeats")){
            if (args.numRepeats < 1) throw ("Invalid numRepeats.  Must be greater than 0");
        }
        var interval_time = 0;
        if (args.hasOwnProperty("seconds") ) interval_time += args.seconds * (1000);
        if (args.hasOwnProperty("minutes") ) interval_time += args.minutes * (60*1000);
        if (args.hasOwnProperty("hours") ) interval_time += args.hours * (60*60*1000);
        if (args.hasOwnProperty("days") ) interval_time += args.days * (60*60*24*1000);
        utils.botLogs(globals, "--interval_time :  "+interval_time);
        if (interval_time < repeat_min_seconds*1000){
            throw ("Invalid repeat time.  Total interval time must be greater than "+repeat_min_seconds+" seconds.");
        }

        // https://discordapp.com/channels/<server>/<channel>/<message>
        var message_ID = msg.id;
        var channel_ID = msg.channel.id;
        var server_ID = msg.guild.id;
        var identifier = server_ID+"/"+channel_ID+"/"+message_ID;
        var command_link = "https://discordapp.com/channels/"+identifier;

        //init db

        console.log("--creating table entry");
        //create entry

        /*
        {
            identifier: server/channel/message
            server: id,
            chanenl: id,
            message: id,
            orgin: string,
            command_to_repeat: string,
            args_for_repeat: string,
            interval_time: int,
            last_start: int,
            num_repeats: int,
            elapsed_repeats: int
        } 
        */
        //insert initial data



        //BELOW for function
        //TODO check if message deleted, if so delete repeat interval


        //TODO check if max limit is already reached (count)
        /*
        var command_to_repeat;
        var args_for_repeat;
        if ( request_to_repeat.includes(' ') ){
            command_to_repeat = request_to_repeat.substr(0, request_to_repeat.indexOf(' ')).trim();
            args_for_repeat = request_to_repeat.substr(request_to_repeat.indexOf(' ')+1).trim();
        }
        else {
            command_to_repeat = request_to_repeat.trim();
            args_for_repeat = "";
        }
        utils.botLogs(globals, "--running command to repeat for the first time");
        await bot.commandHandler(msg, msg.member, command_to_repeat, args_for_repeat, true)
        .catch(err => {
            msg.react('❗');
            utils.botLogs(globals,"----ERROR in handling repeated command "+command_link+"\nerr ::   "+err+"\nerr.stack ::   "+err.stack);
            msg.reply("An error occured with the repeated command "+command_link+"\n"+err);
            //remove from db and destory interval
        });


        if (args.hasOwnProperty("numRepeats")){
            if (args.numRepeats == 1){
                msg.reply("Repeat command fufilled [1/1]\n"+command_link+"\n```\n"+"--repeat "+content+"```");
            }
        }
        */
        /* write repeat to db and set interval */
        //if no numRepeats, numRepeats = 0
        
        utils.botLogs(globals, "--closing connection to database");
        
    }

    
}

//TODO add check on inner command authorized

async function repeatHandler(){ //TODO
    var date = Date.now();
    //grab from database
    //obtain message from orgin
    //run command
    //acquire lock again
    //check conditions
    //update database

    utils.botLogs(globals, "--closing connection to database");
    
    //unlock
}






