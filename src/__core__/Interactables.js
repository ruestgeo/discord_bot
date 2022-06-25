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



const DEFAULT_PROMPT_MIN_WINDOW = 5;
const DEFAULT_PROMPT_MAX_WINDOW = 600;
const DEFAULT_PROMPT_WINDOW = 30;



const Discord = require('discord.js');

const { Globals } = require('./_typeDef');
const workLock = require('./WorkLock.js');
const logging = require('./BotLogging.js');
const botListeners = require('./BotListeners.js');
const { getGlobals } = require('./_Globals');

const { cleanSpaces, letterToInt } = require('./StringUtils.js');
const { getObjectName } = require('./MiscUtils.js');
const { disableComponents, getDisabledComponents, fetchMessage, 
    resolveEmote_string, resolveEmote } = require('./DiscordUtils.js');
const { url_prefix } = require('./_const.js');

let globals = null;


//#region typeDef

/**
 * @typedef {(globals: Globals, serverID: Discord.Snowflake, userID: Discord.Snowflake, msg_token: String, interaction?: Discord.Interaction) => Promise<void>} ControllerCallback
 * @async 
 * @callback InteractableCallback aync
 * @param {Globals} globals 
 * @param {Discord.Snowflake} serverID 
 * @param {Discord.Snowflake} userID 
 * @param {String} msg_token (serverID/channelID/messageID)  the token or key used to identify the interactable
 * @param {Discord.Interaction} [interaction] only used for button controllers
 * @returns {Promise<void>}
 */

/**
 * @typedef InteractableReact
 * @property {Boolean} awaitLock whether to await the work lock when running the callback
 * @property {String} [title] (optional) the title to identify the use of the emote react (1-3 words)
 * @property {InteractableCallback} callback the callback to run when this emote is interacted with (either by react or button) by an authorized user
 */
/**
 * @typedef InteractableButton
 * @property {Boolean} awaitLock whether to await the work lock when running the callback
 * @property {String} title the title to identify the use of the emote button (1-3 words)
 * @property {InteractableCallback} callback the callback to run when this emote is interacted with (either by react or button) by an authorized user
 * @property {String} [buttonPosition] (optional) the position of the button from A1 to E5;  maximum of 5 rows and 5 columns (25 buttons)
 * @property {Discord.MessageButtonStyle} [buttonStyle] (optional) the style of the button, of which ["PRIMARY", "SECONDARY", "SUCCESS", and "DANGER"] are available
 ** if buttonPosition is not provided then any remaining items will be slotted in any free slots starting from A1 across and down (A1,A2,... E5)
 */


/** 
 * @typedef ReactConfirmArgs
 * @property {String} requester the title of the requesting command to create a react prompt
 * @property {Discord.Message} targetMessage the message to use as a confirm prmopt
 * @property {Number} window the number of seconds for the react prompt to stay active
 * @property {Discord.Snowflake[]} authorizedUsers an array of user IDs who are authorized to activate the react callbacks by reacting to the target message
 * @property {Boolean} awaitLock whether to await the work lock when running the callback
 * @property {InteractableCallback} acceptCallback the callback function that is executed when the 🟢 emote is reacted by an authorized user
 * @property {InteractableCallback} rejectCallback the callback function that is executed when the 🟥 emote is reacted by an authorized user
 */
/**
 * @typedef ReactPromptArgs
 * @property {String} requester the title of the requesting command to create a react prompt
 * @property {Discord.Message} targetMessage the message to use as a prompt
 * @property {Number} window the number of seconds for the react prompt to stay active
 * @property {Array<Discord.Snowflake>} authorizedUsers an array of user IDs who are authorized to activate the react callbacks by reacting to the target message
 * @property {{[emote: String]: InteractableReact}} callbacks An object with keys being a react emote and each value contains callback and options
 ** if 'awaitLock' is true then the callback function will await the work_lock
 */
/**
 * @typedef ReactControllerArgs
 * @property {String} requester the title of the requesting command to create a react controller
 * @property {Discord.Message} targetMessage the message to use as a controller
 * @property {(globals: Globals, serverID: Discord.Snowflake, userID: Discord.Snowflake) => Promise<Boolean>} isAuthorized a function that will return whether a user is permitted to use the controller
 * @property {{[emote: String]: InteractableReact}} callbacks An object with keys being a react emote and each value is the callback function for that emote 
 ** '❌' reserved for destroying the controller, but additional functionality can be added.
 ** if 'awaitLock' is true then the callback function will await the work_lock
 */

 /** 
 * @typedef ButtonConfirmArgs
 * @property {String} requester the title of the requesting command to create a button prompt
 * @property {Discord.TextChannel|Discord.DMChannel} targetChannel the channel to post the button interactable to
 * @property {Discord.MessageOptions|EphemeralReply} options options of the message to be created (should not include 'components')
 * @property {Number} window the number of seconds for the button prompt to stay active
 * @property {Discord.Snowflake[]} authorizedUsers an array of user IDs who are authorized to activate the button callbacks by pressing the button on the prompt message
 * @property {Boolean} awaitLock whether to await the work lock when running the callback
 * @property {InteractableCallback} acceptCallback the callback function that is executed when the 🟢 Accept button is pressed by an authorized user
 * @property {InteractableCallback} rejectCallback the callback function that is executed when the 🟥 Reject button is pressed by an authorized user
 */
/**
 * @typedef ButtonPromptArgs
 * @property {String} requester the title of the requesting command to create a button prompt
 * @property {Discord.TextChannel|Discord.DMChannel} targetChannel the channel to post the button interactable to
 * @property {Discord.MessageOptions|EphemeralReply} options options of the message to be created (should not include 'components')
 * @property {Number} window the number of seconds for the button prompt to stay active
 * @property {Array<Discord.Snowflake>} authorizedUsers an array of user IDs who are authorized to activate the button callbacks by pressing a button on the prompt message
 * @property {{[emote: String]: InteractableButton}} callbacks An object with keys being an emote and each value contains callback and options (including title to be used as the button label)
 ** if 'awaitLock' is true then the callback function will await the work_lock
 */
/**
 * @typedef ButtonControllerArgs
 * @property {String} requester the title of the requesting command to create a button controller
 * @property {Discord.TextChannel|Discord.DMChannel} targetChannel the channel to post the button interactable to
 * @property {Discord.MessageOptions} options options of the message to be created (should not include 'components')
 * @property {(globals: Globals, serverID: Discord.Snowflake, userID: Discord.Snowflake) => Promise<Boolean>} isAuthorized a function that will return whether a user is permitted to use the controller
 * @property {{[emote: String]: InteractableButton}} callbacks An object with keys being an emote and each value contains callback and options (including title to be used as the button label)
 ** '✖️' reserved for destroying the controller, but additional functionality can be added.
 ** if 'awaitLock' is true then the callback function will await the work_lock
 */


//#endregion typeDef



/**
 * @type {{[msg_token: String]: {
 *      timeout: Number,
 *      requester: String,
 *      authorized: String[],
 *      awaitLock: Boolean,
 *      accept: (globals: Globals, serverID: Discord.Snowflake, userID: Discord.Snowflake) => Promise<void>,
 *      reject: (globals: Globals, serverID: Discord.Snowflake, userID: Discord.Snowflake) => Promise<void>
 * }}}
 */
let __react_confirm = null;
/**
 * @type {{[msg_token: String]: {
 *      timeout: Number,
 *      requester: String,
 *      authorized: String[],
 *      callbacks: {
 *          [buttonID: String]: {
 *              awaitLock: Boolean,
 *              callback: InteractableCallback, 
 *              title?: String }} }}}
 * }}}
 */
let __react_prompt = null;
/**
 * @type {{[msg_token: String]: {
 *      requester: String,
 *      isAuthorized: ControllerAuth,
 *      callbacks: {
 *          [buttonID: String]: {
 *              awaitLock: Boolean,
 *              callback: InteractableCallback, 
 *              title?: String }} }}}
 */
