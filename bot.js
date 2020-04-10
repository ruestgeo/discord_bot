const Discord = require('discord.js');
const client = new Discord.Client();


const token = require('./auth.json').token;

const prefix = "..jijaebot ";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    //console.log(msg);
    if (msg.content === 'ping') {
        msg.reply('pong');
        msg.channel.send('i ponged, i big bot now!');
        console.log('i see ping, i send pong!');
    }
    
    //to get emotes either post "\:emote:" and copy the resulting unicode icon, or use bot through "..jijaebot :emote:" and copy the result from the bot logs
    else if (msg.content === '👍') {  //🤔   🍌
        //msg.channel.send(':thumbsup:');
        msg.react('👍');
        console.log(':thumbsup:');
    }
    else if (msg.content.toLowerCase() === 'ook') {
        //msg.channel.send(':thumbsup:');
        msg.react('🍌');
        console.log('ook');
    }

    
    /*** bot commands ***/
    else if (msg.content.startsWith(prefix)) {
        var message = msg.content.substring(prefix.length);
        console.log("message:: "+message);
        if (message.includes(' ')){
            var command = message.substr(0,message.indexOf(' '));
            var content = message.substr(message.indexOf(' ')+1).trim();
        }
        else {
            var command = message.trim();
            var content = "*none*";
        }
        console.log("command:: "+command);
        console.log("content:: "+content);

        if (command === '--ook'){
            msg.react('🍌');
            console.log('ook :banana:');
        }

        else if (command === '--emoji'){
            //msg.guild.emojis
            //client.emojis.
            /*const emote = client.emojis.Collection.find(emoji => emoji.name === content); //find isn't a function?
            console.log(emote);
            if(emote) {
                console.log("emote found");
                //if(msg.content.startsWith("<:"+content+":" + emote.id + ">")) { msg.react(emote.id); }
            }
            else {
                console.log("emote not found");
            }*/

            //"<:name:snowflake_id>";
            console.log("starts with '<'  : "+content.startsWith('<'));
            console.log("ends with '<'  : "+content.endsWith('>'));
            console.log("contains with ':'  : "+content.includes(':'));
            if (content.startsWith('<') && content.endsWith('>') && content.includes(':')){
                var temp = content.substring(1, content.length-1);
                //console.log(temp);
                var temp2 = temp.split(":");
                console.log(temp2);
                console.log(temp2.length);
                var emote = temp2[temp2.length-1];
                console.log("custom emote: "+emote);
                //const emote_info = client.emojis.resolve(emote);
                //console.log(emote_info);
            }
            else { //otherwise unicode supported emoji -> use raw
                var emote = content;
                console.log("raw emote: "+emote);
            }
            
            msg.react(emote); //unicode or id
            msg.reply(content); //unicode or <:name:id> code
        }


        /* Display a post with all available commands */
        else if (command === '--help' || command === '--commands'){
            console.log("help on commands");
            var reply = "The bot commands are as follows, \n"+
            ".  ***commandName  ->  arguments*** \n"+
            ".    any quotation marks, curly brackets, or square brackets are necessary are necessary\n"+
            ".    `\"...\"` implies that you can input more than one\n"+
            ".    do not use double quotations in a key value pair;  instead use \' for example, for example\n"+
            ".    `{\"message\": \"i quote, \"something\" and it failed :<\"}`\n"+
            ".    `{\"message\": \"i quote, \\'something\\' and it succeeded :>\"}`\n"+
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
            "**--create-reactrole-any**  ->  `{message: \"*the post text*\" ,  \"reactions\": [\"emoteName\": \"roleName\" ,  ...] }` \n" +
            ".     *Create a post with reactions that will assign roles like checkboxes.  Each reaction can freely assign/remove a role* \n" +
            "- - - - - - - - - \n"+
            "**--create-reactrole-switch**  ->  `{\"\": \"\"}` \n" +
            ".     *Create a post with reactions that will assign roles like a radio button (switching logic).  Only one reaction at a time, reacting to any others in this group will result in removal of the existing role and reaction then adding the new role (react on B removes role A and react on A, then gives role B)* \n" +
            "- - - - - - - - - \n"+
            //TODO repeat events for schedule,  maybe --schedule-repeat {time} --*event to repeat* *event args*
            "**--give-role-condition**  ->  `{\"give-role\": ['roleName', ...] ,  \"has-role\": ['roleName', ...] (,  \"missing-role\": ['roleName', ...])  }` \n" +
            ".     *Give role(s) to a user in the server if they have or doesn't have some role.  Must give at least one \"give-role\", but \"has-role\" and \"missing-role\" are optional. Give at least one has-role for better performance.*  \n" +
            "- - - - - - - - - \n"+
            "**--remove-role-condition**  ->  `{\"remove-role\": ['roleName', ...] ,  \"has-role\": ['roleName', ...] (,  \"missing-role\": ['roleName', ...])  }` \n" +
            ".     *Remove role(s) from a user in the server if they have or doesn't have some role.  Must give at least one \"remove-role\", but \"has-role\" and \"missing-role\" are optional. Give at least one has-role for better performance.*  \n" +
            "- - - - - - - - - \n"+
            "**--document-reacts**  ->  `TBD` \n" +
            ".     *Dumps the reaction information of a specified post (via ID) into a specified google doc/sheet* \n" +
            "- - - - - - - - - \n"+
            "**--document-reacts**  ->  `TBD` \n" +
            ".     *Dumps the member information (names) that are in a specified voice channel (via ID) into a specified google doc/sheet* \n" +
            "";
            msg.reply(reply);
        }



        /* "checkbox" reactions post */
        else if (command === '--create-reactrole-any'){
            //
        }



        /* "radio button" reactions post */
        else if (command === '--create-reactrole-switch'){
            //
        }



        /*  */
        else if (command === '--give-role-conditioned'){ //for all users
            const args = JSON.parse(content);
            //Object.keys(args['']).length;
            console.log("contains 'test': "+args.hasOwnProperty('test'));
            console.log("contains 'test1': "+args.hasOwnProperty('test1'));
            console.log("contains 'test2': "+args.hasOwnProperty('test2'));
            //check if role(s) exists for give-role
            //if at least one has-role then select from the list of members with the first (if multiple) has-roles, otherwise check the entire server list
            //if there is more has-roles, check if each member from the list has them
            //if there are any missing-roles and verify if each member from the list doesn't have them
            //if valid then assign the new role(s)
        }
        /* remove a role if members have certain roles or are missing certain roles */
        else if (command === '--remove-role-conditioned'){ //for all users
            const args = JSON.parse(content);
            //var NumRolesReq = Object.keys(args['has-roles']).length;
        }



        /* dump reacts of a post to a doc */
        else if (command === '--document-reacts'){
            //
        }



        /* dump names of members in voice channel to a doc */
        else if (command === '--document-voice'){
            //
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
});



/*
const emojiToTrack = '⭐';
receivedMessage.channel.send("Hello World")
.then(async function (message) {
    await message.react('✅')
    const filter = (reaction, user) => {
        return reaction.name === emojiToTrack;
    };

    const collector = message.createReactionCollector(filter);

    collector.on('collect', (reaction, reactionCollector) => {
        //do stuff
    });
});*/


client.login(token);