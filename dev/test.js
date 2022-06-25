const fs = require('fs'); 
const path = require('path');

console.log(__dirname);
console.log(path.relative('', __dirname));

console.log(path.resolve(__dirname, "../configs.json"))
console.log(path.relative('', path.resolve(__dirname, "../configs.json")))

let x = "./_private";
console.log(x);
console.log(path.relative(__dirname, path.resolve(__dirname, x)))
console.log(path.relative(__dirname, x))