let __react_controller = null;
/**
 * @type {{[msg_token: String]: {
 *      timeout: Number,
 *      requester: String,
 *      authorized: String[],
 *      awaitLock: Boolean,
 *      buttonIDs: String[],
 *      interactionReply?: EphemeralReply,
 *      accept: (globals: Globals, serverID: Discord.Snowflake, userID: Discord.Snowflake, interaction: Discord.Interaction) => Promise<void>,
 *      reject: (globals: Globals, serverID: Discord.Snowflake, userID: Discord.Snowflake, interaction: Discord.Interaction) => Promise<void>
 * }}}
 */
let __button_confirm = null;
/**
 * @type {{[msg_token: String]: {
 *      timeout: Number,
 *      requester: String,
 *      authorized: String[],
 *      buttonIDs: String[],
 *      interactionReply?: EphemeralReply,
 *      callbacks: {
 *          [buttonID: String]: {
 *              awaitLock: Boolean,
 *              callback: InteractableCallback }} }}}
 */
let __button_prompt = null;
/**
 * @type {{[msg_token: String]: {
 *      requester: String,
 *      isAuthorized: ControllerAuth,
 *      buttonIDs: String[],
 *      callbacks: {
 *          [buttonID: String]: {
 *              awaitLock: Boolean,
 *              callback: InteractableCallback }} }}}
 */
let __button_controller = null;


let interactable_ReactionAdd_id = null;
let controller_MessageDelete_id = null;
let interactable_ButtonPress_id = null;

let expiredEmbed = new Discord.MessageEmbed({
    "title": "*expired*",
    "color": 16711680
});



//#region InteractablesLocal

/** clear and remove listener if no interactables */
async function interactableReactionAddCleaner (){
    if (reactInteractableEmpty()){
        logging.awaitLog(globals, "[[Interactables]] Removing reaction listener", 5);
        await botListeners.removeBotListener(interactable_ReactionAdd_id);
        interactable_ReactionAdd_id = null;
    }
}
/** @param {String} msg_token @returns {Boolean} whether all react interactables are empty */
function reactInteractableEmpty (){
    return (Object.keys(__react_confirm).length == 0 
         && Object.keys(__react_prompt).length == 0
         && Object.keys(__react_controller).length == 0)
}
/** @param {String} msg_token @returns {Boolean} whether the message with message token has a reactInteractable attached */
function reactInteractableExists (msg_token){
    return ( __react_confirm.hasOwnProperty(msg_token) 
          || __react_prompt.hasOwnProperty(msg_token) 
          || __react_controller.hasOwnProperty(msg_token) )
}


/** clear and remove listener if no interactables */
async function interactableMessageDeleteCleaner (){
    if (controllerInteractablesEmpty()){
        logging.awaitLog(globals, "[[Interactables]] Removing message delete listener", 5);
        await botListeners.removeBotListener(controller_MessageDelete_id);
        controller_MessageDelete_id = null;
    }
}
/** @param {String} msg_token @returns {Boolean} whether all react interactables are empty */
function controllerInteractablesEmpty (){
    return (Object.keys(__react_controller).length == 0
        && Object.keys(__button_controller).length == 0)
}


/** clear and remove listener if no interactables */
async function interactableButtonCleaner (){
    if (buttonInteractableEmpty()){
        logging.awaitLog(globals, "[[Interactables]] Removing button interaction listener", 5);
        await botListeners.removeBotListener(interactable_ButtonPress_id);
        interactable_ButtonPress_id = null;
    }
}
/** @param {String} msg_token @returns {Boolean} whether all button interactables are empty */
function buttonInteractableEmpty (){
    return (Object.keys(__button_confirm).length == 0 
         && Object.keys(__button_prompt).length == 0
         && Object.keys(__button_controller).length == 0)
}


/** on messageReactionAdd, handle reaction if it is a react interactable (prompt/confirm/controller)
 * @param {Discord.MessageReaction} messageReaction 
 * @param {Discord.User} user 
 */
async function interactableHandleReactionAdd (messageReaction, user){
    if ( user.id === user.client.user.id )   return;
    let message = messageReaction.message;
    let msg_token = message.guild.id+"/"+message.channel.id+"/"+message.id;

    if ( !__react_confirm.hasOwnProperty(msg_token) 
      && !__react_prompt.hasOwnProperty(msg_token) 
      && !__react_controller.hasOwnProperty(msg_token) )
        return;

    globals = getGlobals();
    let emote = resolveEmote(messageReaction.emoji);
    try{
        if ( __react_confirm.hasOwnProperty(msg_token) ){ 

            if ( emote.string !== '🟢' && emote.string !== '🟥' )   return;
            if ( !__react_confirm[msg_token].authorized.includes(user.id) ){ //auth user
                let authReply = await message.channel.send("<@"+user.id+"> you are not authorized to use this react_confirm prompt <"+url_prefix+msg_token+">.\n*this message will delete itself in 9 seconds*");
                setTimeout(_ => authReply.delete().catch(console.error) , 9000);
                messageReaction.users.remove(user);
                return;
            }
            clearTimeout(__react_confirm[msg_token].timeout);
            let requester = __react_confirm[msg_token].requester;
            let callbackType = (emote.string === '🟢' ? 'accept' : 'reject');
            if (__react_confirm[msg_token][callbackType]){
                if (!__react_confirm[msg_token].awaitLock){
                    try { await __react_confirm[msg_token][callbackType](globals, message.guild.id, user.id, msg_token); }
                    catch (err){ console.error(err) }
                    finally { delete __react_confirm[msg_token]; }
                }
                else{
                    await workLock.acquire("react_confirm["+msg_token+"]"+requester+"-"+emote.string);
                    try { await __react_confirm[msg_token][callbackType](globals, message.guild.id, user.id, msg_token); }
                    catch (err){ console.error(err) }
                    finally {
                        delete __react_confirm[msg_token];
                        workLock.release("react_confirm["+msg_token+"]"+requester+"-"+emote.string);
                    }
                }
            }
            else { delete __react_confirm[msg_token]; }
        }



        else if ( __react_prompt.hasOwnProperty(msg_token) ){

            if ( !__react_prompt[msg_token].callbacks.hasOwnProperty(emote.emote) )   return;
            if ( !__react_prompt[msg_token].authorized.includes(user.id) ){ //auth user
                let authReply = await message.channel.send("<@"+user.id+"> you are not authorized to use this react prompt <"+url_prefix+msg_token+">.\n*this message will delete itself in 9 seconds*");
                setTimeout(_ => authReply.delete().catch(console.error) , 9000);
                messageReaction.users.remove(user);
                return;
            }

            clearTimeout(__react_prompt[msg_token].timeout);
            let requester = __react_prompt[msg_token].requester;
            if (__react_prompt[msg_token].callbacks[emote.emote].awaitLock){
                await workLock.acquire("react_prompt["+msg_token+"]"+requester+"-"+emote.string);
                try {
                    await __react_prompt[msg_token].callbacks[emote.emote].callback(globals, message.guild.id, user.id, msg_token);
                }
                catch (err){ console.error(err) }
                finally {
                    delete __react_prompt[msg_token];
                    workLock.release("react_prompt["+msg_token+"]"+requester+"-"+emote.string);
                }
            }
            else {
                try { await __react_prompt[msg_token].callbacks[emote.emote].callback(globals, message.guild.id, user.id, msg_token); }
                catch (err){ console.error(err) }
                finally { delete __react_prompt[msg_token]; }
            }
        }



        else if ( __react_controller.hasOwnProperty(msg_token) ){

            if ( !__react_controller[msg_token].callbacks.hasOwnProperty(emote.emote) )   return;
            messageReaction.users.remove(user);
            let requester = __react_controller[msg_token].requester;
            try{
                if ( !(await __react_controller[msg_token].isAuthorized(globals, message.guild.id, user.id)) ){ //auth user
                    let authReply = await user.send("<@"+user.id+"> you are not authorized to use this react controller <"+url_prefix+msg_token+">.\n*this message will delete itself in 9 seconds*").catch(err => {console.error(err); return;});
                    setTimeout(_ => authReply.delete().catch(console.error) , 9000);
                    return;
                }
            }
            catch (err){
                logging.awaitLog(globals, "REACT_CONTROLLER ERROR ["+requester+"] "+url_prefix+msg_token+"\n"+err, 5);
                await message.channel.send("An error occurred:\n"+err).catch(err => {console.error(err); return;});
                return;
            }
            if (__react_controller[msg_token].callbacks[emote.emote].awaitLock){
                await workLock.acquire("react_controller["+msg_token+"]"+requester+"-"+emote.string);
                try { await __react_controller[msg_token].callbacks[emote.emote].callback(globals, message.guild.id, user.id, msg_token); }
                catch (err){ console.error(err) }
                finally { workLock.release("react_controller["+msg_token+"]"+requester+"-"+emote.string); }
            }
            else
                await __react_controller[msg_token].callbacks[emote.emote].callback(globals, message.guild.id, user.id, msg_token);
        }

    }
    catch (err){ console.error(err); }
    finally { //check to remove listener
        await interactableReactionAddCleaner();
    }
}



