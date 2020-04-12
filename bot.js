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

--requires manage-roles permissions
*/



const Discord = require('discord.js');
const client = new Discord.Client();
const { promisify } = require('util');


const token = require('./auth.json').token;
const configs = require('./configs.json');
const prefix = configs.prefix;
const googleEnabled = configs.googleEnabled;

var reactroles = {};
var bot_id = null;

const utils = require('./utils.js');
const reactroles_functions = require('./ReactRoles.js');
const condroles_functions = require('./ConditionedRoles.js');
const dump_functions = require('./DocumentDump.js');








client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    bot_id = client.user.id;
    console.log("  bot client id: "+bot_id+"\n");    
});

client.on('message', msg => {
    //console.log(msg);
    
    if (msg.content === 'ping') {
        msg.reply('pong');
        msg.channel.send('i ponged, i big bot now!');
        console.log('\ni see ping, i send pong!');
    }
    
    //to get emotes either post "\:emote:" and copy the resulting unicode char
    else if (msg.content === '👍') {  //🤔   🍌
        //msg.channel.send(':thumbsup:');
        msg.react('👍');
        console.log('\n:thumbsup:');
    }
    else if (msg.content.toLowerCase() === 'ook') {
        //msg.channel.send(':thumbsup:');
        msg.react('🍌');
        console.log('\nook');
    }

    
    /*** bot commands ***/
    else if (msg.content.startsWith(prefix)) {
        try {
            //throw new Error("this is a test error");
            var requestBody = msg.content.substring(prefix.length);
            console.log("\nrequestBody:: "+requestBody);
            if (requestBody.includes(' ')){
                var command = requestBody.substr(0,requestBody.indexOf(' '));
                var content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
            }
            else {
                var command = requestBody.trim();
                var content = "{}";
            }
            console.log("__command:: "+command);
            console.log("__content:: "+content);

            commandHandler(msg, command, content, false);
            
        }
        catch (err){
            console.log("\n\n\nAn Error occurred");
            console.log(err);
            console.log("\n\n\n");
            msg.reply("An error occured:\n"+err.stack);
        }
    }
});

/*
client.on( => {
    //
});
*/

