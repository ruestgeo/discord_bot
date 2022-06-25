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

// Do NOT import this file nor modify (unless bugged or upgrading)
//  import utils.js for any required utility functions


const { Mutex, MutexInterface } = require('async-mutex');

const { Globals } = require('./_typeDef.js');
const { isAsync } = require('./MiscUtils.js');



/** Template for bot storage.
 ** Provide async functions for has, get, set, del, create, destroy, exists, acquire, clear, size, getMultiple, setMultiple, deleteMultiple, getKeys.
 ** Expect each function to throw Error.
 ** Key uniqueness is expected.
 * @param {String} name name of the storage
 * @param {Boolean} useMutex whether to use a mutex
 * @param {( globals: Globals, path: String ) => Promise<Boolean>} has return whether database at path has key
 * @param {( globals: Globals, path: String ) => Promise<*>} get return value of key in database at path
 * @param {( globals: Globals, path: String, key: String, value: * ) => Promise<void>} set set value of key in database at path
 * @param {( globals: Globals, path: String ) => Promise<*>} del delete key in database at path;  return the deleted value
 * @param {( globals: Globals, path: String ) => Promise<void>} create create database at path
 * @param {( globals: Globals, path: String ) => Promise<void>} destroy destroy database at path
 * @param {( globals: Globals, path: String ) => Promise<Boolean>} exists database at path exists
 * @param {( globals: Globals, path: String ) => Promise<void>} acquire load or create database at path
 * @param {( globals: Globals, path: String ) => Promise<void>} clear clear out database at path
 * @param {( globals: Globals, path: String ) => Promise<Number>} size return the number of items in the database at path
 * @param {( globals: Globals, path: String, keys: String[] ) => Promise<*[]>} getMultiple return array of values of keys in database at path
 * @param {( globals: Globals, path: String, keyValuePairs: {[key: String]: *} ) => Promise<void>} setMultiple set values of keys in database at path
 * @param {( globals: Globals, path: String, keys: String[] ) => Promise<*[]>} deleteMultiple delete keys in database at path;  return the deleted values
 * @param {( globals: Globals, path: String ) => Promise<String[]>} getKeys return all the keys in the database at path
 * @throws {Error} if invalid args are provided
 */
 class BotStorage {
    /** @type {( globals: Globals, path: String, key: String ) => Promise<Boolean>}  */
    #_has;
    /** @type {( globals: Globals, path: String, key: String ) => Promise<*>}  */
    #_get;
    /** @type {( globals: Globals, path: String, key: String, value: * ) => Promise<void>}  */
    #_set;
    /**  @type {( globals: Globals, path: String, key: String ) => Promise<*>}  */
    #_delete;
    /** @type {( globals: Globals, path: String ) => Promise<void>}  */
    #_create;
    /** @type {( globals: Globals, path: String ) => Promise<void>}  */
    #_destroy;
    /** @type {( globals: Globals, path: String ) => Promise<Boolean>}  */
    #_exists;
    /** @type {( globals: Globals, path: String ) => Promise<void>}  */
    #_acquire;
    /** @type {( globals: Globals, path: String ) => Promise<void>}  */
    #_clear;
    /** @type {( globals: Globals, path: String ) => Promise<Number>}  */
    #_size;
    /** @type {( globals: Globals, path: String, keys: String[] ) => Promise<*[]>}  */
    #_getMultiple;
    /** @type {( globals: Globals, path: String, keyValuePairs: {[key: String]: *} ) => Promise<void>}  */
    #_setMultiple;
    /** @type {( globals: Globals, path: String, keys: String[] ) => Promise<*[]>}  */
    #_deleteMultiple;
    /** @type {( globals: Globals, path: String ) => Promise<String[]>}  */
    #_getKeys;

    /** @type {String} */
    #__name;
    /** @type {Mutex} */
    #__storage_lock;
    /** @type {MutexInterface.Releaser} */
    #__release;


    /**
     * Template for bot storage.
     * Provide async functions for has, get, set, del, create, destroy, exists, acquire, clear, size, getMultiple, setMultiple, deleteMultiple, getKeys.
     * Expect each function to throw Error.
     * Key uniqueness is expected.
     * @param {String} name name of the storage
     * @param {Boolean} useMutex whether to use a mutex
     * @param {( globals: Globals, path: String ) => Promise<Boolean>} has return whether database at path has key
     * @param {( globals: Globals, path: String ) => Promise<*>} get return value of key in database at path
     * @param {( globals: Globals, path: String, key: String, value: * ) => Promise<void>} set set value of key in database at path
     * @param {( globals: Globals, path: String ) => Promise<*>} del delete key in database at path;  return the deleted value
     * @param {( globals: Globals, path: String ) => Promise<void>} create create database at path
     * @param {( globals: Globals, path: String ) => Promise<void>} destroy destroy database at path
     * @param {( globals: Globals, path: String ) => Promise<Boolean>} exists database at path exists
     * @param {( globals: Globals, path: String ) => Promise<void>} acquire load or create database at path
     * @param {( globals: Globals, path: String ) => Promise<void>} clear clear out database at path
     * @param {( globals: Globals, path: String ) => Promise<Number>} size return the number of items in the database at path
     * @param {( globals: Globals, path: String, keys: String[] ) => Promise<*[]>} getMultiple return array of values of keys in database at path
     * @param {( globals: Globals, path: String, keyValuePairs: {[key: String]: *} ) => Promise<void>} setMultiple set values of keys in database at path
     * @param {( globals: Globals, path: String, keys: String[] ) => Promise<*[]>} deleteMultiple delete keys in database at path;  return the deleted values
     * @param {( globals: Globals, path: String ) => Promise<String[]>} getKeys return all the keys in the database at path
     * @throws {Error} if invalid args are provided
     */
    constructor (name,useMutex,has,get,set,del,create,destroy,exists,acquire,clear,size,getMultiple,setMultiple,deleteMultiple,getKeys){
        if ( typeof useMutex !== "boolean" || typeof size !== "function" ||
            typeof has !== "function" || typeof get !== "function" || 
            typeof set !== "function" || typeof del !== "function" || 
            typeof create !== "function" || typeof destroy !== "function" ||
            typeof exists !== "function" || typeof acquire !== "function" || 
            typeof clear !== "function" || typeof getMultiple !== "function" || 
            typeof setMultiple !== "function" || typeof deleteMultiple !== "function" ||
            typeof getKeys !== "function" ||
            !isAsync(has) || !isAsync(get) || !isAsync(set) || !isAsync(del) || 
            !isAsync(create) || !isAsync(destroy) || !isAsync(exists) || !isAsync(acquire) || !isAsync(clear) || 
            !isAsync(size) || !isAsync(getMultiple) || !isAsync(setMultiple) || !isAsync(deleteMultiple) || !isAsync(getKeys)
        )
            throw new Error ("Invalid args for BotStorage constructor.\nMust provide an async function for has,get,set,del,create,destroy,exists,acquire,clear,size,getMultiple,setMultiple,deleteMultiple");
        this.#_has = has;
        this.#_get = get;
        this.#_set = set;
        this.#_delete = del;
        this.#_create = create;
        this.#_destroy = destroy;
        this.#_exists = exists;
        this.#_acquire = acquire;
        this.#_clear = clear;
        this.#_size = size;
        this.#_getMultiple = getMultiple;
        this.#_setMultiple = setMultiple;
        this.#_deleteMultiple = deleteMultiple;
        this.#_getKeys = getKeys;
        this.#__storage_lock = useMutex ? new Mutex() : null;
        this.#__name = name;
    }

    async #acquireLock (){ this.#__release = await this.#__storage_lock.acquire(); }
    #releaseLock (){ this.#__release(); }

    get name (){ return this.#__name; }
//#region BotStorageFuncs
    /**
     * return whether database at path has key
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @param {String} key 
     * @throws {Error}
     * @returns {Boolean}
     */
    async has ( globals, path, key ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_has(globals, path, key);
        await this.#acquireLock();
        try{ return await this.#_has(globals, path, key); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * return value of key in database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @param {String} key 
     * @throws {Error}
     * @returns {*}
     */
    async get ( globals, path, key ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_get(globals, path, key);
        await this.#acquireLock();
        try{ return await this.#_get(globals, path, key); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
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
    async set ( globals, path, key, value ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_set(globals, path, key, value);
        await this.#acquireLock();
        try{ return await this.#_set(globals, path, key, value); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * delete key in database at path;  return the deleted value
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @param {String} key 
     * @throws {Error}
     * @returns {*}
     */
    async delete ( globals, path, key ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_delete(globals, path, key);
        await this.#acquireLock();
        try{ return await this.#_delete(globals, path, key); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * create database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @throws {Error}
     * @returns {void}
     */
    async create ( globals, path ){ 
        if ( !this.#__storage_lock )
            return await this.#_create(globals, path); 
        await this.#acquireLock();
        try{ return await this.#_create(globals, path); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * destroy database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @throws {Error}
     * @returns {void}
     */
    async destroy ( globals, path ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_destroy(globals, path);
        await this.#acquireLock();
        try{ return await this.#_destroy(globals, path); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * database at path exists
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @throws {Error}
     * @returns {Boolean}
     */
    async exists ( globals, path ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_exists(globals, path);
        await this.#acquireLock();
        try{ return await this.#_exists(globals, path); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * load or create database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @throws {Error}
     * @returns {void}
     */
    async acquire ( globals, path ){ 
        if ( !this.#__storage_lock )
            return await this.#_acquire(globals, path); 
        await this.#acquireLock();
        try{ return await this.#_acquire(globals, path); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * clear out database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @throws {Error}
     * @returns {void}
     */
    async clear ( globals, path ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_clear(globals, path);
        await this.#acquireLock();
        try{ return await this.#_clear(globals, path); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * return the number of items in the database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @throws {Error}
     * @returns {Number}
     */
    async size ( globals, path ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_size(globals, path);
        await this.#acquireLock();
        try{ return await this.#_size(globals, path); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * return array of values of keys in database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @param {String[]} keys 
     * @throws {Error}
     * @returns {*[]}
     */
    async getMultiple ( globals, path, keys ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_getMultiple(globals, path, keys);
        await this.#acquireLock();
        try{ return await this.#_getMultiple(globals, path, keys); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * set values of keys in database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @param {{[key: String]: *}} keyValuePairs
     * @throws {Error}
     * @returns {void}
     */
    async setMultiple ( globals, path, keyValuePairs ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_setMultiple(globals, path, keyValuePairs);
        await this.#acquireLock();
        try{ return await this.#_setMultiple(globals, path, keyValuePairs); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * delete keys in database at path;  return the deleted values
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @param {String[]} keys
     * @throws {Error}
     * @returns {*[]}
     */
    async deleteMultiple ( globals, path, keys ){ 
        if ( !this.#__storage_lock ) 
            return await this.#_deleteMultiple(globals, path, keys); 
        await this.#acquireLock();
        try{ return await this.#_deleteMultiple(globals, path, keys); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
    /**
     * getKeys return all the keys in the database at path
     * @param {Globals} globals
     * @param {String} path name of the database (and path to it, if applicable)
     * @throws {Error}
     * @returns {String[]}
     */
    async getKeys ( globals, path ){
        if ( !this.#__storage_lock ) 
            return await this.#_getKeys(globals, path); 
        await this.#acquireLock();
        try{ return await this.#_getKeys(globals, path); }
        catch (err) {throw (err)}
        finally { this.#releaseLock(); }
    }
//#endregion BotStorageFuncs
}
module.exports.BotStorage = BotStorage;


/** PRIMARY STORAGE
 * additional storage can be stored in a specified utils
 */
let database = null;

/** @param {BotStorage} db */
function setStorage (db){
    if (database) throw new Error("Primary database already exists");
    database = db;
}
/** @returns {BotStorage} */
function getStorage (){
    return database;
}

module.exports.setStorage = setStorage;
module.exports.getStorage = getStorage;



