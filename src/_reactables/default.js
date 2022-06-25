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






/* Should include "exact" or "contains" or "regex" to do something meaningful, while "targetServers" is optional.
   Limit the reply string to 2000 chars as per Discord post restrictions; preferably keep it short.

   The key is the actuating string.


   REPLIES will reply if the string is equal
   CONTAINS will reply if the string contains the key
   REGEX will reply if the string matches the regex

   REPLY and REACTIONS is optional, if not specified nothing is done
   if DIRECTED is not specified then defaults to true

   if DIRECTED then the reply will @ the poster, otherwise the reply message will just be posted in the same channel

   if CASE_INSENSITIVE is true (case ignored) then the keyword should 
   also be all lowercase (for example "testreply" rather than "testReply")
   (this wont apply for REGEX, use FLAGS "i" instead)

   FLAGS is optional and only applies for REGEX, which can be either g,d,i,m,s,u,y for advanced regex searching

   the REGEX key must have double escaped characters (such as "\\s") and should not include the preceeding nor proceeding "/"
   ("test\\s*"  not  "/test\s/") 

   TARGETSERVERS can be specified by list of server_IDs of which these reactables will apply to,
   otherwise it will apply to all.


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






