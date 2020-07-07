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


// Do NOT add or modify (unless bugged) this file.  
//  If a file for common functions is needed see the _utils/README.txt


const fs = require('fs'); 
const luxon = require('luxon');
const EventEmitter = require('events');

const workLockEmitter = new EventEmitter();


const DateTime = luxon.DateTime;


module.exports = {

    acquire_work_lock: async function(globals, requester){
        // await acquire_work_lock or  acquire_work_lock(~~).then(_ => { do stuff })
        console.log("* attempting to acquire work lock for "+requester+" *");
        while (globals.busy) {
            console.log("* work lock still active, waiting for unlock for "+requester+" *");
            await new Promise(resolve => workLockEmitter.once('unlocked', resolve));
        }
        globals.busy = true;
        workLockEmitter.emit('locked');
        this.botLogs(globals, "* acquired work lock for "+requester+" *");
    },
    
    release_work_lock: function(globals, holder){
        if (!globals.busy) return;
        this.botLogs(globals, "* releasing work lock for "+holder+" *");
        globals.busy = false;
        workLockEmitter.emit('unlocked');
    },

    botLogs: function (globals, content, timestamp, prefix){
        if (timestamp){ //if defined and true
            if (!prefix) prefix = "";
            content = prefix+"("+this.getTime()+")  "+content; 
        }
        if (globals.LogsToFile)
            { fs.appendFileSync(globals.logsPath+globals.logsFileName, content+"\n"); }
        console.log(content);
    },

    sleep: function (ms) { //example:  await sleep(1000);
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    },

    getTime: function(){
        return this.getDateTime(globals).toLocaleString({hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit'});
    },

    getDateTime: function(globals){
        var zone = globals.configs.IANAZoneTime;
        if (DateTime.local().setZone(zone).isValid) {
            return DateTime.fromISO(DateTime.utc(), {zone: zone});
        }
        else { //invalid IANA zone identifier, use UTC as default
            return DateTime.utc();
        }
        
    },

    getDateTimeString: function (globals) {
        return this.getDateTime(globals).toLocaleString({ weekday: 'short', month: 'short', day: '2-digit', year: "numeric", hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: "short" });
    },

    getMemberAuthorizationLevel: async function(configs, member){
        var memberAuthLevel = 0;
        if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
            memberAuthLevel = configs.authorization.authorizedUsers[member.id];
        }
        for ( roleID in configs.authorization.authorizedRoles ){
            var roleAuthLevel = configs.authorization.authorizedRoles[roleID];
            if ( member.roles.cache.has(roleID) && (roleAuthLevel > memberAuthLevel) ){
                memberAuthLevel = roleAuthLevel;
            }                
        }
        return memberAuthLevel;
    },

    checkMemberAuthorized: async function(globals, _member, requiredAuthLevel, printlog){
        try {
            if( !printlog ) printlog = false;
            var configs = globals.configs;
            var authorizedRole = null;
            var isAuthorized = false;
            var memberAuthLevel = 0;

            var member =  await _member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
            if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
                memberAuthLevel = configs.authorization.authorizedUsers[member.id];
            }
            if ( memberAuthLevel < requiredAuthLevel ){ 
                for ( roleID in configs.authorization.authorizedRoles ){
                    var roleAuthLevel = configs.authorization.authorizedRoles[roleID];
                    if ( member.roles.cache.has(roleID) && (roleAuthLevel > memberAuthLevel) ){
                        memberAuthLevel = roleAuthLevel;
                        authorizedRole = member.roles.cache.get(roleID);
                    }                
                }
            } 
            isAuthorized = (memberAuthLevel >= requiredAuthLevel);
            if (!isAuthorized){
                if (printlog)
                    this.botLogs(globals,"-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] doesn't have sufficient authorization level");
                return false;
            }
            else if ( !authorizedRole ){ //user Authorized
                if (printlog) 
                    this.botLogs(globals,"-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized through user authorization");
                return true;
            }
            else if ( authorizedRole ) { //role Authorized
                if (printlog) 
                    this.botLogs(globals,"-- ["+member.displayName+"#"+member.user.discriminator+":"+member.id+"] is authorized through the ["+authorizedRole.name+":"+authorizedRole.id+"] role authorization");
                return true;
            }
            else throw new Error("error occured during authorization checking");
        }
        catch (err){
            throw (err);
        }
    },


    change_status: async function(client, status, text, type){ //type is optional, defaults to PLAYING
        if (!type) type = "PLAYING";
        await client.user.setPresence({ activity: { name: text, type: type }, status: status })
        .catch(err => {
            console.log("## err ::  "+err); 
            throw new Error("An error occured when changing bot status");
        });
    },




    get_emote_id: function (content){
        if (content.startsWith('<') && content.endsWith('>') && content.includes(':')){
            var type = "custom";
            var temp = content.substring(1, content.length-1);
            //console.log(temp);
            var temp2 = temp.split(":");
            //console.log(temp2);
            //console.log(temp2.length);
            var emote = temp2[temp2.length-1];
            //console.log("custom emote: "+emote);
            //const emote_info = client.emojis.resolve(emote);
            //console.log(emote_info);
        }
        else { //otherwise unicode supported emoji -> use raw
            var emote = content;
            var type = "unicode";
            //console.log("unicode emote: "+emote);
        }
        return {'emote': emote, 'type': type};
    },
}