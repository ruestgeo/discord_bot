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






const utils = require(process.cwd()+'/utils.js');



module.exports = {
    version: 1.0,
    auth_level: 5,



    manual: "**--message**  ->  \\**role_resolvable*\\* ~~~\n" +
            ".     *sends the same message (in DMs) to all users with the given role (resolvable by id, name, or link/mention)*",



    func: async function (globals, msg, content){ 
        if (!content.includes(' ')){
            utils.botLogs(globals,  "----incorrect request body");
            throw ("Incorrect request body.  Please ensure that the input arguments are correct.");
        }
        let targetRole = content.substr(0, content.indexOf(' ')).trim();
        let message_to_send = content.substr(content.indexOf(' ')+1).trim();

        let server = await msg.guild.fetch();
        let server_roles = await server.roles.fetch();
        let sender = msg.member;
        let senderDisplayName = sender.displayName+"#"+sender.user.discriminator;
        let senderMention = "<@"+sender.id+">";


        //get role 
        let role;
        try {
            role = utils.resolveRole(globals, targetRole, server_roles, true);
        } catch (err) { throw (err); }
        utils.botLogs(globals, "--found role: "+role.name+" : "+role.id);

        //update role cache
        role = await server_roles.fetch(role.id).catch(err => {throw (err)});

        let roleMembers = [...role.members.keys()];



        //confirm DM
        let rc_message = await utils.message(msg,"React with 🟢 to confirm sending DM's to "+roleMembers.length+" members with the role `"+role.name+"` (`"+role.id+"`)\n__***30 seconds to confirm***__", true).catch(err => {throw (err)});
        await utils.react_confirm(globals, "message_role", rc_message, 30, [msg.author.id], async _ => {
            utils.botLogs(globals,"message_role_CONFIRM\n  Requester: "+msg.author.tag+" : "+msg.author.id);
            let count = 0;
            let count_f = 0;
            for (let memberID of roleMembers){
                let member = role.members.get(memberID);
                let memberName = member.displayName+"#"+member.user.discriminator;
                let DM_channel;
                try{
                    DM_channel = await member.createDM().catch(err => {
                        count_f++;
                        msg.channel.send("An error occurred when fetching DM channel for member  "+memberName+" : "+memberID+"\n"+err);
                        throw (err);
                    } );
                }
                catch (err){
                    continue;
                }
                try {
                    await DM_channel.send( "On behalf of  "+senderDisplayName+" ("+senderMention+")\n" + message_to_send );
                    count++;
                    await msg.channel.send("Sent DM to member  "+memberName+" : "+memberID).catch(err2 => {
                        utils.botLogs("ERROR sending DM confirm message: "+err2);
                    }); 
                } 
                catch (err) {
                    utils.botLogs(globals, "An error occurred when sending DM to member  "+memberName+" : "+memberID+"\n"+err);
                    count_f++;
                    await msg.channel.send("An error occurred when sending DM to member  "+memberName+" : "+memberID+"\n"+err).catch(err2 => {
                        utils.botLogs("ERROR sending error: "+err2);
                    }); 
                }
    
            }


            await msg.reply("Request complete; "+count+" DMs have been sent with "+count_f+" failures");
        }, async _ => { await msg.reply("REJECTED -> No DMs have been sent"); });


        return "Request complete";
    }

    
}






