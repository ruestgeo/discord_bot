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




const utils = require('../dev_utils.js'); //base utils is located in the base dir, if needed





module.exports = {
    //TODO
    addReactRoleManager: function (){
        //arg = json with server/channel/message and reactroles
        /*{
            server: id,
            chanenl: id,
            message: id,
            reactroles: {emote: {info}, ...}
        } 
        => (for JSON storage, for sql use flatten and add identifier sID/cID/mID)
        {server: {
            channel: {
                message: {
                    reactroles: {info}, 
                    reactions: {
                        emote: [users, ...],
                         ...
                        } 
                    }, 
                    ...
                },
                ...
            },
            ...
        }*/
    }, 

    removeReactRoleManager_servers: function (){
        //remove all managers that match server
        //arg = json with server
    },
    removeReactRoleManager_channels: function (){
        //remove all managers that match server
        //arg = json with server/channel
    },
    removeReactRoleManager_message: function (){
        //remove all managers that match server
        //arg = json with server/channel/message
    },

    updateReactRoleManager: function (){
        //update the recorded reaction list (todo later for keeping track of differences between reaction lists)
    },

    verifyReactRoles: function (){
        //verify reactions are accurate, look through list of reacts, assign role if missing
    }


    //?? get reactrole info
}






