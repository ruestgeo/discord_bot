

//import {MessageButtonStyleResolvable } from 'discord.js';
const Discord = require('discord.js');
const Intents = Discord.Intents;


const _package = require('./package.json');
//const utils = require('./utils.js');

const configsPath = './configs.json';
const configs = require(configsPath);


const { initGlobals, getGlobals } = require('./__core__/_Globals.js');

const { createFakeMessage } = require('./__core__/DiscordUtils.js');
const { button_confirm, button_controller, button_prompt,
    react_confirm, react_controller, react_prompt } = require('./__core__/Interactables.js');

const  __startupL = require('./__core__/BotListeners.js').__startup;
const  __startupI = require('./__core__/Interactables.js').__startup;
const  __startupLog = require('./__core__/BotLogging.js').__startup;

initGlobals();
__startupLog();
__startupL();
__startupI();

const client = new Discord.Client({
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, 
        Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.DIRECT_MESSAGES
    ]
    //,partials: ['MESSAGE','REACTION']
});
console.log("\n\n["+_package.name+"]   version -- "+_package.version+"\n");
process.title = "["+_package.name+"]   version -- "+_package.version;

client.login(require(configs.DiscordAuthFilePath).token)
.catch(err => {console.log("--ERROR [LOGIN] ::  "+err); throw new Error("\nError occurred during login");});

client.once('ready', _ => {
    console.log("Bot ready");
    getGlobals()["client"] = client;
    getGlobals()["LogsToFile"] = false;
});


let rawEmote = "<:ookG:697998261893464156>";
/** @type {Discord.EmojiIdentifierResolvable} */
let emote = rawEmote.replace(/<|>/g,"");

/** @type {Discord.MessageButtonStyleResolvable} */
let style = "SECONDARY";

let bid = "test_button";
let buttonMsg = null;

/** @type {Discord.Interaction} */
let _i = null;

/** @param {Discord.Message} msg  */
function isEphemeralReply(msg){
    return msg.flags.has(Discord.MessageFlags.FLAGS.EPHEMERAL);
}

