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






/* Must include "exact",  "contains" is optional.
   Limit the reply string to 2000 chars as per Discord post restrictions; preferably keep it short.

   The key is the actuating string.


   REPLIES will reply if the string is equal
   CONTAINS will reply if the string contains the key


   REPLY and REACTIONS is optional, if not specified nothing is done
   if DIRECTED is not specified then defaults to true

   if DIRECTED then the reply will @ the poster, otherwise the reply message will just be posted in the same channel

   if CASE_INSENSITIVE is true (case ignored) then the keyword should 
   also be all lowercase (for example "testreply" rather than "testReply").
   Defaults to false (case sensitive).


   to get emotes post "\:emote:" and copy the resulting unicode char
*/


module.exports = {
    exact: {
        "ook" : {
            case_insensitive: true,
            reactions: ['🍌']
        },
        "OOK" : {
            reactions: ['🐒','🍌']
        }
    },
    contains: {
        "┬─┬ノ(ಠ_ಠノ)" : {
            reply: "(╯°Д°）╯︵ /(.□ . \\\\)  ┻━┻",
            directed: false
        }
    }
}






