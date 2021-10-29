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

//NOTE: only string  keys and values for localstorage


const utils = require(process.cwd()+'/utils.js');

const fs = require('fs'); 
const { LocalStorage } = require('node-localstorage');

const dbPath = "./_db/";  //path from main process working directory (auto created)
const dbCollection = {};

const { Mutex } = require('async-mutex');
const storage_lock = new Mutex();
var release;



async function acquireLock(requester){
    //console.log("+ attempting to acquire storage lock for "+requester+" +");
    //if ( storage_lock.isLocked() )  console.log("+ storage lock still active, waiting for unlock for "+requester+" +");
    release = await storage_lock.acquire();
    //console.log("+ acquired work lock for "+requester+" +");
}
function releaseLock (holder){
    //console.log("+ releasing work lock for "+holder+" +");
    release();
}


module.exports = {
    version: 1.0,
    


    //insert element to specified database
    put: async function (dbName, key, value){ 
        await acquireLock("localstorage_utils.put");
        try {
            if (typeof(value) !== "string"){
                try {
                    var str = JSON.stringify(value);
                    value = str;
                }catch (err){
                    throw new Error("given value for storing isn't a string.  Couldn't convert to string ::  "+err);
                }
            }
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            db.setItem(key, value);
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.put"); }
    },



    //insert all elements of given key_val to specified database (key_val may be modified)
    putMultiple: async function (dbName, key_val){ 
        await acquireLock("localstorage_utils.putMultiple");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            var errors = [];
            for (var key in key_val){
                if (typeof(key_val[key]) !== "string"){
                    try {
                        var str = JSON.stringify(key_val[key]);
                        key_val[key] = str;
                    }
                    catch (err){ errors.push(key); }
                }
            }
            if (errors.length > 0) throw new Error("values for the following keys are not strings and cannot be stringified ["+errors+"]");
            for (var key in key_val){
                db.setItem(key, value); 
            }
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.putMultiple"); }
    },



    //get element from specified database
    get: async function (dbName, key){ 
        await acquireLock("localstorage_utils.get");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            var value = db.getItem(key);
            try{
                return JSON.parse(value);
            }catch (err){/* if cant parse then just give the raw (probably string) */}
            return value;
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.get"); }
    },
    



    //get multiple elements from specified database
    getMultiple: async function (dbName, key_array){ 
        await acquireLock("localstorage_utils.getMultiple");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            var key_val = {};
            for (var key of key_array){
                var value =  db.getItem(key).trim();
                try{
                    let parsed = JSON.parse(value);
                    value = parsed;
                }catch (err){/* if cant parse then just give the raw (probably string) */}
                key_val[key] = value;
            }
            return key_val;
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.getMultiple"); }
    },



    //get all elements from specified database
    getAll: async function (dbName){ 
        await acquireLock("localstorage_utils.getAll");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            var key_val = {};
            for (var n = 0;  n < db.length  ;n++){
                var key = db.key(n);
                var value =  db.getItem(key).trim();
                try{
                    let parsed = JSON.parse(value);
                    value = parsed;
                }catch (err){/* if cant parse then just give the raw (probably string) */}
                key_val[key] = value;
            }
            return key_val;
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.getAll"); }
    },



    //remove element from specified database
    remove: async function (dbName, key){ 
        await acquireLock("localstorage_utils.remove");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            db.removeItem(key);
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.remove"); }
    },



    //remove multiple elements from specified database
    removeMultiple: async function (dbName, key_array){ 
        await acquireLock("localstorage_utils.removeMultiple");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            for (var key of key_array){
                db.removeItem(key);
            }
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.removeMultiple"); }
    },



    //remove all element from specified database
    clear: async function (dbName){ 
        await acquireLock("localstorage_utils.clear");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            db.clear();
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.clear"); }
    },



    //(DEPREC) specified database has element 
    has: async function (dbName, key){ 
        await acquireLock("localstorage_utils.has");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            return (db.getItem(key) !== null);
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.has"); }
    },



    //return length of the database
    length: async function (dbName){ 
        await acquireLock("localstorage_utils.length");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
            var db = dbCollection[dbName];
            return db.length;
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.length"); }
    },



    //create database with specified name
    db_create: async function (dbName){ 
        await acquireLock("localstorage_utils.db_create");
        try {
            if (fs.existsSync(dbPath+dbName+".ls")) {
                throw new Error("database file already exists ["+dbPath+dbName+".ls]");
            }
            dbCollection[dbName] = new LocalStorage(dbPath+dbName+".ls");
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.db_create"); }
    },



    //check if specified database exists, if so add it to collection if not already in
    db_exists: async function (dbName){ 
        await acquireLock("localstorage_utils.db_exists");
        try {
            if (fs.existsSync(dbPath+dbName+".ls")){
                if ( !dbCollection.hasOwnProperty(dbName) )  
                    dbCollection[dbName] = new LocalStorage(dbPath+dbName+".ls");
                //console.log("DEBUG exists");
                return true;
            }
            //console.log("DEBUG doesn't exist");
            return false;
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.db_exists"); }
    },



    //acquire the specified database or create if doesn't exist
    db_acquire: async function (dbName){ 
        await acquireLock("localstorage_utils.db_acquire");
        try {
            if ( !dbCollection.hasOwnProperty(dbName) && fs.existsSync(dbPath+dbName+".ls") )  
                dbCollection[dbName] = new LocalStorage(dbPath+dbName+".ls");
            else if ( !dbCollection.hasOwnProperty(dbName) && !fs.existsSync(dbPath+dbName+".ls") ){
                dbCollection[dbName] = new LocalStorage(dbPath+dbName+".ls"); //throw new Error(`database file [${dbPath}${dbName}.ls] not found`);
            }
        }
        catch (err) { throw (err); }
        finally { releaseLock("localstorage_utils.db_acquire"); }
    }
}






