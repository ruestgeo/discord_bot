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
const music = require('./--music.js');
const voice = require('./--voice.js');


module.exports = {
    version: 1.0,
    auth_level: 3,



    manual: "**--say-hello**  ->  <voiceChannel ID or name>\n" +
            ".     *a macro to play mineturtle hello once (assuming nothing else is playing*\n"+
            ".     *if a voice channel is specified it will join that channel first*",



    func: async function (globals, msg, content){ 
        try{
            if (content) await voice.func(globals, msg, content); //join voice
            await music.func(globals, msg, "playOne https://www.youtube.com/watch?v=yt8KQd_YwLQ"); //say hello
            //if (content) await voice.func(globals, msg, ""); //leave voice
        }
        catch (err) { throw (err); }
    }

    
}






