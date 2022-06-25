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






const Discord = require('discord.js');
const utils = require(process.cwd()+'/utils.js');
//const utils = require('../utils.js');


const fs = require('fs'); 
const { LocalStorage } = require('node-localstorage');

const dbPath = "./_db/";  //path from main process working directory (auto created)

/** @type {{[key: String]: *LocalStorage}} */
let _localStorage = {};

/**
 * @typedef Globals
 * @property {{[key: String]: LocalStorage}} _localStorage
 */


module.exports = {
    version: 1.0,
    func: async function (globals){
        
        console.log("\nSetting up localStorage");
        
        let db = new utils.BotStorage("localStorage",true,has,get,set,del,create,destroy,exists,acquire,clear,size,getMultiple,setMultiple,deleteMultiple,getKeys);
        _localStorage = {};

        //globals["db"] = db;
        //Object.defineProperty(globals, "db", { configurable: false, writable: false }); //freeze the db
        try { utils.setStorage(db); }
        catch (err){ console.error(err); } //if another database already exists
    }
}



/**
 * return whether database at path has key
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @param {String} key 
 * @throws {Error}
 * @returns {Boolean}
*/
async function has ( globals, path, key ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        return (db.getItem(key) !== null);
    }
    catch (err) { throw (err); }
}
/**
 * return value of key in database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @param {String} key 
 * @throws {Error}
 * @returns {*}
*/
async function get ( globals, path, key ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        let value = db.getItem(key);
        try{
            return JSON.parse(value);
        }catch (err){/* if cant parse then just give the raw (probably string) */}
        return value;
    }
    catch (err) { throw (err); }
}
/**
 * set value of key in database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @param {String} key 
 * @param {*} value
 * @throws {Error}
 * @returns {void}
*/
async function set ( globals, path, key, value ){
    try {
        if (typeof(value) !== "string"){
            try {
                let str = JSON.stringify(value);
                value = str;
            }catch (err){
                throw new Error("given value for storing isn't serializable to a string.  Couldn't convert to string ::  "+err);
            }
        }
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        db.setItem(key, value);
    }
    catch (err) { throw (err); }
}
/**
 * delete key in database at path;  return the deleted value
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @param {String} key 
 * @throws {Error}
 * @returns {*}
*/
async function del ( globals, path, key ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        db.removeItem(key);
    }
    catch (err) { throw (err); }
}
/**
 * create database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @throws {Error}
 * @returns {void}
*/
async function create ( globals, path ){
    try {
        if (fs.existsSync(dbPath+path+".ls")) {
            throw new Error("database file already exists ["+dbPath+path+".ls]");
        }
        _localStorage[path] = new LocalStorage(dbPath+path+".ls");
    }
    catch (err) { throw (err); }
}
/**
 * destroy database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @throws {Error}
 * @returns {void}
*/
async function destroy ( globals, path ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        db.clear();
        delete _localStorage[path];
        fs.unlinkSync(dbPath+path+".ls");
        //check and delete any empty dirs
        path = path.replace("\\","/");
        let dirs = path.split("/").reverse();
        currentPath = path.replace(/\/+$/, '');
        for (let dir of dirs.slice(0,dirs.length-1)){
            currentPath = currentPath.substring(0, currentPath.length-dir.length);
            currentPath = currentPath.replace(/\/+$/, '');
            try{
                fs.rmdirSync(currentPath); //throws ENOTEMPTY if directory is not empty
            }
            catch (err){
                console.error("ERROR when deleting"+currentPath);
                break;
            }
        }
    }
    catch (err) { throw (err); }
}
/**
 * database at path exists
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @throws {Error}
 * @returns {Boolean}
*/
async function exists ( globals, path ){
    try {
        if (fs.existsSync(dbPath+path+".ls")){
            if ( !_localStorage.hasOwnProperty(path) )  
                _localStorage[path] = new LocalStorage(dbPath+path+".ls");
            //console.log("DEBUG exists");
            return true;
        }
        //console.log("DEBUG doesn't exist");
        return false;
    }
    catch (err) { throw (err); }
}
/**
 * load or create database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @throws {Error}
 * @returns {void}
*/
async function acquire ( globals, path ){
    try {
        if ( !_localStorage.hasOwnProperty(path) && fs.existsSync(dbPath+path+".ls") )  
            _localStorage[path] = new LocalStorage(dbPath+path+".ls");
        else if ( !_localStorage.hasOwnProperty(path) && !fs.existsSync(dbPath+path+".ls") ){
            _localStorage[path] = new LocalStorage(dbPath+path+".ls"); //throw new Error(`database file [${dbPath}${path}.ls] not found`);
        }
    }
    catch (err) { throw (err); }
}
/**
 * clear out database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @throws {Error}
 * @returns {void}
*/
async function clear ( globals, path ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        db.clear();
    }
    catch (err) { throw (err); }
}
/**
 * return the number of items in the database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @throws {Error}
 * @returns {Number}
*/
async function size ( globals, path ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        return db.length;
    }
    catch (err) { throw (err); }
}
/**
 * return array of values of keys in database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @param {String[]} keys 
 * @throws {Error}
 * @returns {*[]}
*/
async function getMultiple ( globals, path, keys ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        let values = [];
        for (let key of keys){
            let value =  db.getItem(key).trim();
            try{
                let parsed = JSON.parse(value);
                value = parsed;
            }catch (err){/* if cant parse then just give the raw (probably string) */}
            values.push(value);
        }
        return values;
    }
    catch (err) { throw (err); }
}
/**
 * set values of keys in database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @param {{[key: String]: *}} keyValuePairs
 * @throws {Error}
 * @returns {void}
*/
async function setMultiple ( globals, path, keyValuePairs ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        let errors = [];
        for (let key in keyValuePairs){
            if (typeof(keyValuePairs[key]) !== "string"){
                try {
                    let str = JSON.stringify(keyValuePairs[key]);
                    keyValuePairs[key] = str;
                }
                catch (err){ errors.push(key); }
            }
        }
        if (errors.length > 0) throw new Error("values for the following keys are not strings and cannot be stringified ["+errors+"]");
        for (let key in keyValuePairs){
            db.setItem(key, keyValuePairs[key]); 
        }
    }
    catch (err) { throw (err); }
}
/**
 * delete keys in database at path;  return the deleted values
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @param {String[]} keys
 * @throws {Error}
 * @returns {*[]}
*/
async function deleteMultiple ( globals, path, keys ){
    try {
        if ( !_localStorage.hasOwnProperty(path) ) throw new Error(`[${path}] not found in localStorage collection`);
        let db = _localStorage[path];
        for (let key of key_array){
            db.removeItem(key);
        }
    }
    catch (err) { throw (err); }
}
/**
 * return all the keys in the database at path
 * @param {Globals} globals
 * @param {String} path name of the database (and path to it, if applicable)
 * @throws {Error}
 * @returns {String[]}
*/
async function getKeys ( globals, path ){
    try {
        if ( !_localStorage.hasOwnProperty(dbName) ) throw new Error(`db [${dbName}] not found in collection`);
        let db = _localStorage[dbName];
        let keys = [];
        for (let n = 0;  n < db.length  ;n++){
            keys.push(db.key(n));
        }
        return keys;
    }
    catch (err) { throw (err); }
}

