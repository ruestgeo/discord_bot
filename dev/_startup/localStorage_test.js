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

const localStorage = require('../_utils/localStorage_utils.js');

var dbName = "music";


module.exports = {
    version: 1.0,
    func: async function (globals){
        var leading_space = "        ";
        console.log(leading_space + "Setting up local storage for test");

        if ( !(await localStorage.db_exists(dbName)) ) { await localStorage.db_create(dbName); }
        //else localStorage.db_acquire("music") //db_exists will acquire at the same time

        await localStorage.put(dbName, "test", {"this":"is a test", "int": 0});
        await localStorage.put(dbName, "asdf", false);
        await localStorage.put(dbName, "1234", [2,7,5]);
        //await localStorage.put(dbName, "aaaaa", 42);
        console.log("finished put");

        var testbool = await localStorage.get(dbName, "asdf");
        console.log( testbool == false ? "equals false bool": "doesn't equal false bool");
        console.log(testbool);
        var test = await localStorage.get(dbName, "test");
        console.log(test["this"]);
        console.log(test["int"]);
        var test2 = await localStorage.get(dbName, "1234");
        console.log(test2[2]);
        console.log(test2.length);

        console.log(await localStorage.get(dbName, "null")); //doesn't exist
        


        
    }
        
}