function commandHandler(msg, command, content, isRepeat){
    console.log("isRepeat? "+isRepeat);
    
    if (command === '--ook'){
        msg.react('🍌');
        console.log('ook :banana:');
        //msg.reply(content);
    }

    else if (command === '--emoji'){
        //"<:name:snowflake_id>";
        console.log("starts with '<'  : "+content.startsWith('<'));
        console.log("ends with '<'  : "+content.endsWith('>'));
        console.log("contains with ':'  : "+content.includes(':'));
        var emote = utils.get_emote_id(content).emote;
        
        msg.react(emote); //unicode or id
        msg.reply(content); //unicode or <:name:id> code
    }


    /* Display a post with all available commands */
    else if (command === '--help' || command === '--commands'){
        console.log("received request [help] or [commands]");
        var reply = "The bot commands are as follows, \n"+
        ".  ***commandName  ->  arguments*** \n"+
        ".    any quotation marks, curly brackets, or square brackets are necessary are necessary\n"+
        ".    `\"...\"` implies that you can input more than one\n"+
        ".    encapsulating with `<` and `>` like `\"< args >\"` implies the argument is optional\n"+
        ".    encapsulating with single quotations like `\'(args)\'` implies the argument is literal string.\n"+
        ".    do not include elipses, <, >, or single quotations in the command \n"+
        ".    do not use double quotations in a key value pair;  instead use single quotations or escaped double quotations for example, for example\n"+
        ".    `{\"message\": \"i quote, \"something\" and it failed :<\"}`\n"+
        ".    `{\"message\": \"i quote, 'something' and it succeeded :>\"}`\n"+
        ".    `{\"message\": \"i quote, \\\"something\\\" and it succeeded :>\"}`\n"+
        "================================\n"+
        //"**--**  ->  ``\n" +
        //".     *description* \n" +
        //"- - - - - - - - - \n"+
        "**--ook**  ->  *none*" +
        ".     *description* \n" +
        "- - - - - - - - - \n"+
        "**--shutdown**  ->  *none*" +
        ".     *close the discord-bot (bot process is also closed)* \n" +
        "- - - - - - - - - \n"+
        "**--create-reactrole-any**  ->  `{\"message\": \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }` \n" +
        ".     *Create a post with reactions that will assign roles like checkboxes.  Each reaction can freely assign/remove a role.  However newlines must be entered as \\n.* \n" +
        "**--create-reactrole-any**  ->  `{\"reactions\": {\"emote\": \"roleName\" ,  ...} } --+o+--MessageText--+o+-- '`message_to_post`'` \n" +
        ".     *Similar to above, but the message if parsed separately, so literal newlines can be used. (no need for \\n)* \n" +
        "- - - - - - - - - \n"+
        "**--create-reactrole-switch**  ->  `{\"message\": \"*the post text*\" ,  \"reactions\": {\"emote\": \"roleName\" ,  ...} }` \n" +
        ".     *Create a post with reactions that will assign roles like a radio button (switching logic).  Only one reaction at a time, reacting to any others in this group will result in removal of the existing role and reaction then adding the new role (react on B removes role A and react on A, then gives role B)* \n" +
        "**--create-reactrole-switch**  ->  `{\"reactions\": {\"emote\": \"roleName\" ,  ...} } --+o+--MessageText--+o+-- '`message_to_post`'` \n" +
        ".     *Similar to above, but the message if parsed separately, so literal newlines can be used. (no need for \\n)* \n" +
        "- - - - - - - - - \n"+
        "**--give-role-condition**  ->  `{\"give-role\": [\"roleName\", ...] <,  \"has-role\": [\"roleName\", ...]> <,  \"missing-role\": [\"roleName\", ...]>  }` \n" +
        ".     *Give role(s) to a user in the server if they have or doesn't have some role.  Must give at least one \"give-role\", but \"has-role\" and \"missing-role\" are optional. Give at least one has-role for better performance.*  \n" +
        "- - - - - - - - - \n"+
        "**--remove-role-condition**  ->  `{\"remove-role\": [\"roleName\", ...] <,  \"has-role\": [\"roleName\", ...]> <,  \"missing-role\": [\"roleName\", ...]>  }` \n" +
        ".     *Remove role(s) from a user in the server if they have or doesn't have some role.  Must give at least one \"remove-role\", but \"has-role\" and \"missing-role\" are optional. Give at least one has-role for better performance.*  \n" +
        "- - - - - - - - - \n"+
        "**--document-reacts**  ->  `message_link` \n" +
        ".     *Dumps the reaction information of a specified post (via message link) into a specified google sheet* \n" +
        "- - - - - - - - - \n"+
        "**--document-voice**  ->  `channel_id` \n" +
        ".     *Dumps the member information (names) that are in a specified voice channel (via ID) into a specified google sheet* \n" +
        //TODO repeat events for schedule,  maybe --schedule-repeat {time} --*event to repeat* *event args*
        "";
        msg.reply(reply);
    }



    /* "checkbox" reactions post */
    else if (command === '--create-reactrole-any'){
        console.log("received request [create-reactrole-any]");
        reactroles_functions.reactRoles_Any(client, msg, content, reactroles);
        console.log(reactroles);
    }



    /* "radio button" reactions post */
    else if (command === '--create-reactrole-switch'){
        console.log("received request [create-reactrole-switch]");
        reactroles_functions.reactRoles_Switch(client, msg, content, reactroles);
        console.log(reactroles);
    }



    /* give a role if members have certain roles or are missing certain roles */
    else if (command === '--give-role-conditioned'){ //for all users
        console.log("received request [give-role-conditioned]");
        condroles_functions.giveRoles(client, msg, content);
    }



    /* remove a role if members have certain roles or are missing certain roles */
    else if (command === '--remove-role-conditioned'){ //for all users
        console.log("received request [give-role-conditioned]");
        condroles_functions.removeRoles(client, msg , content);
    }



    /* dump reacts of a post to a doc */
    else if (command === '--document-reacts'){
        console.log("received request [document-reacts]");
        if (!googleEnabled){
            console.log("---google not enabled");
            //msg.reply("Google has not been enabled, contact sys-admin to set up");
            //return;
        }
        dump_functions.documentReactions(doc, client, msg, content)
        .catch(err => { console.log(err)});
    }



    /* dump names of members in voice channel to a doc */
    else if (command === '--document-voice'){
        console.log("received request [document-voice]");
        if (!googleEnabled){
            console.log("---google not enabled");
            //msg.reply("Google has not been enabled, contact sys-admin to set up");
            //return;
        }
        dump_functions.documentVoice(doc, client, msg, content)
        .catch(err => { console.log(err)});
    }



    /* schedule timed events */
    else if (command === '--repeat'){
        //--repeat mode time +--event_to_schedule args
        console.log("received request [repeat]");
        if (isRepeat){//shouldn't repeat a repeat!
            console.log("--double repeat -> invalid");
            msg.reply("repeating a repeat is not allowed!");
            return;
        }
       repeatEventHandler(msg, command, content);
    }



    /*  *//*
    else if (command === '--'){
        //
        //JSON.parse(content)
    }*/



    /* shutdown the bot */
    else if (command === '--shutdown'){
        msg.channel.send("i must go, my pepol call me!").then(msg => client.destroy());
        console.log('--bot shutting down');
    }   

    else {
        msg.reply("`"+prefix+command+"` command unknown, try --help or --commands for a list of commands and short documentation");
    }
}




