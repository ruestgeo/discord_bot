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


module.exports = {
    work_Lock: function(globals){ //lock if busy and await 
        console.log("**work lock**");
        globals.busy = true;
        globals.workLockEmitter.emit('locked');
    },
    work_Unlock: function(globals){
        console.log("**work unlock**");
        globals.busy = false;
        globals.workLockEmitter.emit('unlocked');
    },


    sleep: function (ms) { //example:  await sleep(1000);
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    },

    getDateTime: function(globals){
        var configs = globals.configs;
        const DateTime = globals["luxon"].DateTime;
        if (DateTime.local().setZone(configs.IANAZoneTime).isValid) {
            _date = DateTime.fromISO(DateTime.utc(), {zone: configs.IANAZoneTime});
        }
        else { //invalid IANA zone identifier, use UTC as default
            console.log("## invalid IANA zone identifier, assuming UTC");
            _date = DateTime.utc();
        }
        return _date;
    },


    getDateTimeString: function (globals) {
        var _date = this.getDateTime(globals);
        var date = _date.toLocaleString({ weekday: 'short', month: 'short', day: '2-digit', year: "numeric", hour: '2-digit', minute: '2-digit', timeZoneName: "short" });
        return date;
    },



    botLogs: function (globals, content){
        if (globals.LogsToFile)
            fs.appendFileSync(globals.logsPath+globals.logsFileName, content+"\n");
        console.log(content);
    },
    
    



    change_status: async function(client, status, text, type){ //type is optional, defaults to PLAYING
        if (!type) type = "PLAYING";
        await client.user.setPresence({ activity: { name: text, type: type }, status: status })
        .catch(err => {
            console.log("## err ::  "+err); 
            throw new Error("An error occured when changing bot status");
        });
    },

    status_blink: function(globals){
        var client = globals.client;
        client.user.setStatus('online') //blink 1
        .then(_ => {
            this.sleep(500) //sleep 1
            .then(_ => {
                client.user.setStatus('dnd') //blink 2
                .then(_ => {
                    this.sleep(500) //sleep 2
                    .then(_ => {
                        client.user.setStatus('online') //blink 3
                        .then(_ => {
                            this.sleep(500) //sleep 3
                            .then(_ => {
                                client.user.setStatus('dnd') //blink 4
                                .then(_ => {
                                    this.sleep(500) //sleep 4
                                    .then(_ => {
                                        client.user.setStatus('idle') //return
                                        .then(_ => {
                                            this.work_Unlock(globals);
                                        })
                                        .catch(err => { console.log("## err in status_blink ::  "+err); this.work_Unlock(globals);})
                                    });
                                })
                                .catch(err => { console.log("## err in status_blink ::  "+err); this.work_Unlock(globals);})
                            });
                        })
                        .catch(err => { console.log("## err in status_blink ::  "+err); this.work_Unlock(globals);})
                    });
                })
                .catch(err => { console.log("## err in status_blink ::  "+err); this.work_Unlock(globals);})
            });
        })
        .catch(err => { console.log("## err in status_blink ::  "+err); this.work_Unlock(globals);});
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