client.on('messageCreate', /** @param {Discord.Message} msg */ async (msg) => {
    //console.log(msg.constructor.name);
    //console.log("isEphemeral: " + isEphemeralReply(msg));
    //console.log("is Message: "+ (msg.constructor.name === Discord.Message.name));
    //console.log("is Message: "+ msg instanceof Discord.Message);
    //console.log(Discord.Message.prototype);
    //console.log(msg.constructor.prototype);
    //console.log("msg is: "+ msg.constructor.name)
    //console.log("user is User? "+ msg.author instanceof Discord.User);
    if (msg.content === "button"){
        let component = new Discord.MessageButton()
            .setCustomId(bid)
            .setLabel("Testificate")
            .setEmoji(emote)
            .setStyle(style);
        let actionRow = new Discord.MessageActionRow().addComponents(component);

        let m = await msg.reply({content: "this is a test for button", components: [actionRow]});
        //let m2 = await msg.reply({content: "this is a test for button2", components: [actionRow]}); //CID unique only to message it is attached to
        buttonMsg = m;
        //console.log("\n\n\nAR COMPONENTS\n==================================\n\n");
        //console.log(m.components.components);
        console.log("\n\n\nCOMPONENT JSON\n==================================\n\n");
        m.components.map( ar =>    {console.log(ar.toJSON()); ar.components.map(c => {console.log(c.toJSON()); console.log("\n---------")}) }  );
    }
    //else if (msg.content === "interaction") {
        //let interactionData = {
            //custom_id: bid,
            //component_type: 2, /* Button Component */
            //id: "", /* ID of the interaction */ //cannot make or get fake id
            //application_id: "", /* ID of the application this interaction is for */
            //type: 3 /* The type of interaction : 3 = MessageComponent */, 
            //guild_id: msg.guild.id, /* The guild it was sent from */
            //channel_id: msg.channel.id, /* The channel it was sent from */
            //member: msg.member, /* Guild member data for the invoking user, including permissions */
            //user: msg.author, /* User object for the invoking user, if invoked in a DM */
            //token: "", /* A continuation token for responding to the interaction */  // cannot make or get fake
            //version: 1, /* Read-only property, always `1` */
            //message: buttonMsg, /* For components, the message they were attached to */  
            //channel: msg.channel,
            //locale: 'en-US', /* The selected language of the invoking user */ //'en-US'
        //};
        //let fakeInteraction = new Discord.ButtonInteraction(client, interactionData);
        //console.log(fakeInteraction);
    //}
    else if (msg.content === "remove"){
        if (!buttonMsg) return;
        buttonMsg.edit({content: buttonMsg.content+"\n*buttons removed*", components: []});
    }
    else if (msg.content === "disable"){
        if (!buttonMsg) return;
        let ars = buttonMsg.components.map(  ar => {ar.components.map(c =>  c.setDisabled(true)); return ar;}   );
        ars.map(ar => console.log(ar.toJSON()));
        buttonMsg.edit({content: buttonMsg.content+"\n*buttons disabled*", components: ars});
    }

    else if (msg.content === "dismiss"){
        if (!_i) return;
        if (!_i.isButton()) return;
        let ars = _i.message.components.map(  ar => {ar.components.map(c =>  c.setDisabled(true)); return ar;}   );
        ars.map(ar => console.log(ar.toJSON()));
        _i.editReply({content: _i.message.content+"\n*buttons disabled*", components: ars});
    }
    else if (msg.content === "repliable"){
        if (!_i) return;
        console.log(_i.isRepliable());
    }

    else if (msg.content === "test"){
        let fakeMsg = await createFakeMessage(client, msg.channelId, msg.guildId, "this is a fake message test");
        console.log(fakeMsg);
        console.log("sending fake to channel");
        await fakeMsg.channel.send("test fakeMsg channel send");
    }
    else if (msg.content === "test2"){
        let fakeMsg2 = await createFakeMessage(client, msg.channelId, msg.guildId, "this is a fake message test", "987398381649395772");
        console.log(fakeMsg2);
        console.log("sending fake to channel");
        await fakeMsg2.channel.send("test fakeMsg2 channel send");
    }
    else if (msg.content === "test3"){
        let fakeMsg = await createFakeMessage(client, msg.channelId, msg.guildId, "this is a fake message test");
        console.log(fakeMsg);
        console.log("replying fake to channel");
        await fakeMsg.reply("test fakeMsg reply");
    }
    else if (msg.content === "test4"){
        let fakeMsg2 = await createFakeMessage(client, msg.channelId, msg.guildId, "this is a fake message test", "987398381649395772");
        console.log(fakeMsg2);
        console.log("replying fake to channel");
        await fakeMsg2.reply("test fakeMsg2 reply");
    }


    else if (msg.content === "confirm"){
        await button_confirm(getGlobals(), {
            targetChannel: msg.channel,
            authorizedUsers: [msg.author.id],
            awaitLock: false,
            options: {content: "this button test, ya"},
            requester: "testificate",
            window: 10,
            acceptCallback: async () => { await msg.reply("accepted"); },
            rejectCallback: async () => { await msg.reply("rejected"); }
        });
    }
    else if (msg.content === "prompt"){
        await button_prompt(getGlobals(), {
            targetChannel: msg.channel,
            authorizedUsers: [msg.author.id],
            options: {content: "this button test, ya"},
            requester: "testificate",
            window: 10,
            callbacks: {
                "✅": {
                    awaitLock: false, 
                    title: "green",
                    buttonPosition: "B1",
                    callback: async () => { await msg.reply("green"); } 
                },
                "❌": {
                    awaitLock: false, 
                    title: "ex",
                    buttonStyle: "PRIMARY",
                    buttonPosition: "A1",
                    callback: async () => { await msg.reply("x"); } 
                },
                "☑️": {
                    awaitLock: false, 
                    title: "blue",
                    buttonStyle: "DANGER",
                    buttonPosition: "B2",
                    callback: async () => { await msg.reply("blue"); } 
                }
            }
        });
    }
    else if (msg.content === "controller"){
        await button_controller(getGlobals(), {
            targetChannel: msg.channel,
            isAuthorized: (globals, serverID, userID) => { return userID === msg.author.id },
            options: {content: "this button test, ya"},
            requester: "testificate",
            callbacks: {
                "✅": {
                    awaitLock: false, 
                    title: "green",
                    buttonPosition: "B1",
                    callback: async () => { await msg.reply("green"); } 
                },
                "☑️": {
                    awaitLock: false, 
                    title: "blue",
                    buttonStyle: "DANGER",
                    buttonPosition: "E2",
                    callback: async () => { await msg.reply("blue"); } 
                }
            }
        });
    }

    else if (msg.content === "confirm2"){
        await react_confirm(getGlobals(), {
            targetMessage: await msg.reply("react confirm"),
            authorizedUsers: [msg.author.id],
            awaitLock: false,
            requester: "testificate2",
            window: 10,
            acceptCallback: async () => { await msg.reply("accepted"); },
            rejectCallback: async () => { await msg.reply("rejected"); }
        });
    }
    else if (msg.content === "prompt2"){
        await react_prompt(getGlobals(), {
            targetMessage: await msg.reply("react prompt"),
            authorizedUsers: [msg.author.id],
            requester: "testificate2",
            window: 10,
            callbacks: {
                "✅": {
                    awaitLock: false, 
                    title: "green",
                    callback: async () => { await msg.reply("green"); } 
                },
                "❌": {
                    awaitLock: false, 
                    title: "ex",
                    callback: async () => { await msg.reply("x"); } 
                },
                "☑️": {
                    awaitLock: false, 
                    title: "blue",
                    callback: async () => { await msg.reply("blue"); } 
                }
            }
        });
    }
    else if (msg.content === "controller2"){
        await react_controller(getGlobals(), {
            targetMessage: await msg.reply("react controller"),
            isAuthorized: (globals, serverID, userID) => { return userID === msg.author.id },
            requester: "testificate2",
            callbacks: {
                "✅": {
                    awaitLock: false, 
                    title: "green",
                    callback: async () => { await msg.reply("green"); } 
                },
                "☑️": {
                    awaitLock: false, 
                    title: "blue",
                    callback: async () => { await msg.reply("blue"); } 
                }
            }
        });
    }
});