/** on messageDelete, handle deleted message if it is a controller interactable (react/button)
 * @param {Discord.Message} deleted_msg
 */
async function interactableHandleMessageDelete (deleted_msg){
    let msg_token = deleted_msg.guild.id+"/"+deleted_msg.channel.id+"/"+deleted_msg.id;

    if ( !__react_controller.hasOwnProperty(msg_token) 
    && !__button_controller.hasOwnProperty(msg_token) ) return;

    globals = getGlobals();

    logging.awaitLog(globals, "[[Interactables]] Clearing interactable controller "+msg_token, 5);

    if ( __react_controller.hasOwnProperty(msg_token) ) {
        delete __react_controller[msg_token];
    }
    if ( __button_controller.hasOwnProperty(msg_token) ) {
        delete __button_controller[msg_token];
    }
    await interactableMessageDeleteCleaner();
}


/** on interactionCreate, handle interaction if it is a button interactable (prompt/confirm/controller)
 * @param {Discord.ButtonInteraction} interaction 
 */
async function interactableHandleButton (interaction){
    if ( !interaction || !interaction.isButton() || !interaction.isRepliable() ) return;

    let message = interaction.message;
    let msg_token = message.guild.id+"/"+message.channel.id+"/"+message.id;

    if ( !__button_confirm.hasOwnProperty(msg_token) 
      && !__button_prompt.hasOwnProperty(msg_token) 
      && !__button_controller.hasOwnProperty(msg_token) )
        return;

    globals = getGlobals();

    ///** @type {Discord.MessageButton} */
    let button = interaction.component;
    //let server = interaction.guild;
    //let channel = interaction.channel;
    //interaction.ephemeral
    let customID = interaction.customId;
    let user = interaction.user;

    try{
        if ( __button_confirm.hasOwnProperty(msg_token) ){
            if ( !__button_confirm[msg_token].buttonIDs.includes(customID) )  return;
            if ( !__button_confirm[msg_token].authorized.includes(user.id) ){
                await interaction.reply({content: "<@"+user.id+"> you are not authorized to use this button_confirm prompt", ephemeral: true})
                return;
            }
            else await interaction.deferReply({ephemeral: true});
            clearTimeout(__button_confirm[msg_token].timeout);
            let requester = __button_confirm[msg_token].requester;
            await interaction.editReply({content: (button.emoji.id ? "<:"+button.emoji.name+":"+button.emoji.id+">" : button.emoji.name)+" "+button.label});
            //await ((interaction.replied || interaction.deferred) ? interaction.editReply : interaction.reply)({content: button.emoji+" "+button.label, ephemeral: true}); 
            if (__button_confirm[msg_token][customID]){ //'reject' can be null
                if (!__button_confirm[msg_token].awaitLock){
                    try { await __button_confirm[msg_token][customID](globals, message.guild.id, user.id, msg_token, interaction); }
                    catch (err){ console.error(err) }
                    finally {
                        if (__button_confirm[msg_token].interactionReply){ //button in ephemeral reply
                            let actionRows = getDisabledComponents(message, __button_confirm[msg_token].buttonIDs);
                            await interaction.editReply({content: message.content, components: actionRows}); 
                        }
                        else //regular message
                            await disableComponents(message, __button_confirm[msg_token].buttonIDs);
                        delete __button_confirm[msg_token]; 
                    }
                    return;
                }
                else{
                    await workLock.acquire("button_confirm["+msg_token+"]"+requester+"-"+customID);
                    try { await __button_confirm[msg_token][customID](globals, message.guild.id, user.id, msg_token, interaction); }
                    catch (err){ console.error(err) }
                    finally {
                        if (__button_confirm[msg_token].interactionReply){ //button in ephemeral reply
                            let actionRows = getDisabledComponents(message, __button_confirm[msg_token].buttonIDs);
                            await interaction.editReply({content: message.content, components: actionRows}); 
                        }
                        else //regular message
                            await disableComponents(message, __button_confirm[msg_token].buttonIDs);
                        delete __button_confirm[msg_token]; 
                        workLock.release("button_confirm["+msg_token+"]"+requester+"-"+customID);
                    }
                }
            }
            else { delete __button_confirm[msg_token]; }
        }



        if ( __button_prompt.hasOwnProperty(msg_token) ){
            if ( !__button_prompt[msg_token].buttonIDs.includes(customID) )  return;
            if ( !__button_prompt[msg_token].authorized.includes(user.id) ){
                await interaction.reply({content: "<@"+user.id+"> you are not authorized to use this button_confirm prompt", ephemeral: true})
                return;
            }
            else await interaction.deferReply({ephemeral: true});
            clearTimeout(__button_prompt[msg_token].timeout);
            let requester = __button_prompt[msg_token].requester;
            await interaction.editReply({content: (button.emoji.id ? "<:"+button.emoji.name+":"+button.emoji.id+">" : button.emoji.name)+" "+button.label});
            //await ((interaction.replied || interaction.deferred) ? interaction.editReply : interaction.reply)({content: button.emoji+" "+button.label, ephemeral: true}); 
            if (__button_prompt[msg_token].callbacks[customID].awaitLock){
                try { await __button_prompt[msg_token].callbacks[customID].callback(globals, message.guild.id, user.id, msg_token, interaction); }
                    catch (err){ console.error(err) }
                    finally { 
                        if (__button_prompt[msg_token].interactionReply){ //button in ephemeral reply
                            let actionRows = getDisabledComponents(message, __button_prompt[msg_token].buttonIDs);
                            await interaction.editReply({content: message.content, components: actionRows}); 
                        }
                        else //regular message
                            await disableComponents(message, __button_prompt[msg_token].buttonIDs);
                        delete __button_prompt[msg_token];
                    }
                    return;
            }
            //else
            await workLock.acquire("button_prompt["+msg_token+"]"+requester+"-"+customID);
            try { await __button_prompt[msg_token].callbacks[customID].callback(globals, message.guild.id, user.id, msg_token, interaction); }
            catch (err){ console.error(err) }
            finally {
                if (__button_prompt[msg_token].interactionReply){ //button in ephemeral reply
                    let actionRows = getDisabledComponents(message, __button_prompt[msg_token].buttonIDs);
                    await interaction.editReply({content: message.content, components: actionRows}); 
                }
                else //regular message
                    await disableComponents(message, __button_prompt[msg_token].buttonIDs);
                delete __button_prompt[msg_token];
                workLock.release("button_prompt["+msg_token+"]"+requester+"-"+customID);
            }
        }



        if ( __button_controller.hasOwnProperty(msg_token) ){
            if ( !__button_controller[msg_token].buttonIDs.includes(customID) )  return;
            let requester = __button_controller[msg_token].requester;
            try {
                if ( !(await __button_controller[msg_token].isAuthorized(globals, message.guild.id, user.id)) ){ //auth user
                    await interaction.reply({content: "<@"+user.id+"> you are not authorized to use this button controller", ephemeral: true})
                    return;
                }
                else await interaction.deferReply({ephemeral: true});
            }
            catch (err){
                await logging.awaitLog(globals, "BUTTON_CONTROLLER ERROR ["+requester+"] "+url_prefix+msg_token+"\n"+err, 5);
                await message.channel.send("An error occurred:\n"+err).catch(err => {console.error(err); return;});
                return;
            }
            await interaction.editReply({content: (button.emoji.id ? "<:"+button.emoji.name+":"+button.emoji.id+">" : button.emoji.name)+" "+button.label});
            //await ((interaction.replied || interaction.deferred) ? interaction.editReply : interaction.reply)({content: button.emoji+" "+button.label, ephemeral: true}); 
            if (__button_controller[msg_token].callbacks[customID].awaitLock){
                await workLock.acquire("button_controller["+msg_token+"]"+requester+"-"+customID);
                try { await __button_controller[msg_token].callbacks[customID].callback(globals, message.guild.id, user.id, msg_token, interaction); }
                catch (err){ console.error(err) }
                finally { workLock.release("button_controller["+msg_token+"]"+requester+"-"+customID); }
            }
            else
                await __button_controller[msg_token].callbacks[customID].callback(globals, message.guild.id, user.id, msg_token, interaction);
        }
    }
    catch (err){ console.error(err); }
    finally {
        await interactableButtonCleaner();
    }
}
//#endregion InteractablesLocal



