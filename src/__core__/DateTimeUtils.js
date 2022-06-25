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



const DEFAULT_TIMEZONE = "Etc/UTC";

const luxon = require('luxon');
const DateTime = luxon.DateTime;

const { Globals } = require('./_typeDef');



module.exports.DEFAULT_TIMEZONE = DEFAULT_TIMEZONE;



//#region dateTimeUtils
const dayNum = {
    "Sunday": 0,
    "Monday": 1,
    "Tuesday": 2,
    "Wednesday": 3,
    "Thursday": 4,
    "Friday": 5,
    "Saturday": 6
}
const dayMatch = {
    "Sunday": ["s","sun","sunday"],
    "Monday": ["m","mon","monday"],
    "Tuesday": ["t","tue","tues","tuesday"],
    "Wednesday": ["w","wed","wedn","wedne","wednes","wednesday"],
    "Thursday": ["th","thu","thur","thurs","thursday"],
    "Friday": ["f","fri","friday"],
    "Saturday": ["s","sat","satur","saturday"]
}


/**
 * Get the proper representation of a day as a string (ex: Friday) from any form of string representing a week day (excluding a date string)
 * @param {String} day 
 * @returns {String} a proper day string like "Wednesday"
 */
function matchDay (day){
    let match = Object.entries(dayMatch).find(([k,v]) => v.includes(day.toLowerCase()) );
    return (match ? match[0] : null);
}


/**
 * Get the Date objects of the days of the week (from Sunday to Saturday) for the week of the given Date object
 * @param {Date} day 
 * @returns {{"String": Date}} an k-v object containing an entry of Date's for each weekday
 */
function getWeekDays (day){
    let first = day.getDate()-day.getDay();
    return {
        "Sunday": new Date(new Date(day).setDate(first)),
        "Monday": new Date(new Date(day).setDate(first+1)),
        "Tuesday": new Date(new Date(day).setDate(first+2)),
        "Wednesday": new Date(new Date(day).setDate(first+3)),
        "Thursday": new Date(new Date(day).setDate(first+4)),
        "Friday": new Date(new Date(day).setDate(first+5)),
        "Saturday": new Date(new Date(day).setDate(first+6)),
    }
}


/**
 * Get the first date of a week (Sunday to Saturday) given the week number
 * @param {Number} weekNum a week number from 1 to 52
 * @param {Number} year 
 * @returns {Date} first day / sunday of that week
 */
function getWeekDate (weekNum, year) {
    let simple = new Date(year, 0, 1 + (weekNum - 1) * 7);
    let day = simple.getDay();
    let date = simple;
    if (day <= 4)
        date.setDate(simple.getDate() - simple.getDay());
    else
        date.setDate(simple.getDate() + 7 - simple.getDay());
    return date;
}


/**
 * Get the week number from a given Date object (week from Sunday to Saturday)
 * @param {Date} date
 * @returns {Number} the week number of that date
 */
function getWeekFromDate (date){
    let firstDay = new Date(date.getFullYear(),0,1);
    let firstSunday = new Date(firstDay).setDate(firstDay.getDate()-firstDay.getDay()+6);
    //console.log(firstDay.toString());console.log(firstSunday.toString());
    let numberOfDays = Math.floor((date - firstSunday) / (24 * 60 * 60 * 1000));
    return Math.ceil(numberOfDays / 7);
}
//#endregion dateTimeUtils
module.exports.dayNum          = dayNum;
module.exports.dayMatch        = dayMatch;
module.exports.matchDay        = matchDay;
module.exports.getWeekDays     = getWeekDays;
module.exports.getWeekDate     = getWeekDate;
module.exports.getWeekFromDate = getWeekFromDate;


//#region DateTime

/** Obtain a DateTime obj of the corresponding timezone
 * @param {Globals} globals
 * @return {luxon.DateTime} the current time in the set timezome
 */
 function getDateTime (globals){
    let zone = globals?.configs?.IANAZoneTime ?? DEFAULT_TIMEZONE;
    if (DateTime.local().setZone(zone).isValid) { 
        return DateTime.fromISO(DateTime.utc(), {zone: zone}); 
    }
    else { return DateTime.utc(); } //invalid IANA zone identifier, use UTC as default
}


/** Return the current time as a string (24h)
 * @param {Globals} globals
 * @return {String} return the date and time as a string (hour,minute,seconds)
 */
function getTimeString (globals){
    return getDateTime(globals).toLocaleString({hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit'});
}


/** Return the current time as a string (12h + TZ) 
 * @param {Globals} globals
 * @return {String} return the date and time as a string (hour,minute,seconds,timezone)
 */
function getTimeString2 (globals){
    return getDateTime(globals).toLocaleString({hourCycle: 'h11', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: "short"});
}


/** Return the current date and time as a string
 * @param {Globals} globals
 * @return {String} return the date and time as a string (weekday, month,day,year,hour,minute,seconds,timezone)
 */
function getDateTimeString (globals) {
    return getDateTime(globals).toLocaleString({hourCycle: 'h11', weekday: 'short', month: 'short', day: '2-digit', year: "numeric", hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: "short" });
}


/** Return the date as a string 
 * @param {Globals} globals
 * @returns {String} the date in the format "year-MM-DD-weekday{3}-timezone{abbreviated}"
*/
function getDate (globals){
    return getDateTime(globals).toFormat("y'-'MM'-'dd'_'ccc'_'ZZZZ");
    //return getDateTime(globals).toLocaleString({ year: "numeric", month: 'short', day: '2-digit', weekday: 'short', timeZoneName: "short" });
}

//#endregion DateTime
module.exports.getDateTime       = getDateTime;
module.exports.getDate           = getDate;
module.exports.getTimeString     = getTimeString;
module.exports.getTimeString2    = getTimeString2;
module.exports.getDateTimeString = getDateTimeString;