/*client.on('interactionCreate', async (interaction) => {
    //** @type {Discord.ButtonInteraction} *
    _i = interaction;
    console.log(interaction.component.customId)
    //console.log(interaction.constructor.name);
    //console.log(Discord.Interaction.name);
    //console.log("isInteraction: "+interaction.constructor.name === Discord.Interaction.name);
    //console.log("isInteraction2: "+interaction instanceof Discord.Interaction);
    //console.log("\n\n\nINTERACTION\n==================================\n\n");
    //console.log(interaction);
    await interaction.deferReply({ephemeral: true});
    await new Promise(x => setTimeout(x,2000));
    let m = await interaction.editReply({content: "okee",ephemeral: true});
    //console.log(m);
    
    let component = new Discord.MessageButton()
        .setCustomId("emphem🍌")
        .setLabel("ghost")
        .setEmoji(emote)
        .setStyle("DANGER");
    let actionRow = new Discord.MessageActionRow().addComponents(component);

    m = await interaction.editReply({content: "ephemeral button", components: [actionRow]});
    //console.log(m);
    //console.log(m.guild);
    //console.log(m.channel);
    //let serverID = m.guildId;
    //let channelID = m.channelId;
    //let channel = m.channel;
    //let m2 = await channel.messages.fetch(m.id);
    //console.log(m2);
    //m2.editReply("changed");  // WILL NOT WORK, use interact.editReply
});*/

/*
client.on('messageDelete', /** @param {Discord.Message} msg * async (msg) => {
    console.log(msg.partial)
    console.log(msg);
}); //cannot detect ephemeral message dismissed
*/

//TRY BASIC SLASH COMMANDS













