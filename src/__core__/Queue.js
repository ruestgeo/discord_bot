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


/** Basic queue.
 ** if given capacity then there is a limit to the size, otherwise no limit.
 ** if given an array then the queue is created using that array
 * @param {Number | undefined} [capacity] optional
 * @param {Array <*> |undefined} [array] optional
 */
 class Queue {
    /**
     * @param {Number | undefined} [capacity] optional
     * @param {Array <*>} [array] optional
     */
    constructor (capacity, array) {
        if (capacity) {
            if (!Number.isInteger(capacity))
                throw new Error("Invalid arg given:  [" + capacity + "] is not an integer");
            if (capacity < 1)
                throw new Error("Invalid arg given:  capacity less than 1");
            if (array) {
                if (array.length > capacity)
                    throw new Error("Invalid args:  Array is larger than given capacity");
            }
        }
        if (!Array.isArray(array))
            throw new Error("Invalid arg for array");

        _elements = array ?? [];
        _capacity = capacity;
    }
    /**
     * add element to the end of the queue
     * @param {*} element item to add to the queue
     * @throws {Error} if queue has capacity and is full
     **/
    enqueue(element) {
        if (_capacity && _elements.length == _capacity)
            throw new Error(`Queue is full ( ${_elements.length} / ${_capacity} )`);
        _elements.push(element);
    }
    /**
     * return and remove the first element of the queue
     * @return {*} return the first item from the queue
     **/
    dequeue() {
        if (_elements.length < 1)
            throw new Error(_capacity ? `Queue is empty ( ${_elements.length} / ${_capacity} )` : "Queue is empty");
        return _elements.shift();
    }
    /**
     * alias for enqueue
     * @param {*} element item to add to the queue
     * @throws {Error} if queue has capacity and is full
     **/
    push(element) {
        try { enqueue(element); }
        catch (err) { throw (err); }
    }
    /**
     * alias for dequeue
     * @return {*} return the first item from the queue
     **/
    pop() {
        try { return dequeue(); }
        catch (err) { throw (err); }
    }
    /**
     * return true if empty
     * @return {Boolean} whether the queue is empty
     **/
    isEmpty() {
        return _elements.length == 0;
    }
    /**
     * return the first element of the queue without removing, or undefined
     * @return {*} return the first item on the queue
     **/
    peek() {
        return (isEmpty() ? null : _elements[0]);
    }
    /**
     * return current size of the queue
     * @return {Number} the length of the queue
     **/
    length() {
        return _elements.length;
    }
    /**
     * return current size of the queue
     * @return {Number} the length of the queue
     **/
    size() {
        return _elements.length;
    }
    /**
     * return capacity (might be undefined)
     * @return {Number | undefined } the capacity of the queue or undefined if there is no capacity
     **/
    capacity() {
        return _capacity;
    }
    /**
     * remove first instance of element from queue and returns it
     * @param {*} element the item to look for to remove
     * @return {*} the removed element
     **/
    remove(element) {
        let index = _elements.indexOf(element);
        if (index < 0)
            throw new Error("element not found in Queue");
        return _elements.splice(index, 1);
    }
    /** 
     * @callback findIndexPredicate
     * @param {*} element The current element being processed in the array
     * @param {Number | undefined} index [OPTIONAL] The index of the current element being processed in the array
     * @param {Array <*> | undefined} array [OPTIONAL] The array findIndex() was called upon
     * @return {Boolean} returns true an element satisfies the condition
     */
    /**
     * remove the first element to satisfy the conditionFunction and return it
     * @param {findIndexPredicate} conditionFunction a function that is executed on each item on the queue until it finds one that returns true
     * @return {*} the removed element
     */
    removeOneConditioned(conditionFunction) {
        let index = _elements.findIndex(conditionFunction);
        if (index < 0)
            throw new Error("element not found in Queue");
        return _elements.splice(index, 1);
    }
    /**
     * remove element at index of queue
     * @param {Number} index the index of the item to remove
     * @return {*} the removed element
     **/
    removeIndex(index) {
        return _elements.splice(index, 1);
    }
    /**
     * remove element at index of queue
     * @param {Number} index the index of the item to remove
     * @return {*} the removed element
     **/
    removePosition(index) {
        return _elements.splice(index, 1);
    }
    /**
     * remove all instances of element from queue
     * @param {*} element the item to remove all instances of
     **/
    removeAll(element) {
        _elements = _elements.filter(Q_item => Q_item !== element);
    }
    /**
     * clear the queue
     **/
    clear() {
        _elements = [];
    }
    /**
     * insert element into the queue at position
     * @param {*} element the item to insert into the queue
     * @param {Number} index the index to insert at
     * @throws {Error} if the queue has a capacity and it is full
     **/
    insert(element, index) {
        if (_capacity && _elements.length == _capacity)
            throw new Error("Queue is full ( " + _elements.length + " / " + _capacity + " )");
        _elements.splice(index, 0, element);
    }
    /**
     * return whether queue contains element
     * @param {*} element the item to search for
     **/
    has(element) {
        return _elements.includes(element);
    }
    /**
     * return whether queue contains element
     * @param {*} element the item to search for
     **/
    includes(element) {
        return _elements.includes(element);
    }
    /**
     * return index of first occurence of element (optional startIndex and endIndex)
     * @param {*} element the item to search for
     * @param {Number} startIndex 
     * @param {Number} endIndex 
     **/
    indexOf(element, startIndex, endIndex) {
        if (endIndex)
            return _elements.substring(startIndex, endIndex).indexOf(element) + startIndex;
        if (startIndex)
            return _elements.substring(startIndex).indexOf(element) + startIndex;
        return _elements.indexOf(element);
    }
    /**
     * return number of occurences of element in queue
     * @param {*} element the item to count occurences of
     * @return {Number} the number of occurences
     **/
    count(element) {
        return _elements.filter(Q_item => Q_item === element).length;
    }
    /**
     * return a key-value copy of queue with indices as keys
     * @return {Object}
     **/
    toKeyValue() {
        let keyval = {};
        for (let idx = 0; idx < _elements.length; idx++) {
            keyval[idx] = _elements[idx];
        }
        return keyval;
    }
    /**
     * @callback arrayMappingFunction
     * @param {*} element The current element being processed in the array
     * @param {Number | undefined} index [OPTIONAL] The index of the current element being processed in the array
     * @param {Array<*> | undefined} array [OPTIONAL] The array map was called upon
     */
    /**
     * apply a map function on a copy of the queue and return the result
     * @param {arrayMappingFunction} mappingFunction a function to apply on each item in the queue
     * @return {Array <*>} the resulting queue array
     */
    map(mappingFunction) {
        return _elements.map(mappingFunction);
    }
    /**
     * @callback arrayFilterFunction
     * @param {*} element The current element being processed in the array
     * @param {Number | undefined} index [OPTIONAL] The index of the current element being processed in the array
     * @param {Array<*> | undefined} array [OPTIONAL] The array filter was called upon
     * @return {Boolean} returns true if the element satisfies the condition
     */
    /**
     * apply a filter function on a copy of the queue and return the result
     * @param {arrayFilterFunction} filterFunction a function to apply to each item in the queue
     * @return {Array <*>} the resulting queue array
     */
    filter(filterFunction) {
        return _elements.filter(filterFunction);
    }
    /**
     * return a shallow copy of queue
     * @return {Array <*>}
     **/
    copy() {
        return Array.from(_elements);
    }
    /**
     * return queue array as a string
     * @return {String}
     **/
    toString() {
        return `[${_elements.toString()}]`;
    }
    /**
     * stringify the queue
     * @return {String}
     **/
    stringify() {
        return JSON.stringify(_elements);
    }
    /**
     * create a new Queue from the array with a given capacity
     * @param {Array <*>} array 
     * @param {Number | undefined} [capacity] optional
     * @return {Queue}
     **/
    static from(array, capacity) {
        try { return new Queue(capacity, array); }
        catch (err) { throw (err); }
    }
}
module.exports.Queue = Queue;

