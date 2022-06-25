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



const googleSheetsConfigsPath = "../_configs/googleSheets_configs.json";

const DEFAULT_ROWS = 100;
const DEFAULT_COLS = 10;
const DEFAULT_AUTO_SIZE = true;
const DEFAULT_CELL_WRAP = "CLIP";

const fs = require('fs');
const Discord = require('discord.js');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const utils = require(process.cwd()+'/utils.js'); //base utils is located in the base dir, if needed

let googleSheets = null;
let googleSheets_configs = null;


module.exports = {
    version: 2.0,
    dumpToSheet: async (msg, globals, sheet_title, list, rowStart, rowEnd, colStart, colEnd) => {
        let doc = googleSheets;
        let configs = googleSheets_configs;
        let rowSize;
        let colSize;
        if (configs.autoSheetSize){
            rowSize = rowEnd-rowStart;
            colSize = colEnd-colStart;
        }
        else { //take the default, or the min necessary amount of rows/cols to fit the data
            rowSize = Math.min(configs.defaultSheetRows , rowEnd-rowStart);
            colSize = Math.min(configs.defaultSheetCols , colEnd-colStart);
        }
        const sheet = await doc.addSheet({ title: sheet_title, gridProperties: { rowCount: rowSize, columnCount: colSize, frozenRowCount: (rowStart == 0 ? 1 : 0) } });
        await sheet.loadCells({
            startRowIndex: rowStart, endRowIndex: rowEnd, startColumnIndex: colStart, endColumnIndex: colEnd
        }).catch (err => { throw (err); });
        
        for (let i=colStart; i<colEnd; i++){ //load headers with bold
            const cell = sheet.getCell(rowStart, i); 
            cell.textFormat = { bold: true };
            cell.value = list[i][0];
            cell.wrapStrategy = configs.sheetCellWrap;
        }
        for (let j=rowStart+1; j<rowEnd; j++){
            for (let i=colStart; i<colEnd; i++){
                const cell = sheet.getCell(j, i);
                cell.value = list[i][j];
                cell.wrapStrategy = configs.sheetCellWrap;
            }
        }
        await sheet.saveUpdatedCells()  // save all updates in one call
        .catch (err => { 
            this.botLogs(globals, err.toString()); 
            throw new Error("  (first line of error) ::   "+err.toString().split('\n', 1)[0]); 
        });  
        msg.reply("Data has been dumped to doc "+"<https://docs.google.com/spreadsheets/d/"+doc.spreadsheetId+"#gid="+sheet.sheetId+">\n"+sheet_title);
    },



    isInitialized: function (){
        return (googleSheets !== null)
    },

    init: async function (){
        try { 
            setupConfigs();
        }
        catch (err){
            if ( !googleSheets_configs ){
                console.error(err); //cant continue without configs
                return; //continue without critical error, every command should check isInitialized first
            }
            //else use old configs
            console.error("an error occurred during googleSheets configs setup, thus the configs will fallback on the previous values");
        }
        if ( googleSheets ){
            console.log("NOTICE:  google sheets setup ::  googleSheets already set and will be overwritten");
        }
        console.log("-- connecting to Google Sheets");
        const googleAuth = require(process.cwd()+"/"+googleSheets_configs.GoogleAuthFilePath);
        const doc = new GoogleSpreadsheet(googleSheets_configs.googleSheetsId);
        
        try { await doc.useServiceAccountAuth(googleAuth); }
        catch (err){
            console.error("Error connecting to Sheets ::"); 
            console.error(err);
            return;
        };
        console.log("-- Successfully connected to Google Sheets");
        try { 
            await doc.loadInfo();
            console.log("---- Sheets Workbook title: ["+doc.title+"]");
        }
        catch (err){
            console.error("Error loading info ::");
            console.error(err);
            return;
        };
        googleSheets = doc;
    }
}



function setupConfigs (){
    let gs_configs = null;
    if ( googleSheets_configs ){
        console.log("NOTICE: google sheets setup ::  googleSheets_configs already set and will be overwritten");
    }
    console.log("-- verifying configs");
    gs_configs = require(googleSheetsConfigsPath);
    let invalid = false;
    let missing = [];
    let incorrect = [];
    
    //path should be from the bot base directory
    if ( !gs_configs.hasOwnProperty("GoogleAuthFilePath") ){ invalid = true; missing.push("GoogleAuthFilePath"); }
    else if ( typeof gs_configs.GoogleAuthFilePath !== "string" ){ invalid = true; incorrect.push("GoogleAuthFilePath (invalid type)"); }
    else if ( !fs.existsSync("./"+gs_configs.GoogleAuthFilePath) ){ invalid = true; incorrect.push("GoogleAuthFilePath (invalid path)"); }

    if ( !gs_configs.hasOwnProperty("googleSheetsId") ){ invalid = true; missing.push("googleSheetsId"); }
    else if ( typeof gs_configs.googleSheetsId !== "string" ){ invalid = true; incorrect.push("googleSheetsId"); }
    
    //default 100
    if ( !gs_configs.hasOwnProperty("defaultSheetRows") ){ missing.push("defaultSheetRows (default 100)"); configs["defaultSheetRows"] = DEFAULT_ROWS; }
    else if ( typeof gs_configs.defaultSheetRows !== "number" ){ incorrect.push("defaultSheetRows (default 100)"); configs["defaultSheetRows"] = DEFAULT_ROWS; }

    //default 10
    if ( !gs_configs.hasOwnProperty("defaultSheetCols") ){ missing.push("defaultSheetCols (default 10)"); configs["defaultSheetCols"] = DEFAULT_COLS; }
    else if ( typeof gs_configs.defaultSheetCols !== "number" ){ incorrect.push("defaultSheetCols (default 10)"); configs["defaultSheetCols"] = DEFAULT_COLS; }

    //default true
    if ( !gs_configs.hasOwnProperty("autoSheetSize") ){ missing.push("autoSheetSize (default true)"); configs["autoSheetSize"] = DEFAULT_AUTO_SIZE; }
    else if ( typeof gs_configs.autoSheetSize !== "boolean" ){ incorrect.push("autoSheetSize (default true)"); configs["autoSheetSize"] = DEFAULT_AUTO_SIZE; }

    //default "CLIP"
    if ( !gs_configs.hasOwnProperty("sheetCellWrap") ){ missing.push("sheetCellWrap (default CLIP)"); configs["sheetCellWrap"] = DEFAULT_CELL_WRAP; }
    else if ( gs_configs.sheetCellWrap !== "CLIP" && gs_configs.sheetCellWrap !== "WRAP" && gs_configs.sheetCellWrap !== "OVERFLOW_CELL" ){ incorrect.push("sheetCellWrap (default CLIP)"); configs["sheetCellWrap"] = DEFAULT_CELL_WRAP; }


    if (invalid){
        throw new Error("Invalid google sheets configs ::  missing configs:  \n["+missing.toString().replace(/,/g, ", ")+"]   \n\nincorrect configs: \n["+incorrect.toString().replace(/,/g, ", ")+"]");
    }
        
    if (missing.length > 0)
        console.log("---- google sheets configs used defaults for the following missing entries ::   ["+missing.toString().replace(/,/g, ", ")+"]");
    if (incorrect.length > 0)
        console.log("---- google sheets configs used defaults for the following incorrect entries ::   ["+incorrect.toString().replace(/,/g, ", ")+"]");


    googleSheets_configs = gs_configs;  
}