//#region InteractablesExport

//#region Process
function __startup(globals){
    __react_confirm = {};
    __react_prompt = {};
    __react_controller = {};
    __button_confirm = {};
    __button_prompt = {};
    __button_controller = {};
    interactable_ReactionAdd_id = null;
    controller_MessageDelete_id = null;
    interactable_ButtonPress_id = null;
}
async function __shutdown(globals){
    console.log("[Interactables shutdown]");
    await botListeners.removeBotListener(interactable_ReactionAdd_id);
    interactable_ReactionAdd_id = null;
    await botListeners.removeBotListener(controller_MessageDelete_id);
    controller_MessageDelete_id = null;
    await botListeners.removeBotListener(interactable_ButtonPress_id);
    interactable_ButtonPress_id = null;

    //react interactables
    let keys = Object.keys(__react_confirm);
    console.log("    __react_confirm  ("+keys.length+")");
    for (let msg_token of keys ){
        console.log("        shutdown for "+msg_token);
        clearTimeout(__react_confirm[msg_token].timeout);
        delete __react_confirm[msg_token];
        try{
            let resolve = msg_token.split("/");
            let message = await fetchMessage(globals, resolve[0], resolve[1], resolve[2], false);
            await message.edit({content: message.content, embeds: [expiredEmbed]});
        }
        catch (err){ console.error(err); }
    }
    keys = Object.keys(__react_prompt);
    console.log("    __react_prompt  ("+keys.length+")");
    for (let msg_token of keys ){
        console.log("        shutdown for "+msg_token);
        clearTimeout(__react_prompt[msg_token].timeout);
        delete __react_prompt[msg_token];
        try{
            let resolve = msg_token.split("/");
            let message = await fetchMessage(globals, resolve[0], resolve[1], resolve[2], false);
            await message.edit({content: message.content, embeds: [expiredEmbed]});
        }
        catch (err){ console.error(err); }
    }
    keys = Object.keys(__react_controller);
    console.log("    __react_controller  ("+keys.length+")");
    for (let msg_token of keys ){
        console.log("        shutdown for "+msg_token);
        delete __react_controller[msg_token];
        try{
            let resolve = msg_token.split("/");
            let message = await fetchMessage(globals, resolve[0], resolve[1], resolve[2], false);
            await message.edit({content: message.content, embeds: [expiredEmbed]});
        }
        catch (err){ console.error(err); }
    }

    //button interactables
    keys = Object.keys(__button_confirm);
    console.log("    __button_confirm  ("+keys.length+")");
    for (let msg_token of keys ){
        console.log("        shutdown for "+msg_token);
        clearTimeout(__button_confirm[msg_token].timeout);
        let interaction = __button_confirm[msg_token].interactionReply?.interaction ?? null;
        let actionRows = getDisabledComponents(message, __button_confirm[msg_token].buttonIDs);
        delete __button_confirm[msg_token];
        try{
            if (interaction) //button in ephemeral reply
                await interaction.editReply({content: message.content, components: actionRows}); 
            else{ //regular message
                let resolve = msg_token.split("/");
                let message = await fetchMessage(globals, resolve[0], resolve[1], resolve[2], false);
                await message.edit({content: message.content,embeds: [...(message.embeds ?? []),expiredEmbed], components: actionRows});
            }
        }
        catch (err){ console.error("["+msg_token+"] "+err.name+" ::  "+err.message); }
    }
    keys = Object.keys(__button_prompt);
    console.log("    __button_prompt  ("+keys.length+")");
    for (let msg_token of keys ){
        console.log("        shutdown for "+msg_token);
        clearTimeout(__button_prompt[msg_token].timeout);
        let interaction = __button_prompt[msg_token].interactionReply?.interaction ?? null;
        let actionRows = getDisabledComponents(message, __button_prompt[msg_token].buttonIDs);
        delete __button_prompt[msg_token];
        try{
            if (interaction) //button in ephemeral reply
                await interaction.editReply({content: message.content, components: actionRows}); 
            else{ //regular message
                let resolve = msg_token.split("/");
                let message = await fetchMessage(globals, resolve[0], resolve[1], resolve[2], false);
                await message.edit({content: message.content,embeds: [...(message.embeds ?? []),expiredEmbed], components: actionRows});
            }
        }
        catch (err){ console.error("["+msg_token+"] "+err.name+" ::  "+err.message); }
    }
    keys = Object.keys(__button_controller);
    console.log("    __button_controller  ("+keys.length+")");
    for (let msg_token of keys ){
        console.log("        shutdown for "+msg_token);
        let actionRows = getDisabledComponents(message, __button_controller[msg_token].buttonIDs);
        delete __button_controller[msg_token];
        try{
            let resolve = msg_token.split("/");
            let message = await fetchMessage(globals, resolve[0], resolve[1], resolve[2], false);
            await message.edit({content: message.content,embeds: [...(message.embeds ?? []),expiredEmbed], components: actionRows});
        }
        catch (err){ console.error("["+msg_token+"] "+err.name+" ::  "+err.message); }
    }
}
module.exports.__startup = __startup;
module.exports.__shutdown = __shutdown;
//#endregion Process


