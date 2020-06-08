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


module.exports = {
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


    sleep: function (ms) { //example:  await sleep(1000);
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    },

    botLogs: function (globals, content){
        if (toFile){
            var file = globals.logsFile;
            if (file == null){
                console.log("## error: logsfile handle is null, retrying");
                this.obtain_log_file(globals);
                this.botLogs(globals, content);
                return;
            }
            //record to file TODO
        }
        console.log(content);
    },

    obtain_log_file: function (globals){
        var configs = globals.configs;

        if ((configs.logsFileMode !== "none") || (configs.logsFileMode !== "")){
            //setup to append to logsFile and set configs.logsFile from configs.logsFileName
            //TODO
        } 
        //else ignore
    },

    close_log_file: function (globals){
        //TODO
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
                                            globals.busy = false;
                                        })
                                        .catch(err => { console.log("## err in status_blink ::  "+err); globals.busy = false;})
                                    });
                                })
                                .catch(err => { console.log("## err in status_blink ::  "+err); globals.busy = false;})
                            });
                        })
                        .catch(err => { console.log("## err in status_blink ::  "+err); globals.busy = false;})
                    });
                })
                .catch(err => { console.log("## err in status_blink ::  "+err); globals.busy = false;})
            });
        })
        .catch(err => { console.log("## err in status_blink ::  "+err); globals.busy = false;});
    }
}