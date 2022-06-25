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



//move file this to "disabled" to disable use of googleSheets 

const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs'); 


const Discord = require('discord.js');
const utils = require(process.cwd()+'/utils.js');
const gs_utils = require(process.cwd()+'/_utils/googleSheets_utils.js'); 






module.exports = {
    version: 1.1,
    func: async function (globals){
        console.log("Setting up Google Sheets");
        await gs_utils.init();
    }        
}






