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


//TODO use @discordjs/voice
//requires heavy re-coding

const Discord = require('discord.js');
const utils = require(process.cwd()+'/utils.js');
const fs = require("fs");


const configsPath = '../_configs/voice_configs.json'

const { requiredRole, noRestrition } = require(configsPath);



module.exports = {
    version: 1.2,
    hasRolePermission: async function(member){
        if (noRestrition) return true;
        for (let role_id of requiredRole){
            if (await utils.memberHasRole(member, role_id)){
                return true;
            }
        }
        return false;
    },

    /**
     * Fetch the voice channel connection the bot has in on the given server (otherwise null)
     * @param {Discord.Client} client 
     * @param {String} server_id 
     * @returns {Discord.VoiceConnection | null}
     */
    fetchLatestConnection: function(client, server_id){
        for (let connection of Array.from(client.voice.connections.values())){
            if (connection.channel.guild.id === server_id) {
                return connection;
            }
        }
        return null;
    },

    fetchChannelConnection: function(client, channel_id){
        let connections = Array.from(client.voice.connections.values());
        for (let connection of connections){
            if (connection.channel.id === channel_id) {
                return connection;
            }
        }
        return null;
    },



    removeReqRole: function(role){
        if (!requiredRole.hasOwnProperty(role.id)) throw ("Role ["+role.name+":"+role.id+"] isn't a voice authorized role");
        //let newReqRoles = JSON.parse(JSON.stringify(requiredRole));

        while (requiredRole.indexOf(role.id) != -1){ //remove all instances of role in reqRoles
            requiredRole.splice(requiredRole.indexOf(role.id), 1);
        }
        try{ setReqRoles(); }
        catch (err){ throw (err); }
    },

    addReqRole: function(role){
        if (requiredRole.hasOwnProperty(role.id)) throw ("Role ["+role.name+":"+role.id+"] is already a voice authorized role");

        requiredRole.push(role.id);
        try{ setReqRoles(); }
        catch (err){ throw (err); }
    }
}

function setReqRoles (){
    let obj = {};
    obj["requiredRole"] = requiredRole; 
    obj["noRestrition"] = noRestrition;
    let json = JSON.stringify(obj);
    fs.writeFileSync(configsPath, json);
}







