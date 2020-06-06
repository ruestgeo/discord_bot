# Discord bot

using
node version 12.16.2
discord.js version 12.1.1

To set up the bot a auth.json  and configs.json must be made, examples have been provided.

If using the google sheets functions then additional setup is required and a googleClientSecret.json must be obtained.
You can see https://www.youtube.com/watch?v=UGN6EUi4Yio  for some instructions on the process if needed.
Once obtained, set the following in the configs.json ::   "googleEnabled": true

--NOTE: auth.json and googleClientSecret.json  have sensitive data and are confidential, do not share them with anyone.  It may also be of interest to not share configs.json  although the data is less sensitive


You can launch the bot using the command "node bot.js" when in the discord_bot main directory.
Alternatively you can use a compiler such as Nexe (https://github.com/nexe/nexe) to compile it all into an executable (.exe) for ease of use.



I don't really wanna use branches for a small project, so I am just naively packing past versions into their own folder, mostly for looking back at what changed.
