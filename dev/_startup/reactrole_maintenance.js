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
const reactroles_utils = require('../_utils/reactroles_utils.js'); 


var maintenance_interval = 24*60*60*1000; // 24 hours




module.exports = {
    version: 1.0,
    func: async function (globals){
        var leading_space = "        ";
        console.log(leading_space + "Creating 24hour reactrole maintenance interval");
        globals["reactroles"] = {};
        var rr_interval = setInterval(function(){
            garbage_collection(globals);
        }, maintenance_interval); 
        globals.intervals["reactroles"] = rr_interval;

        //TODO-later check if existing reactroles are all valid and complete (no missing roles from reactions)
    }
        
}

async function garbage_collection(globals){
    var reactroles = globals.reactroles;
    await utils.acquire_work_lock(globals, "reactrole_maintenance");

    utils.change_status(client, 'dnd', "[doing RR maintenance]")
    .then(async (_) => {
        utils.botLogs(globals,"\nBeginning reactrole garbage collection");
        try{
            for(_server in reactroles){
                var server = client.guilds.resolve(_server);
                if (server.deleted){
                    utils.botLogs(globals,"--server "+server.name+":"+server.id+" DELETED");
                    delete reactroles[_server];
                }
                else {
                    utils.botLogs(globals,"--server "+server.name+":"+server.id+" \\");
                    for (var _channel in reactroles[_server]){
                        var channel = server.channels.resolve(_channel);
                        if (channel.deleted){
                            utils.botLogs(globals,"----channel "+channel.name+":"+channel.id+" DELETED");
                            delete reactroles[_server][_channels];
                        }
                        else {
                            utils.botLogs(globals,"----channel "+channel.name+":"+channel.id+" \\");
                            for (var _message in reactroles[_server][_channel]){
                                await channel.messages.fetch(_message)
                                .then(message => {
                                    if (message.deleted){
                                        utils.botLogs(globals,"------message "+message.id+" DELETED");
                                        delete reactroles[_server][_channels][_message];
                                    } else utils.botLogs(globals,"------message "+message.id+" >>|");
                                })
                                .catch(err => utils.botLogs("### ERR during maintenance ::  "+ err));
                            }
                            utils.botLogs(globals,"--completed all message entries for reactroles in server ["+server.name+":"+server.id+"] channel ["+channel.name+":"+channel.id+"]\n");
                        }
                    }
                    utils.botLogs(globals,"--completed all channel entries for reactroles in server ["+server.name+":"+server.id+"]\n");        
                }
            }
            utils.botLogs(globals,"--completed all servers entries for reactroles\nMaintenance Complete\n");
            utils.change_status(client, 'idle', configs.idleStatusText)
            .catch(err => { utils.botLogs(globals,"## err occured on returning status: "+err); })
            .finally(_ => { utils.work_Unlock(globals); });
        }
        catch (err){
            utils.botLogs(globals,"\n\n\nAn Error occurred\n"+err+"\n\n\n");
            utils.release_work_lock(globals, "reactrole_maintenance_err");
        }
    })
    .catch(err => { utils.release_work_lock(globals, "reactrole_maintenance_statusErr");  });
}