/** Used to create a button interactable (prompt/confirm/controller) from an interaction
 * @param {Discord.Interaction} interaction 
 * @param {Discord.WebhookEditMessageOptions} options MessageOptions if not ephemeral, otherwise if ephemeral then WebhookEditMessageOptions
 */
 class EphemeralReply {
    /** @type {Discord.Interaction}  */
    #_interaction;
    /** @type {Discord.WebhookEditMessageOptions}  */
    #_options;
    /**
     * 
     * @param {Discord.Interaction} interaction 
     * @param {Discord.WebhookEditMessageOptions} options otherwise if ephemeral then WebhookEditMessageOptions
     */
    constructor (interaction, options){
        //if ( !interaction instanceof Discord.Interaction ){ throw new Error("Invalid interaction"); }
        //if ( !options instanceof Discord.MessageOptions && !options instanceof Discord.WebhookEditMessageOptions ){ throw new Error("Invalid options"); }
        this.#_interaction = interaction;
        this.#_options = options;
    }
    get options (){ return this.#_options; }
    get interaction (){ return this.#_interaction; }
}
module.exports.EphemeralReply = EphemeralReply;









//#region Button Interactables


/**
 * Create a button confirmation prompt, which remains active for a certain window and runs a callback depending on button interaction;
 *  callbacks shouldn't attempt acquiring work_lock
 * @param {Globals} globals --
 * @param {ButtonConfirmArgs} args 
 * @throws if a button prompt or an error occurs
 * @return {Promise<String>} the message_token used to identify the button confirm prompt
 */
async function button_confirm (globals, args){
    let requester_title = args.requester ?? "button_confirm_anon";
    let channel = args.targetChannel;
    let options = args.options;
    let window_seconds = Math.min(Math.max( (args.window ?? DEFAULT_PROMPT_WINDOW), DEFAULT_PROMPT_MIN_WINDOW), DEFAULT_PROMPT_MAX_WINDOW);
    let authorized_user_IDs = args.authorizedUsers.map(id => id.trim());
    let awaitLock = args.awaitLock ?true:false;
    let ACCEPT_callback = args.acceptCallback;
    let REJECT_callback = args.rejectCallback;
    let buttonIDs = ['accept','reject'];

    /* error check */
    if (options instanceof EphemeralReply && !options.interaction.isRepliable())
        throw new Error("Invalid Interaction:  Not repliable");
    if (authorized_user_IDs.length < 1) 
        throw new Error("Invalid authorized list:  Must provide at least one member ID");
    if (typeof ACCEPT_callback !== "function")
        throw new Error("Invalid ACCEPT_callback:  Not a function");
    if (typeof REJECT_callback !== "function" && REJECT_callback != null)
        throw new Error("Invalid REJECT_callback:  Not a function");
    if (channel.type === "GUILD_TEXT"){
        for (let mID of authorized_user_IDs){
            if ( !channel.guild.members.resolve(mID) ) throw new Error("Invalid authorized id:  Cannot resolve member id: "+mID);
        }
    }
    else if (channel.type === "DM" && !authorized_user_IDs.includes(channel.recipient?.id))
        throw new Error("Invalid authorized id:  Must authorize the DM recipient");
    else 
        throw new Error("Invalid target channel:  Must be a text channel or DM channel");
    
    

    if (options instanceof EphemeralReply && options.interaction.isRepliable()){
        options.interaction.deferReply({ephemeral: true});
    }
    if (options instanceof EphemeralReply && !options.interaction.isRepliable()) options = options.options;

    /* create the eventlistener if none */
    if ( !interactable_ReactionAdd_id ){
        logging.log(globals, "--setting up button event listener");
        interactable_ReactionAdd_id = botListeners.acquireBotListener('interactionCreate');
        botListeners.addBotListener(interactable_ReactionAdd_id, globals.client, 'interactionCreate', interactableHandleButton);
    }

    /* post button message */
    let embed = new Discord.MessageEmbed( {color: 16777086, footer: {text: "expires in "+window_seconds+" seconds"}} );
    let acceptComponent = new Discord.MessageButton()
        .setCustomId("accept")
        .setLabel("Accept")
        .setEmoji('☑️')
        .setStyle("SUCCESS");
    let rejectComponent = new Discord.MessageButton()
        .setCustomId("reject")
        .setLabel("Reject")
        .setEmoji('✖️')
        .setStyle("DANGER");
    let actionRow = new Discord.MessageActionRow().addComponents(acceptComponent).addComponents(rejectComponent);
    let target_msg;
    if (options instanceof EphemeralReply){
        let msg_options = options.options;
        msg_options["components"] = [actionRow]; //will overwrite 
        msg_options["embeds"] = [...(msg_options.embeds ?? []), embed];
        target_msg = await options.interaction.editReply(msg_options);
    }
    else {
        options["components"] = [actionRow]; //will overwrite 
        options["embeds"] = [...(options.embeds ?? []), embed];
        target_msg =  await channel.send(options);
    }
    let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
    logging.log(globals, "--prompt sent: "+msg_token);

    /* create timeout */
    logging.log(globals, "--setting expiration timeout for "+window_seconds+" seconds");
    let timeout = setTimeout(async (globals, msg_token) => {
        await logging.awaitLog(globals,  "BUTTON_CONFIRM expired ["+__button_confirm[msg_token].requester+"] "+url_prefix+msg_token, 5);
        let temp = __button_confirm[msg_token];
        delete __button_confirm[msg_token];
        await interactableButtonCleaner();
        if (temp.interactionReply){
            let message = temp.interactionReply.interaction?.message;
            let actionRows = getDisabledComponents(message, temp.buttonIDs);
            await temp.interactionReply.interaction.editReply({content: message.content, components: actionRows}); 
        }
        else{
            let resolvables = msg_token.split("/");
            let server = await globals.client.guilds.fetch( resolvables[0] );
            let channel = server.channels.resolve( resolvables[1] );
            let message = await channel.messages.fetch( resolvables[2] );
            let actionRows = getDisabledComponents(message, temp.buttonIDs);
            await message.edit({content: message.content, embeds: [...(message.embeds ?? []), expiredEmbed], components: (actionRows ?? message.components)});
        }
    }, 1000*window_seconds, globals, msg_token);

    logging.log(globals, "--button confirm prompt setup complete");

    /* store info */
    __button_confirm[msg_token] = {
        'timeout':  timeout,
        'requester': requester_title,
        'authorized': authorized_user_IDs,
        'awaitLock' : awaitLock,
        'accept': ACCEPT_callback,
        'reject': REJECT_callback,
        'buttonIDs': buttonIDs
    };
    if (options instanceof EphemeralReply)
        __button_confirm[msg_token]['interactionReply'] = options;
}



/**
 * Create a button prompt, which remains active for a certain window and runs a callback depending on button interaction;
 *  callbacks shouldn't attempt to acquire the worklock
 * @param {Globals} globals --
 * @param {ButtonPromptArgs} args 
 * @throws if error occurs
 * @return {Promise<String>} the message_token used to identify the button prompt
 */
async function button_prompt (globals, args){
    let requester_title = args.requester ?? "button_prompt_anon";
    let channel = args.targetChannel;
    let options = args.options;
    let window_seconds = Math.min(Math.max( (args.window ?? DEFAULT_PROMPT_WINDOW), DEFAULT_PROMPT_MIN_WINDOW), DEFAULT_PROMPT_MAX_WINDOW);
    let authorized_user_IDs = args.authorizedUsers.map(id => id.trim());
    let callbacks = args.callbacks;
    let buttonIDs = [];

    let grid = [[null,null,null,null,null], //A1, A2, ...
                [null,null,null,null,null],
                [null,null,null,null,null],
                [null,null,null,null,null],
                [null,null,null,null,null]]; //E1, E2, ...
    let remainder = [];

    /* error check & parsing */
    if (options instanceof EphemeralReply && !options.interaction.isRepliable())
        throw new Error("Invalid Interaction:  Not repliable");
    if (authorized_user_IDs.length < 1) 
        throw new Error("Invalid authorized list:  Must provide at least one member ID");
    if (Object.keys(callbacks).length > 25) 
        throw new Error("Invalid amount of buttons:  Must be 25 or less");
    if (channel.type === "GUILD_TEXT"){
        for (let mID of authorized_user_IDs){
            if ( !channel.guild.members.resolve(mID) ) throw new Error("Invalid authorized id:  Cannot resolve member id: "+mID);
        }
    }
    else if (channel.type === "DM" && !authorized_user_IDs.includes(channel.recipient?.id))
        throw new Error("Invalid authorized id:  Must authorize the DM recipient");
    else 
        throw new Error("Invalid target channel:  Must be a text channel or DM channel");
    for ( let emote_key of Object.keys(callbacks) ){ 
        if (!callbacks[emote_key].hasOwnProperty('callback')) 
            throw new Error("Invalid callback: 'callback' for ["+emote_key+"] is missing");
        if (typeof callbacks[emote_key].callback !== 'function') 
            throw new Error("Invalid callback: callback for ["+emote_key+"] must be a function");
        if ( !callbacks[emote_key].hasOwnProperty('title'))
            throw new Error("Invalid button: Must provide a title");
        if (!callbacks[emote_key].hasOwnProperty('awaitLock')) 
            callbacks[emote_key].awaitLock = true; //default true

        let emote = resolveEmote_string(emote_key);
        callbacks[emote_key]['emote'] = emote.string;
        let buttonID = emote.emote+"|"+(cleanSpaces(callbacks[emote_key].title).replace(/\s/g,"_") ?? "button");
        buttonIDs.push(buttonID);
        callbacks[buttonID] = callbacks[emote_key];
        delete callbacks[emote_key];

        //add to grid and check
        if (callbacks[buttonID].buttonPosition){
            if ( callbacks[buttonID].buttonPosition.length  != 2 || !callbacks[buttonID].buttonPosition.charAt(0).match(/[A-Za-z0-9]/g) ) 
                throw new Error("Invalid buttonPosition");
            let row = ( callbacks[buttonID].buttonPosition.charAt(0).match(/[A-Za-z]/g) ? letterToInt(callbacks[buttonID].buttonPosition.charAt(0)) : parseInt(callbacks[buttonID].buttonPosition.charAt(0)) ) - 1;
            let col = parseInt(callbacks[buttonID].buttonPosition.charAt(1)) - 1;
            if (grid[row][col] != null)
                throw new Error("Duplicate buttonPosition");
            else 
                grid[row][col] = buttonID;
        }
        else remainder.push(buttonID);
    }
    grid = grid.map(row => row.filter(i => i != null)).filter(row => row.length != 0);
    let slot = 0;
    for (_ of remainder){
        while (slot % 5 == 0 || slot > 24){
            let row = ~~(slot/5); 
            slot += grid[row].length
            if (grid[row].length < 5) // or (slot % 5 == 0)
                break;
        }
        grid[~~(slot/5)].push( remainder.splice(0,1)[0] );  //grid[~~(slot/5)][(slot % 5)] = remainder.splice(0,1)[0];
    }

    if (options instanceof EphemeralReply && options.interaction.isRepliable()){
        await options.interaction.deferReply({ephemeral: true});
    }
    else if (options instanceof EphemeralReply && !options.interaction.isRepliable()) options = options.options;    

    /* create the eventlistener if none */
    if ( !interactable_ReactionAdd_id ){
        logging.log(globals, "--setting up button event listener");
        interactable_ReactionAdd_id = botListeners.acquireBotListener('interactionCreate');
        botListeners.addBotListener(interactable_ReactionAdd_id, globals.client, 'interactionCreate', interactableHandleButton);
    }

    /* post button message */
    let embed = new Discord.MessageEmbed( {color: 16777086, footer: {text: "expires in "+window_seconds+" seconds"}} );
    let actionRows = [];
    for ( let row of grid ){
        let actionRow = new Discord.MessageActionRow();
        for (let buttonID of row){
            let buttonComponent = new Discord.MessageButton()
                .setCustomId(buttonID)
                .setLabel(callbacks[buttonID].title)
                .setEmoji(callbacks[buttonID].emote)
                .setStyle(callbacks[buttonID].buttonStyle ?? "SECONDARY");
            actionRow.addComponents(buttonComponent);    
            delete callbacks[buttonID].buttonStyle;
            delete callbacks[buttonID].buttonPosition;
            delete callbacks[buttonID].emote;
            delete callbacks[buttonID].title;
        }
        actionRows.push(actionRow);
    }
    let target_msg;
    if (options instanceof EphemeralReply){
        let msg_options = options.options;
        msg_options["components"] = actionRows; //will overwrite 
        msg_options["embeds"] = [...(msg_options.embeds ?? []), embed];
        target_msg = await options.interaction.editReply(msg_options);
    }
    else {
        options["components"] = actionRows; //will overwrite 
        options["embeds"] = [...(options.embeds ?? []), embed];
        target_msg =  await channel.send(options);
    }
    let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
    logging.log(globals, "--prompt sent: "+msg_token);

    /* create timeout */
    logging.log(globals, "--setting expiration timeout for "+window_seconds+" seconds");
    let timeout = setTimeout(async (globals, msg_token) => {
        await logging.awaitLog(globals,  "BUTTON_PROMPT expired ["+__button_prompt[msg_token].requester+"] "+url_prefix+msg_token, 5);
        let temp = __button_prompt[msg_token];
        delete __button_prompt[msg_token];
        await interactableButtonCleaner();
        if (temp.interactionReply){
            let message = temp.interactionReply.interaction?.message;
            let actionRows = getDisabledComponents(message, temp.buttonIDs);
            await temp.interactionReply.interaction.editReply({content: message.content, components: actionRows}); 
        }
        else{
            let resolvables = msg_token.split("/");
            let server = await globals.client.guilds.fetch( resolvables[0] );
            let channel = server.channels.resolve( resolvables[1] );
            let message = await channel.messages.fetch( resolvables[2] );
            let actionRows = getDisabledComponents(message, temp.buttonIDs);
            await message.edit({content: message.content, embeds: [...(message.embeds ?? []), expiredEmbed], components: (actionRows ?? message.components)});
        }
    }, 1000*window_seconds, globals, msg_token);

    logging.log(globals, "--button confirm prompt setup complete");

    /* store info */
    __button_prompt[msg_token] = {
        'timeout':  timeout,
        'requester': requester_title,
        'authorized': authorized_user_IDs,
        'callbacks': callbacks,
        'buttonIDs': buttonIDs
    };
    if (options instanceof EphemeralReply)
        __button_prompt[msg_token]['interactionReply'] = options;
}


/**
 * Create message with the given content that runs callbacks on certain button presses, which remains active indefinitely (until bot is shutdown);
 *   callbacks shouldn't request worklock within the function, instead set the 'awaitLock' property as true
 ** a button controller cannot be ephemeral
 * @param {Globals} globals --
 * @param {ButtonControllerArgs} args
 * @throws if error occurs
 * @return {Promise<String>} the message_token used to identify the button controller
 */
async function button_controller (globals, args){
    let requester_title = args.requester ?? "button_controller_anon";
    let channel = args.targetChannel;
    let options = args.options;
    let isAuthorized = args.isAuthorized;
    let callbacks = args.callbacks;
    let buttonIDs = [];

    let grid = [[null,null,null,null,null], //A1, A2, ...
                [null,null,null,null,null],
                [null,null,null,null,null],
                [null,null,null,null,null],
                [null,null,null,null,null]]; //E1, E2, ...
    let remainder = [];

    /* error check & parsing */
    if (options instanceof EphemeralReply)
        throw new Error("Invalid options:  Cannot be ephemeral reply");
    if (typeof isAuthorized !== "function")
        throw new Error("Invalid isAuthorized:  Must be a function");
    if (Object.keys(callbacks).length > 24)
        throw new Error("Invalid amount of buttons:  Must be 24 or less");
    if (channel.type !== "GUILD_TEXT" && channel.type !== "DM")
        throw new Error("Invalid target channel:  Must be a text channel or DM channel");
    for ( let emote_key of Object.keys(callbacks) ){ 
        if (!callbacks[emote_key].hasOwnProperty('callback')) 
            throw new Error("Invalid callback: 'callback' for ["+emote_key+"] is missing");
        if (typeof callbacks[emote_key].callback !== 'function') 
            throw new Error("Invalid callback: callback for ["+emote_key+"] must be a function");
        if ( !callbacks[emote_key].hasOwnProperty('title'))
            throw new Error("Invalid button: Must provide a title");
        if (!callbacks[emote_key].hasOwnProperty('awaitLock')) 
            callbacks[emote_key].awaitLock = true; //default true

        let emote = resolveEmote_string(emote_key);
        if (emote.emote === '✖️') 
            throw ("✖️ is not allowed as a controller button");
        callbacks[emote_key]['emote'] = emote.string;
        let buttonID = emote.emote+"|"+(cleanSpaces(callbacks[emote_key].title).replace(/\s/g,"_") ?? "button");
        buttonIDs.push(buttonID);
        callbacks[buttonID] = callbacks[emote_key];
        delete callbacks[emote_key];

        //add to grid and check
        if (callbacks[buttonID].buttonPosition){
            if ( callbacks[buttonID].buttonPosition.length  != 2 || !callbacks[buttonID].buttonPosition.charAt(0).match(/[A-Za-z0-9]/g) ) 
                throw new Error("Invalid buttonPosition");
            let row = ( callbacks[buttonID].buttonPosition.charAt(0).match(/[A-Za-z]/g) ? letterToInt(callbacks[buttonID].buttonPosition.charAt(0)) : parseInt(callbacks[buttonID].buttonPosition.charAt(0)) ) - 1;
            let col = parseInt(callbacks[buttonID].buttonPosition.charAt(1)) - 1;
            if (grid[row][col] != null)
                throw new Error("Duplicate buttonPosition");
            else 
                grid[row][col] = buttonID;
        }
        else remainder.push(buttonID);
    
    }
    /* add ✖️ callback to destroy the controller */
    let X_callback = async (globals, serverID, userID, msg_token) => {
        logging.awaitLog(globals, "Destroying react controller "+msg_token, 5);
        delete __react_controller[msg_token];
        await interactableMessageDeleteCleaner();
        await interactableButtonCleaner();
        let resolvables = msg_token.split("/");
        let message = await fetchMessage(globals, resolvables[0], resolvables[1], resolvables[2], false);
        await message.delete(); //delete controller message
    };
    callbacks['✖️|destroy_controller'] = {emote: "✖️", title: "Close", awaitLock: false, callback: X_callback, buttonStyle: "DANGER"};
    remainder.push('✖️|destroy_controller');
    buttonIDs.push('✖️|destroy_controller');

    grid = grid.map(row => row.filter(i => i != null)).filter(row => row.length != 0);
    let slot = 0;
    for (_ of remainder){
        while (slot % 5 == 0 || slot > 24){
            let row = ~~(slot/5); 
            slot += grid[row].length
            if (grid[row].length < 5) // or (slot % 5 == 0)
                break;
        }
        grid[~~(slot/5)].push( remainder.splice(0,1)[0] );  //grid[~~(slot/5)][(slot % 5)] = remainder.splice(0,1)[0];
    }

    /* create the eventlistener if none */
    if ( !interactable_ReactionAdd_id ){
        logging.log(globals, "--setting up button event listener");
        interactable_ReactionAdd_id = botListeners.acquireBotListener('interactionCreate');
        botListeners.addBotListener(interactable_ReactionAdd_id, globals.client, 'interactionCreate', interactableHandleButton);
    }
    /* create messageDelete listener to destroy the controller if none */
    if ( !controller_MessageDelete_id ){
        logging.log(globals, "--setting up message delete event listener");
        controller_MessageDelete_id = botListeners.acquireBotListener('messageDelete');
        botListeners.addBotListener(controller_MessageDelete_id, globals.client, 'messageDelete', interactableHandleMessageDelete);
    }
    logging.log(globals, "--button confirm controller setup complete");

    /* post button message */
    let actionRows = [];
    for ( let row of grid ){
        let actionRow = new Discord.MessageActionRow();
        for (let buttonID of row){
            let buttonComponent = new Discord.MessageButton()
                .setCustomId(buttonID)
                .setLabel(callbacks[buttonID].title)
                .setEmoji(callbacks[buttonID].emote)
                .setStyle(callbacks[buttonID].buttonStyle ?? "SECONDARY");
            actionRow.addComponents(buttonComponent);
            delete callbacks[buttonID].buttonStyle;
            delete callbacks[buttonID].buttonPosition;    
            delete callbacks[buttonID].emote;
            delete callbacks[buttonID].title;
        }
        actionRows.push(actionRow);
    }
    options["components"] = actionRows; //will overwrite 
    let target_msg =  await channel.send(options);
    let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
    logging.log(globals, "--controller sent: "+msg_token);
    
    /* store info */
    __button_controller[msg_token] = {
        'requester': requester_title,
        'isAuthorized': isAuthorized,
        'callbacks': callbacks,
        'buttonIDs': buttonIDs
    };
}

//#endregion Button Interactables
module.exports.button_confirm    = button_confirm;
module.exports.button_prompt     = button_prompt;
module.exports.button_controller = button_controller;



//#region React Interactables

/** Create a react confirmation prompt on a target message which remains active for a certain window and runs a callback depending on the reaction;
 *  callbacks shouldn't attempt acquiring work_lock
 * @param {Globals} globals --
 * @param {ReactConfirmArgs} args 
 * @throws {Error} if error occurs
 * @return {Promise<String>} the message_token used to identify the react confirm prompt
 */
async function react_confirm (globals, args){
    let requester_title = args.requester ?? "react_confirm_anon";
    let target_msg = args.targetMessage;
    let window_seconds = Math.min(Math.max( (args.window ?? DEFAULT_PROMPT_WINDOW), DEFAULT_PROMPT_MIN_WINDOW), DEFAULT_PROMPT_MAX_WINDOW);
    let authorized_user_IDs = args.authorizedUsers.map(id => id.trim());
    let awaitLock = args.awaitLock ?true:false;
    let ACCEPT_callback = args.acceptCallback;
    let REJECT_callback = args.rejectCallback;

    /* error checking */
    if (authorized_user_IDs.length < 1) 
        throw new Error("Invalid authorized list:  Must provide at least one member ID");
    /*if (getObjectName(target_msg) === Discord.Message.name)   //if (target_msg instanceof Discord.Message) 
        throw new Error("Invalid target message ::  Not type of Discord.Message, is type: "+getObjectName(target_msg));*/
    for (let mID of authorized_user_IDs){
        if ( !target_msg.guild.members.resolve(mID) ) throw new Error("Invalid authorized id:  Cannot resolve member id: "+mID);
    }
    let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
    if ( reactInteractableExists(msg_token) )
        throw new Error("A react interactable for the target message already exists");
    if (typeof ACCEPT_callback !== "function")
        throw new Error("Invalid ACCEPT_callback:  Not a function");
    if (typeof REJECT_callback !== "function" && REJECT_callback != null)
        throw new Error("Invalid REJECT_callback:  Not a function");

    logging.log(globals, "Creating react confirmation prompt");
    let embed = new Discord.MessageEmbed( {color: 16777086, footer: {text: "expires in "+window_seconds+" seconds"}} );
    await target_msg.react('🟢').catch(err => {throw (err)});
    await target_msg.react('🟥').catch(err => {throw (err)});
    if (target_msg.editable){
        await target_msg.edit({
            content: target_msg.content, 
            embeds: [...(target_msg.embeds ?? []), new Discord.MessageEmbed({
                "footer": {
                    "text": "🟢 Accept\n🟥 Reject"
                },
                "color": 4645612 
            }), embed ]
        });
    }

    /* add the react_confirm info */
    __react_confirm[msg_token] = {
        'timeout':  null,
        'requester': requester_title,
        'authorized': authorized_user_IDs,
        'awaitLock' : awaitLock,
        'accept': ACCEPT_callback,
        'reject': REJECT_callback
    };

    /* create the eventlistener if none */
    if ( !interactable_ReactionAdd_id ){
        logging.log(globals, "--setting up react event listener");
        interactable_ReactionAdd_id = botListeners.acquireBotListener('messageReactionAdd');
        botListeners.addBotListener(interactable_ReactionAdd_id, globals.client, 'messageReactionAdd', interactableHandleReactionAdd);
    }

    /* create the timeout */
    if ( window_seconds > 0 ){
        logging.log(globals, "--setting expiration timeout for "+window_seconds+" seconds");
        __react_confirm[msg_token]['timeout'] = setTimeout(async (globals, msg_token) => {
            logging.awaitLog(globals,  "REACT_CONFIRM expired ["+__react_confirm[msg_token].requester+"] "+url_prefix+msg_token, 5);
            delete __react_confirm[msg_token];
            await interactableReactionAddCleaner();
            let resolvables = msg_token.split("/");
            let server = await globals.client.guilds.fetch( resolvables[0] );
            let channel = server.channels.resolve( resolvables[1] );
            let message = await channel.messages.fetch( resolvables[2] );
            await message.edit({content: message.content, embeds: [...(target_msg.embeds ?? []), expiredEmbed]});
            //await message.channel.send("<"+url_prefix+msg_token+"> reaction confirmation prompt has timed out and expired");
        }, 1000*window_seconds, globals, msg_token);
    }
    logging.log(globals, "--react confirm prompt setup complete");
    return msg_token;
}


/**
 * Create message with the given content that runs callbacks on certain reactions, which remains active for a certain window;
 *  callbacks will await work_lock and shouldn't attempt to acquire the worklock
 * @param {Globals} globals --
 * @param {ReactPromptArgs} args 
 * @throws if error occurs
 * @return {Promise<String>} the message_token used to identify the react prompt
 */
async function react_prompt (globals, args){
    let requester_title = args.requester ?? "react_prompt_anon";;
    let target_msg = args.targetMessage;
    let window_seconds = Math.min(Math.max( (args.window ?? DEFAULT_PROMPT_WINDOW), DEFAULT_PROMPT_MIN_WINDOW), DEFAULT_PROMPT_MAX_WINDOW);
    let authorized_user_IDs = args.authorizedUsers.map(id => id.trim());
    let callbacks = args.callbacks;
    let embedTitles = [];

    /* error checking */
    if (authorized_user_IDs.length < 1) 
        throw new Error("Invalid authorized list:  Must provide at least one member ID");
    /*if (getObjectName(target_msg) === Discord.Message.name)   //if (target_msg instanceof Discord.Message) 
        throw new Error("Invalid target message ::  Not type of Discord.Message, is type: "+getObjectName(target_msg));*/
    for (let mID of authorized_user_IDs){
        if ( !target_msg.guild.members.resolve(mID) ) throw new Error("Invalid authorized id:  Cannot resolve member id: "+mID);
    }
    let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
    if ( reactInteractableExists(msg_token) )
        throw new Error("A react interactable for the target message already exists");

    logging.log(globals, "Creating react prompt");
    for ( let emote_key of Object.keys(callbacks) ){ 
        if (!callbacks[emote_key].hasOwnProperty('callback')) 
            throw new Error("Invalid callback: 'callback' for ["+emote_key+"] is missing");
        if (typeof callbacks[emote_key].callback !== 'function') 
            throw new Error("Invalid callback: callback for ["+emote_key+"] must be a function");
        if (!callbacks[emote_key].hasOwnProperty('awaitLock')) 
            callbacks[emote_key].awaitLock = true; //default true

        let emote = resolveEmote_string(emote_key);
        await target_msg.react( emote.emote ).catch(err => {throw (err)});
        if (callbacks[emote_key].hasOwnProperty('title'))
            embedTitles.push(emote.string + " " + callbacks[emote_key].title);
        delete callbacks[emote_key].title;
        if (emote.emote === emote_key)  continue;
        callbacks[emote.emote] = callbacks[emote_key];
        delete callbacks[emote_key];
    }
    let embed = new Discord.MessageEmbed( {color: 16777086, footer: {text: "expires in "+window_seconds+" seconds"}} );
    if (target_msg.editable){
        let embeds = [...(target_msg.embeds ?? []) ];
        if (embedTitles.length > 0) embeds.push( new Discord.MessageEmbed({
            "description": embedTitles.join("\n"),
            "color": 4645612 
        }) );
        embeds.push(embed);
        await target_msg.edit({
            content: target_msg.content, 
            embeds: embeds
        });
    }

    /* add the react_prompt info */
    __react_prompt[msg_token] = {
        'timeout':  null,
        'requester': requester_title,
        'authorized': authorized_user_IDs,
        'callbacks': callbacks
    };

    /* create the eventlistener if none */
    if ( !interactable_ReactionAdd_id ){
        logging.log(globals, "--setting up react event listener");
        interactable_ReactionAdd_id = botListeners.acquireBotListener('messageReactionAdd');
        botListeners.addBotListener(interactable_ReactionAdd_id, globals.client, 'messageReactionAdd', interactableHandleReactionAdd);
    }

    /* create the timeout */
    if ( window_seconds > 0 ){
        logging.log(globals, "--setting expiration timeout for "+window_seconds+" seconds");
        __react_prompt[msg_token]['timeout'] = setTimeout(async (globals, msg_token) => {
            logging.awaitLog(globals,  "REACT_PROMPT expired ["+__react_prompt[msg_token].requester+"] "+url_prefix+msg_token, 5);
            delete __react_prompt[msg_token];
            await interactableReactionAddCleaner();
            let resolvables = msg_token.split("/");
            let server = await globals.client.guilds.fetch( resolvables[0] );
            let channel = server.channels.resolve( resolvables[1] );
            let message = await channel.messages.fetch( resolvables[2] );
            await message.edit({content: message.content, embeds: [...(target_msg.embeds ?? []), expiredEmbed]});
            //await message.channel.send("<"+url_prefix+msg_token+"> react prompt has timed out and expired");
        }, 1000*window_seconds, globals, msg_token);
    }
    logging.log(globals, "--react prompt setup complete");
    return msg_token;
}



/**
 * Create message with the given content that runs callbacks on certain reactions which remains active indefinitely (until bot is shutdown);
 *   callbacks shouldn't request worklock within the function, instead set the 'awaitLock' property as true
 * @param {Globals} globals --
 * @param {ReactControllerArgs} args
 * @throws if error occurs
 * @return {Promise<String>} the message_token used to identify the react controller
 */
async function react_controller (globals, args){
    let requester_title = args.requester ?? "react_controller_anon";;
    let target_msg = args.targetMessage;
    let isAuthorized = args.isAuthorized;
    let callbacks = args.callbacks;
    let embedTitles = [];

    /* error checking */
    /*if (getObjectName(target_msg) === Discord.Message.name)   //if (target_msg instanceof Discord.Message) 
        throw new Error("Invalid target message ::  Not type of Discord.Message, is type: "+getObjectName(target_msg));*/
    if (typeof isAuthorized !== 'function') 
        throw new Error("Invalid isAuthorized function:  must provide a function");
    let msg_token = target_msg.guild.id+"/"+target_msg.channel.id+"/"+target_msg.id;
    if ( reactInteractableExists(msg_token) )
        throw new Error("A react interactable for the target message already exists");

    logging.log(globals, "Creating react controller");
    for ( let emote_key of Object.keys(callbacks) ){
        if (!callbacks[emote_key].hasOwnProperty('callback')) 
            throw new Error("Invalid callback: 'callback' for ["+emote_key+"] is missing");
        if (typeof callbacks[emote_key].callback !== 'function') 
            throw new Error("Invalid callback: callback for ["+emote_key+"] must be a function");
        if (!callbacks[emote_key].hasOwnProperty('awaitLock')) 
            callbacks[emote_key].awaitLock = true; //default true

        let emote = resolveEmote_string(emote_key);
        //if (emote.emote === '❌') throw ("❌ is not allowed as a controller button");
        await target_msg.react( emote.emote ).catch(err => {throw (err)});
        console.log(emote_key+" has title: "+callbacks[emote_key].hasOwnProperty('title'));
        if (callbacks[emote_key].hasOwnProperty('title'))
            embedTitles.push(emote.string + " " + callbacks[emote_key].title);
        delete callbacks[emote_key].title;
        if (emote.emote === emote_key)  continue;
        callbacks[emote.emote] = callbacks[emote_key];
        delete callbacks[emote_key];
    }
    console.log(embedTitles);
    if (target_msg.editable){
        let embeds = [...(target_msg.embeds ?? []) ];
        if (embedTitles.length > 0) embeds.push( new Discord.MessageEmbed({
            "description": embedTitles.join("\n"),
            "color": 4645612 
        }) );
        await target_msg.edit({
            content: target_msg.content, 
            embeds: embeds
        });
    }

    /* add ❌ callback to destroy the controller */
    let X_callback = async (globals, serverID, userID, msg_token) => {
        logging.awaitLog(globals, "Destroying react controller "+msg_token, 5);
        delete __react_controller[msg_token];
        await interactableMessageDeleteCleaner();
        await interactableReactionAddCleaner();
        let resolvables = msg_token.split("/");
        let message = await fetchMessage(globals, resolvables[0], resolvables[1], resolvables[2], true);
        await message.delete(); //delete controller message
    };
    if (callbacks.hasOwnProperty('❌')){
        let temp = callbacks['❌'];  //
        callbacks['❌'] = {
            'callback': async (globals, serverID, userID, msg_token) => {
                await temp.callback(globals, serverID, userID, msg_token);
                await X_callback(globals, serverID, userID, msg_token);
            },
            'awaitLock': (temp.hasOwnProperty('awaitLock') ? temp.awaitLock : false)
        };
    }
    else{
        callbacks['❌'] = {'callback': X_callback,  'awaitLock': false };
        await target_msg.react( '❌' ).catch(err => {throw (err)});
    }

    /* create messageDelete listener to destroy the controller if none */
    if ( !controller_MessageDelete_id ){
        logging.log(globals, "--setting up message delete event listener");
        controller_MessageDelete_id = botListeners.acquireBotListener('messageDelete');
        botListeners.addBotListener(controller_MessageDelete_id, globals.client, 'messageDelete', interactableHandleMessageDelete);
    }
    /* create the eventlistener if none */
    if ( !interactable_ReactionAdd_id ){
        logging.log(globals, "--setting up react event listener");
        interactable_ReactionAdd_id = botListeners.acquireBotListener('messageReactionAdd');
        botListeners.addBotListener(interactable_ReactionAdd_id, globals.client, 'messageReactionAdd', interactableHandleReactionAdd);
    }

    /* add the react_controller info */
    __react_controller[msg_token] = {
        'requester': requester_title,
        'isAuthorized': isAuthorized,
        'callbacks': callbacks
    };

    logging.log(globals, "--react controller setup complete");
    return msg_token;
}

//#endregion React Interactables
module.exports.react_confirm    = react_confirm;
module.exports.react_prompt     = react_prompt;
module.exports.react_controller = react_controller;


//#endregion InteractablesExport
