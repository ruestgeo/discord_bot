

This directory/folder is not used for anything!

If you wish to create tasks to handle on bot shutdown then
either define a requisite shutdownTask,
or import and run "('utils.js').addShutdownTask" which takes a `name` and a function (or async function)
that takes `globals` as an argument;
`addShutdownTask` can be called via _startup files or when you deem it appropriate in a command.

addShutdownTasks will accept either a function, or an array of functions.



examples:

```// `startup_file.js`

const utils = require(process.cwd()+'/utils.js'); 

module.exports = {
    
    ~~~

    func: async function (globals){
        utils.addShutdownTasks(name, [myFunction, anotherFunction]);
    }


```




```// `_commands/command.js`

const utils = require(process.cwd()+'/utils.js'); 

module.exports = {

    ~~~

    requisites: {
        "shutdownTasks": [/*{title: "task1", func: (globals) => void|Promise} || func: (globals) => void|Promise, ...*/]
        //if no title is provided then it will be labeled "_" under the fileName
    },

    func: async function (globals, msg, content){
        utils.addShutdownTasks("myFunction_shutdown", myFunction);
    }
    ~~~

}

