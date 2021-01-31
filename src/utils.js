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
const { Mutex } = require('async-mutex');
const work_lock = new Mutex();
var release;


const DateTime = luxon.DateTime;


module.exports = {

    acquire_work_lock: async function(globals, requester){
        // await acquire_work_lock or  acquire_work_lock(~~).then(_ => { do stuff })
        console.log("* attempting to acquire work lock for "+requester+" *");
        if ( work_lock.isLocked() )  console.log("* work lock still active, waiting for unlock for "+requester+" *");
        release = await work_lock.acquire();
        globals.busy = true;
        this.botLogs(globals, "* acquired work lock for "+requester+" *");
    },
    
    release_work_lock: function(globals, holder){
        if ( !work_lock.isLocked() ) {console.log("*not locked DEBUG*"); return;}
        this.botLogs(globals, "* releasing work lock for "+holder+" *");
        globals.busy = false;
        release();  //work_lock.release();
        //console.log("DEBUG isLocked: "+work_lock.isLocked());
    },

    botLogs: function (globals, content){
        if (globals.LogsToFile)
            { fs.appendFileSync(globals.logsPath+globals.logsFileName, content+"\n"); }
        console.log(content);
    },

    sleep: function (ms) { //example:  await sleep(1000);
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    },

    getTimeString: function(globals){
        return this.getDateTime(globals).toLocaleString({hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit'});
    },
    getTimeString2: function(globals){
        return this.getDateTime(globals).toLocaleString({hourCycle: 'h11', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: "short"});
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
        return this.getDateTime(globals).toLocaleString({hourCycle: 'h11', weekday: 'short', month: 'short', day: '2-digit', year: "numeric", hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: "short" });
    },

    getDate: function (globals){
        return this.getDateTime(globals).toFormat("y'-'MM'-'dd'_'ccc'_'ZZZZ");
        //return this.getDateTime(globals).toLocaleString({ year: "numeric", month: 'short', day: '2-digit', weekday: 'short', timeZoneName: "short" });
    },

    memberHasRole: async function(member, role_id){
        var member =  await member.fetch().catch(err => { throw ("ERROR in member validation ::   "+err) });
        return member.roles.cache.has(role_id);
    },

    getMemberAuthorizationLevel: async function(configs, member){
        var memberAuthLevel = 0;
        if ( configs.authorization.authorizedUsers.hasOwnProperty(member.id) ){
            memberAuthLevel = configs.authorization.authorizedUsers[member.id];
        }
        for ( var roleID in configs.authorization.authorizedRoles ){
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
                for ( var roleID in configs.authorization.authorizedRoles ){
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


    event_once: function (target, type, func) {
        target.once(type, func);
        return function() {
            if (target.off)
                target.off(type, func);
        };
    },
    event_on: function (target, type, func) {
        target.on(type, func);
        return function() {
            target.off(type, func);
        };
    },


    Queue
}







//exports.Queue = Queue;
/***
 * Basic queue.
 * if given capacity then there is a limit to the size, otherwise no limit.
 * if given an array then the queue is created using that array
 ***/
function Queue (capacity, array){
    if (capacity){
        if (!Number.isInteger(capacity))
            throw new Error("Invalid arg given:  ["+capacity+"] is not an integer");
        if (capacity < 1)
            throw new Error("Invalid arg given:  capacity less than 1");
        if (array){
            if (array.length > capacity) 
                throw new Error("Invalid args:  Array is larger than given capacity");
        }
    }
    if (array !== undefined && !Array.isArray(array)) 
        throw new Error("Invalid arg for array");
    
    this._elements = (array!==undefined ? array : []);
    this._capacity = capacity;
}
/**
 * add element to the end of the queue
 **/
Queue.prototype.enqueue = function (element){ //
    if (this._capacity && this._elements.length == this._capacity)
        throw new Error(`Queue is full ( ${this._elements.length} / ${this._capacity} )`);
    this._elements.push(element);     
}
/**
 * return and remove the first element of the queue
 **/
Queue.prototype.dequeue = function (){ 
    if (this._elements.length < 1)
        throw new Error( this._capacity ? `Queue is empty ( ${this._elements.length} / ${this._capacity} )` : "Queue is empty");
    return this._elements.shift();
}
/**
 * alias for enqueue
 **/
Queue.prototype.push = function(element){ 
    try { this.enqueue(element); }
    catch (err) { throw (err); }
}
/**
 * alias for dequeue
 **/
Queue.prototype.pop = function(){ 
    try { return this.dequeue(); }
    catch (err) { throw (err); }
}
/**
 * return true if empty
 **/
Queue.prototype.isEmpty = function (){ 
    return this._elements.length == 0;
}
/**
 * return the first element of the queue without removing, or undefined
 **/
Queue.prototype.peek = function (){ 
    return (this.isEmpty() ? null : this._elements[0]);
}
/**
 * return current size of the queue
 **/
Queue.prototype.length = function (){ 
    return this._elements.length;
}
/**
 * return current size of the queue
 **/
Queue.prototype.size = function (){ 
    return this._elements.length;
}
/**
 * return capacity (might be undefined)
 **/
Queue.prototype.capacity = function(){ 
    return this._capacity;
}
/**
 * remove first instance of element from queue and returns it
 **/
Queue.prototype.remove = function(element){ 
    var index = this._elements.indexOf(element);
    if (index < 0 ) throw new Error("element not found in Queue");
    return this._elements.splice(index, 1);
}
/**
 * remove the first element to satisfy the conditionFunction and return it
 */
Queue.prototype.removeOneConditioned = function(conditionFunction){
    var index = this._elements.findIndex(conditionFunction);
    if (index < 0 ) throw new Error("element not found in Queue");
    return this._elements.splice(index, 1);
}
/**
 * remove element at index of queue
 **/
Queue.prototype.removeIndex = function(index){ 
    return this._elements.splice(index, 1);
}
/**
 * remove element at index of queue
 **/
Queue.prototype.removePosition = function(index){ 
    return this._elements.splice(index, 1);
}
/**
 * remove all instances of element from queue
 **/
Queue.prototype.removeAll = function(element){ 
    this._elements = this._elements.filter(Q_item => Q_item !== element);
}
/**
 * clear the queue
 **/
Queue.prototype.clear = function(){ 
    this._elements = [];
}
/**
 * insert element into the queue at position
 **/
Queue.prototype.insert = function(element, index){ 
    if (this._capacity && this._elements.length == this._capacity)
        throw new Error("Queue is full ( "+this._elements.length+" / "+this._capacity+" )");
    this._elements.splice(index, 0, element);
}
/**
 * return whether queue contains element
 **/
Queue.prototype.has = function(element){ 
    return this._elements.includes(element);
}
/**
 * return whether queue contains element
 **/
Queue.prototype.includes = function(element){ 
    return this._elements.includes(element);
}
/**
 * return index of first occurence of element (optional startIndex and endIndex)
 **/
Queue.prototype.indexOf = function(element, startIndex, endIndex){ 
    if (endIndex) return this._elements.substring(startIndex, endIndex).indexOf(element)+startIndex;
    if (startIndex) return this._elements.substring(startIndex).indexOf(element)+startIndex;
    return this._elements.indexOf(element);
}
/**
 * return queue as string
 **/
Queue.prototype.toString = function(){ 
    return this._elements.toString();
}
/**
 * return number of occurences of element in queue
 **/
Queue.prototype.count = function(element){ 
    return this._elements.filter(Q_item => Q_item === element).length;
}
/**
 * return a key-value copy of queue with indices as keys
 **/
Queue.prototype.toKeyValue = function(){ 
    var keyval = {};
    for (var idx = 0; idx < this._elements.length; idx++){
        keyval[idx] = this._elements[idx];
    }
    return keyval;
}
/**
 * apply a map function on a copy of the queue and return the result
 */
Queue.prototype.map = function(mappingFunction){
    return this._elements.map(mappingFunction);
}
/**
 * apply a filter function on a copy of the queue and return the result
 */
Queue.prototype.filter = function(filterFunction){
    return this._elements.filter(filterFunction);
}
/**
 * return a shallow copy of queue
 **/
Queue.prototype.copy = function(){
    return Array.from(this._elements);
}
/**
 * return queue array as a string
 **/
Queue.prototype.toString = function(){
    return `[${this._elements.toString()}]`;
}
/**
 *  stringify the queue
 **/
Queue.prototype.stringify = function(){
    return JSON.stringify(this._elements);
}
/**
 * create a new Queue from the array with a given capacity
 **/
Queue.from = function(array, capacity){ 
    try{ return new Queue(capacity, array); }
    catch (err) { throw (err); }
}