function repeatEventHandler(msg, command, content){
    //--repeat configs +--event_to_schedule args
    /* configs {mode: x, settings: {~~}}
    *
    * modes: < seconds || minutes || days || weekly > 
    *  \seconds: repeat
    *       settings= {}
    *  \minutes:  
    *       settings= {}
    *  \days:  repeat after an amount of days.  can set a preferred time
    *       settings= {}
    *  \weekly:  repeat weekly at a certain time of day 
    *       settings= {schedule: [0~6, ...], timeOfDay: "HH:MM"}
    *         [0-6] where 0 is sunday, 1 is monday ... 6 is saturday
    *         timeOfDay must be 24hour clock, 12hour clock isn't supported
    *  
    * 
    * */
    
    /*
    if seconds or minutes then just create interval event 
    otherwise if days or weekly
    create an timeout event from time of creation to the event time of day (like noon)
     then create interval event 
     */

    //commandHandler(msg, command, content, true);
    //var set = new Set(A);
    /*
    var requestBody = msg.content.substring(prefix.length);
    console.log("\nrequestBody:: "+requestBody);
    if (requestBody.includes(' ')){
        var command = requestBody.substr(0,requestBody.indexOf(' '));
        var content = requestBody.substr(requestBody.indexOf(' ')+1).trim();
    }
    else {
        var command = requestBody.trim();
        var content = "{}";
    }
    console.log("__command:: "+command);
    console.log("__content:: "+content);
    */
}



/***   scheduled reactroles garbage collection   ***/
var time_interval = 1000*60*60*24; // 24 hours
setInterval(garbage_collection, time_interval); 
function garbage_collection(){
    console.log("\nBeginning reactrole garbage collection");
    try{
        for(_server of reactroles){
            var server = client.guilds.resolve(_server);
            if (server.deleted){
                console.log("--server "+server.name+":"+server.id+" DELETED");
                delete reactroles[_server];
            }
            else {
                console.log("--server "+server.name+":"+server.id+" \\");
                for (_channel of reactroles[_server]){
                    var channel = server.channels.resolve(_channel);
                    if (channel.deleted){
                        console.log("----channel "+channel.name+":"+channel.id+" DELETED");
                        delete reactroles[_server][_channels];
                    }
                    else {
                        console.log("----channel "+channel.name+":"+channel.id+" \\");
                        for (_message of reactroles[_server][_channel]){
                            channel.messages.fetch(_message) //not tested fully
                            .then(message => {
                                if (message.deleted){
                                    console.log("------message "+message.id+" DELETED");
                                    delete reactroles[_server][_channels][_message];
                                } else console.log("------message "+message.id+" >>|");
                            })
                            .catch(console.error);
                        }
                    }
                }
            }
        }
    }
    catch (err){
        console.log("\n\n\nAn Error occurred");
        console.log(err);
        console.log("\n\n\n");
    }
}


/***   google connect   ***/
async function connectGoogle(configs){
    if (!googleEnabled)
        return null;
    const { GoogleSpreadsheet } = require('google-spreadsheet');
    const doc = new GoogleSpreadsheet(configs.googleSheetsId);
    await doc.useServiceAccountAuth(require(configs.googleSecret))
    .then(x => {
        console.log("successfully connected to Google Sheets");
        doc.loadInfo()
        .then(x => {
            console.log("Sheets title: ["+doc.title+"]");
        })
        .catch(err => {
            console.log("Error loading info :-: "+err);
        });
    })
    .catch(err => {
        console.log("Error connecting to Sheets :-: "+err);
    });
    return doc;
}

var doc = null;    
connectGoogle(configs)
.then(_doc => {
    doc = _doc;
    client.login(token);
})
.catch(err => {
    console.log(err.stack);
    throw new Error("\nError occurred during Google Sheets connection");   
});