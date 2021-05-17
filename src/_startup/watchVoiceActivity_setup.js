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


const utils = require(process.cwd()+'/utils.js');






module.exports = {
    version: 2.0,
    func: async function (globals){
        let leading_space = "        ";
        console.log(leading_space + "Setting up shutdown-cleanup for voiceActivityWatcher");


        if (globals._shutdown) {
            if ( !globals._shutdown.hasOwnProperty("--watchVoiceActivity") )   globals._shutdown["--watchVoiceActivity"] = [];
            globals._shutdown["--watchVoiceActivity"].push( async (globals) => {
                const { listeningServers,textChannels,isListening,wva_listener,listenToVoiceChannelActivity,clear } = require(process.cwd()+'/_commands/--watch-voice-activity.js');
                if (listeningServers.size > 0){
                    console.log("    __[wva] shutdown");
                    globals.client.off('voiceStateUpdate', listenToVoiceChannelActivity);
                    globals.client.off('message', wva_listener);
                    for (_textChan in textChannels){
                        let textChan = await globals.client.channels.fetch(textChannels[_textChan]);
                        await textChan.send("**Bot Shutting down, ending voice activity listener**\n*"+utils.getDateTimeString(globals)+"*");
                    }
                    clear();
                }
            });
        }
        
    }        
}



