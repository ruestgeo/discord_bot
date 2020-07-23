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




const utils = require('../utils.js'); //base utils is located in the base dir, if needed


const { requiredRole, noRestrition } = require('../_configs/voice_configs.json');





module.exports = {
    version: 1.0,
    hasRolePermission: async function(member){
        if (noRestrition) return true;
        for (var role_id of requiredRole){
            if (await utils.memberHasRole(member, role_id)){
                return true;
            }
        }
        return false;
    }
}






