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




const utils = require('../utils.js'); //base utils is located in the base dir, if needed





module.exports = {
    version: 1.2,
    dumpToSheet: async (msg, globals, sheet_title, list, rowStart, rowEnd, colStart, colEnd) => {
        var doc = globals.googleSheets;
        var configs = globals.googleSheets_configs;
        var rowSize;
        var colSize;
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
        
        for (var i=colStart; i<colEnd; i++){ //load headers with bold
            const cell = sheet.getCell(rowStart, i); 
            cell.textFormat = { bold: true };
            cell.value = list[i][0];
            cell.wrapStrategy = configs.sheetCellWrap;
        }
        for (var j=rowStart+1; j<rowEnd; j++){
            for (var i=colStart; i<colEnd; i++){
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
    }
}






