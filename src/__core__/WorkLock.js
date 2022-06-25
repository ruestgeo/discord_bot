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
//STRICTLY used only for __core__ files


//#region workLock

const { Mutex, MutexInterface } = require('async-mutex');
const work_lock = new Mutex();
let _release;
let busy = false;

/** Acquire the work lock   (DO NOT USE WITHIN A COMMAND FUNCTION) */
async function acquire (requester){
    // await acquire_work_lock or  acquire_work_lock(~~).then(_ => { do stuff })
    console.log("* attempting to acquire work lock for "+requester+" *");
    if ( work_lock.isLocked() )  console.log("* work lock still active, waiting for unlock for "+requester+" *");
    _release = await work_lock.acquire();
    busy = true;
    console.log("* acquired work lock for "+requester+" *");
}


/** Release the work lock (DO NOT USE UNLESS AFTER ACQUIRING) */
function release (holder){
    if ( !work_lock.isLocked() ) {console.log("*not locked DEBUG*"); return;}
    console.log("* releasing work lock for "+holder+" *");
    busy = false;
    _release();  //work_lock.release();
    //console.log("DEBUG isLocked: "+work_lock.isLocked());
}

//#endregion workLock
module.exports.acquire = acquire;  //for system use only
module.exports.release = release;  //for system use only

/* whether the bot is busy and the worklock is currently locked */
function isBusy(){
    return busy;
}
module.exports.isBusy = isBusy; 
