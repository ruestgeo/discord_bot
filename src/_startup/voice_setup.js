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
        console.log(leading_space + "Setting up voice cleanup");
        
        //disconnect from all voice
        globals._shutdown.push( async (globals) => {
            console.log("    [voice] shutdown");
            var connections = Array.from(globals.client.voice.connections.values());
            for (var connection of connections){
                var channel = connection.channel;
                console.log(`    --disconnected from [${channel.name}:${channel.id}] of [${channel.guild.name}:${channel.guild.id}]`);
                connection.disconnect();
            }         
        });
        
    }        
}


