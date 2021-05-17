# Discord bot

## 
using:
- node version 12(.18.2)
- discord.js version 12.5.3


This bot is intended for light use and is primarily intended for single server use.  It can be used across multiple servers, however some included commands  may not behave as expected in a multi-server setup.  

The code for the bot is fully open-sourced, available at https://github.com/ruestgeo/discord_bot

Feel free to use or distribute the code as you like, however according to the license you must not privatize the source code, modifications, or additions.  


## Setup

Provide **auth.json** in the **_private** directory, an example has been provided.

Provide **configs.json** in the base directory (same location as bot.js and main.js).

If using the google sheets functions then additional setup is required and a **googleClientSecret.json** must be obtained and placed in **_private**, as well as a **googleSheets_configs.json** in the **configs** directory where an example has been provided.
You can see https://www.youtube.com/watch?v=UGN6EUi4Yio  for some instructions on the process if needed.

--NOTE: **auth.json** and **googleClientSecret.json**  have sensitive data and are confidential, do not share them with anyone.  It may also be of interest to not share **configs.json**  although the data is less sensitive. 
It is possible to change the names of these files, just change the path in the configs file respectively.


## Launching
### node and npm
You can launch the bot using the command `node main.js` when in the code base directory (**src**).

The Node.JS version mentioned above or fully compatable versions are required when launching through `node`.

### executable
Alternatively you can use a compiler such as Nexe (https://github.com/nexe/nexe) to compile it all (except the modular parts) into an executable (.exe) for ease of use.

`npm install -g nexe`
`nexe main.js -r "bot.js" -r "utils.js" -r "node_modules/**/*"` or `nexe main.js -r "node_modules/**/*"`

This will enable use of the executable (.exe) without requiring the **node_modules** directory, nor installing **npm** or **node**.

Note that this means the created exe will only have access to the currently installed packages, and any additional packages that are required in the modular javascript files will require recompiling the executable with all required modules installed in order to function.  
The currently installed node_modules can be found in **package.json**

**bot.js** and **utils.js** are included by default.

**If using the  *`ffmpeg-static`* package then you will have to include the *`node_modules`* directory in the bot folder and use `nexe main.js` without the "-r" option.**


## Source Code 

As of v1.4, most of the files are modular or dynamically obtained at runtime. 

`configs.json` and all files within directories prefixed with an underscore are modular in that they can be modified and the next time the bot is launched it will reflect those changes.  

This allows a host to add more functionality to the bot (even if using the executable method of launching)

#### main.js
The launcher file, imports bot.js and runs it.

#### bot.js
The main logic file,  imports all necessary files on startup and handles the underlying logic.

#### utils.js
Contains the main utility functions and data used by most other functions (dont modify this if adding more commands, see `_utils`).

#### configs.json 
Contains the main configs for the bot (do not modify this if adding additional configs, see `_configs`).

### _assets
Contains additional assets.

#### _commands
Contains all command files which contain command logic.

#### _configs 
Contains all the additional config files.

### _db
Contains database files (will be created when needed if doesn't exist)

#### _private
Contains all private and sensitive files that are meant to be confidential, including the bot authentication token.

#### _reactables 
Contains all files pertaining to basic react & reply logic.

#### _startup
Contains all files that are intended to run a function at startup.

#### _shutdown
Doesn't exist!  Instead there is an object `globals["_shutdown"]` which is intended to contain functions that take `globals` as an argument and will run those functions on shutdown.  This is an object with keys being the source command and the value being an array of functions to run on shutdown.  Just push functions with any shutdown logic into that array.

#### _utils
Contains all utility files, ones which contain common code and such.  This is different from the utils.json in the base directory in that the latter is intended for the most basic uses where files within this directory are intended for more customized use.

#### logs
If it doesn't exist then it will be created assuming logging is enabled in the configs.  Files within contain logging information.





## Notes and Misc

- I don't really wanna use branches for a small project, so I am just naively packing past versions into their own folders in the **VERSIONS** directory, mostly for looking back at what changed.  
- Only the **src** directory stuff is required to run the bot.
- The repo is messy cuz i kept trying different things, and will likely continue to
