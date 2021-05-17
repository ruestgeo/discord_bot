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




const portAudio = require('naudiodon');

const utils = require(process.cwd()+'/utils.js');
const voiceUtils = require(process.cwd()+'/_utils/voice_utils.js');


//npm install naudiodon
//https://www.npmjs.com/package/naudiodon
//https://discordjs.guide/voice/receiving-audio.html#basic-usage


//https://www.npmjs.com/package/audio-mixer   for future use, since the repo seems to indicate the package is buggy and unoptimized
//or maybe refer to https://github.com/oviser/audio-mixer.js/blob/master/index.js  and https://github.com/audiojs/web-audio-api 


/*
https://discord.js.org/#/docs/main/stable/class/Client?scrollTo=e-guildMemberSpeaking
https://discord.js.org/#/docs/main/stable/class/Speaking
https://discord.js.org/#/docs/main/stable/class/VoiceConnection
https://discord.js.org/#/docs/main/stable/class/VoiceReceiver
*/

module.exports = {
    version: 0.000,
    auth_level: 9,



    manual: "**--voice-output**  ->  ??? \n" +
            ".     *outputs the audio stream of the currently connected voice channel to the host audio output device.*",

    requisites: {
        "startups" : ["voice_setup.js"]
    },

    func: async function (globals, msg, content){ 
        let client = globals.client;
        let server = await msg.guild.fetch();
        let connection; 
        
        /*DEV*/ //let utils = require("../utils.js");
        /*DEV*/ //let voiceUtils = require("../_utils/voice_utils.js");
        
        if ( !(await voiceUtils.hasRolePermission(msg.member)) )  throw ("Insufficient permissions:  lacking role to use voice commands");

        connection = utils.getVoiceConnection(globals.client, msg.guild.id);
        if (!connection) throw ("Currently not connected to a voice channel in this server");

        let startTime = Date.now();
        let endTime = Date.now();
        let elapsed_ms = endTime - startTime;
        let elapsed_s = (+(elapsed_ms/1000.0).toFixed(1));



        // Create an instance of AudioIO with outOptions (defaults are as below), which will return a WritableStream
        let audioOut = new portAudio.AudioIO({
                outOptions: {
                channelCount: 2,
                sampleFormat: portAudio.SampleFormat16Bit,
                sampleRate: 48000,
                deviceId: -1, // Use -1 or omit the deviceId to select the default device
                closeOnError: true // Close the stream if an audio error is detected, if set false then just log the error
            }
        });

        //ALT: watch 'guildMemberSpeaking' event, only use the most current event or the first event


        let userID = "";
        let voiceAudio = connection.receiver.createStream(userID);
        /*
        What if I want to listen to multiple users?
            You can create a stream for each user. 
            However, you cannot make a single stream that will interpolate audio from multiple users in a channel; 
            this is currently out of discord.js' scope.
         */
        
        

        voiceAudio.pipe(audioOut);
        audioOut.start();
    }

    
}






