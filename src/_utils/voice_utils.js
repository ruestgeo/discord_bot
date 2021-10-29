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




const utils = require(process.cwd()+'/utils.js');
const fs = require("fs");


const configsPath = '../_configs/voice_configs.json'

const { requiredRole, noRestrition } = require(configsPath);



module.exports = {
    version: 1.2,
    hasRolePermission: async function(member){
        if (noRestrition) return true;
        for (var role_id of requiredRole){
            if (await utils.memberHasRole(member, role_id)){
                return true;
            }
        }
        return false;
    },

    fetchLatestConnection: function(client, server_id){
        var connections = Array.from(client.voice.connections.values());
        for (var connection of connections){
            if (connection.channel.guild.id === server_id) {
                return connection;
            }
        }
        return null;
    },

    fetchChannelConnection: function(client, channel_id){
        var connections = Array.from(client.voice.connections.values());
        for (var connection of connections){
            if (connection.channel.id === channel_id) {
                return connection;
            }
        }
        return null;
    },



    removeReqRole: function(role){
        if (!requiredRole.hasOwnProperty(role.id)) throw ("Role ["+role.name+":"+role.id+"] isn't a voice authorized role");
        //var newReqRoles = JSON.parse(JSON.stringify(requiredRole));

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

function setReqRoles(){
    let obj = {};
    obj["requiredRole"] = requiredRole; 
    obj["noRestrition"] = noRestrition;
    let json = JSON.stringify(obj);
    fs.writeFileSync(configsPath, json);
}







