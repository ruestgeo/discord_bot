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



//move file this to "disabled" to disable use of googleSheets 

const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs'); 


const utils = require('../utils.js');
const gs_utils = require('../_utils/googleSheets_utils.js'); 

const googleSheetsConfigsPath = "../_configs/googleSheets_configs.json";




module.exports = {
    version: 1.0,
    func: async function (globals){
        var leading_space = "        ";
        console.log(leading_space + "Setting up Google Sheets");
        
        if ( globals.configs.googleSheets ){
            throw ("Error in google sheets setup ::  property globals.configs.googleSheets already used");
        }
        globals.configs.googleSheets = undefined;

        console.log(leading_space + "-- verifying configs");
        await verifyConfigs(globals);

        console.log(leading_space + "-- connecting to Google Sheets");
        const googleAuth = require("../"+globals.configs.googleSheets_configs.GoogleAuthFilePath);
        const doc = new GoogleSpreadsheet(globals.configs.googleSheets_configs.googleSheetsId);
        
        await doc.useServiceAccountAuth(googleAuth)
        .catch(err => {
            throw ("Error connecting to Sheets ::   "+err);
        });
        console.log(leading_space + "-- Successfully connected to Google Sheets");
        await doc.loadInfo()
        .then(_ => {
            console.log(leading_space + "---- Sheets Workbook title: ["+doc.title+"]");
        })
        .catch(err => {
            throw ("Error loading info ::   "+err);
        });
        globals["googleSheets"] = doc;
    }        
}




async function verifyConfigs(globals, leading_space){
    var gs_configs = require(googleSheetsConfigsPath);
    var invalid = false;
    var missing = [];
    var incorrect = [];

    
    if (!globals.configs){
        throw ("Error in google sheets configs validation:  globals.configs undefined")
    }
    
    //path should be from the bot base directory
    if ( !gs_configs.hasOwnProperty("GoogleAuthFilePath") ){ invalid = true; missing.push("GoogleAuthFilePath"); }
    else if ( typeof gs_configs.GoogleAuthFilePath !== "string" ){ invalid = true; incorrect.push("GoogleAuthFilePath (invalid type)"); }
    else if ( !fs.existsSync("./"+gs_configs.GoogleAuthFilePath) ){ invalid = true; incorrect.push("GoogleAuthFilePath (invalid path)"); }

    if ( !gs_configs.hasOwnProperty("googleSheetsId") ){ invalid = true; missing.push("googleSheetsId"); }
    else if ( typeof gs_configs.googleSheetsId !== "string" ){ invalid = true; incorrect.push("googleSheetsId"); }
    
    //default 100
    if ( !gs_configs.hasOwnProperty("defaultSheetRows") ){ missing.push("defaultSheetRows (default 100)"); configs["defaultSheetRows"] = 100; }
    else if ( typeof gs_configs.defaultSheetRows !== "number" ){ incorrect.push("defaultSheetRows (default 100)"); configs["defaultSheetRows"] = 100; }

    //default 10
    if ( !gs_configs.hasOwnProperty("defaultSheetCols") ){ missing.push("defaultSheetCols (default 10)"); configs["defaultSheetCols"] = 10; }
    else if ( typeof gs_configs.defaultSheetCols !== "number" ){ incorrect.push("defaultSheetCols (default 10)"); configs["defaultSheetCols"] = 10; }

    //default true
    if ( !gs_configs.hasOwnProperty("autoSheetSize") ){ missing.push("autoSheetSize (default true)"); configs["autoSheetSize"] = true; }
    else if ( typeof gs_configs.autoSheetSize !== "boolean" ){ incorrect.push("autoSheetSize (default true)"); configs["autoSheetSize"] = true; }

    //default "CLIP"
    if ( !gs_configs.hasOwnProperty("sheetCellWrap") ){ missing.push("sheetCellWrap (default CLIP)"); configs["sheetCellWrap"] = "CLIP"; }
    else if ( gs_configs.sheetCellWrap !== "CLIP" && gs_configs.sheetCellWrap !== "WRAP" && gs_configs.sheetCellWrap !== "OVERFLOW_CELL" ){ incorrect.push("sheetCellWrap (default CLIP)"); configs["sheetCellWrap"] = "CLIP"; }


    if (invalid){
        throw new Error("Invalid google sheets configs ::  missing configs:  \n["+missing.toString().replace(/,/g, ", ")+"]   \n\nincorrect configs: \n["+incorrect.toString().replace(/,/g, ", ")+"]");
    }
        
    if (missing.length > 0)
        console.log(leading_space + "---- google sheets configs used defaults for the following missing entries ::   ["+missing.toString().replace(/,/g, ", ")+"]");
    if (incorrect.length > 0)
        console.log(leading_space + "---- google sheets configs used defaults for the following incorrect entries ::   ["+incorrect.toString().replace(/,/g, ", ")+"]");


    globals.configs["googleSheets_configs"] = gs_configs;    
}

