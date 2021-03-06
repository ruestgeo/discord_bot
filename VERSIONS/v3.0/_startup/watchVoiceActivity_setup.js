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



const fs = require('fs'); 


const utils = require('../utils.js');






module.exports = {
    version: 1.0,
    func: async function (globals){
        var leading_space = "        ";
        console.log(leading_space + "Setting up shutdown-cleanup for voiceActivityWatcher");


        if (globals._shutdown) {
            globals._shutdown.push( async (globals) => {
                const { listeningServers,textChannels,isListening,lvcattc_listener,listenToVoiceChannelActivity,clear } = require('../_commands/--watch-voice-activity.js');
                if (listeningServers.size > 0){
                    console.log("    __[lvcattc] shutdown");
                    globals.client.off('voiceStateUpdate', listenToVoiceChannelActivity);
                    globals.client.off('message', lvcattc_listener);
                    for (_textChan in textChannels){
                        var textChan = textChannels[_textChan];
                        await textChan.send("**Bot Shutting down, ending voice activity listener**");
                    }
                    clear();
                }
            });
        }
        
    }        
}



